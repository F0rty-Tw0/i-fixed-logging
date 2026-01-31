import { WorkerLogStore } from './worker-store';
import { Lexer } from '../query/lexer';
import { Parser } from '../query/parser';
import { Evaluator, RowData } from '../query/evaluator';
import { LOG_COLUMNS } from '../constants';

export class QueryHandler {
  constructor(private workerStore: WorkerLogStore) {}

  public async handleQuery(
    queryId: string,
    sql: string,
    postMessage: (msg: { type: string; payload: unknown }) => void,
  ) {
    try {
      const lexer = new Lexer(sql);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      if (ast.type !== 'Query') {
        throw new Error('Invalid query AST');
      }

      const results: Record<string, unknown>[] = [];
      const total = this.workerStore.getLength();
      const hasAggregates = ast.select.columns.some(
        (c) => c.type === 'Aggregate',
      );

      interface AggregateStats {
        sum: number;
        count: number;
      }

      const groupMap = new Map<
        string,
        {
          stats: Record<string, AggregateStats>;
          values: Record<string, unknown>;
        }
      >();

      let currentRowIdx = 0;
      const rowAccessor: RowData = (field: string) =>
        this.workerStore.getValue(currentRowIdx, field);

      for (let i = 0; i < total; i++) {
        currentRowIdx = i;

        if (i > 0 && i % 50000 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        let matches = false;
        if (!ast.where) {
          matches = true;
        } else {
          matches = Evaluator.evaluateExpression(
            ast.where,
            rowAccessor,
          ) as boolean;
        }

        if (matches) {
          if (hasAggregates) {
            const groupValues: Record<string, unknown> = {};
            let groupKey = 'global';
            if (ast.groupBy && ast.groupBy.length > 0) {
              groupKey = ast.groupBy
                .map((col) => {
                  const val = this.workerStore.getValue(i, col);
                  groupValues[col] = val;
                  return `${col}:${val}`;
                })
                .join('|');
            } else {
              for (const col of ast.select.columns) {
                if (col.type === 'Column') {
                  groupValues[col.name] = this.workerStore.getValue(
                    i,
                    col.name,
                  );
                }
              }
            }

            if (!groupMap.has(groupKey)) {
              groupMap.set(groupKey, { stats: {}, values: groupValues });
            }
            const group = groupMap.get(groupKey)!;

            for (const col of ast.select.columns) {
              if (col.type === 'Aggregate') {
                const key = `${col.function}(${col.column})`;
                if (!group.stats[key]) {
                  group.stats[key] = { sum: 0, count: 0 };
                }
                const rawVal =
                  col.column === '*'
                    ? 1
                    : this.workerStore.getValue(i, col.column);
                if (rawVal !== null && rawVal !== undefined) {
                  const val = typeof rawVal === 'number' ? rawVal : 1;
                  group.stats[key].sum += val;
                  group.stats[key].count++;
                }
              }
            }
          } else {
            results.push(Evaluator.projectRow(ast.select, rowAccessor));
          }
        }
      }

      let finalResults: Record<string, unknown>[] = results;
      if (hasAggregates) {
        finalResults = [];
        for (const group of groupMap.values()) {
          const resRow: Record<string, unknown> = { ...group.values };
          for (const col of ast.select.columns) {
            if (col.type === 'Aggregate') {
              const key = `${col.function}(${col.column})`;
              const stats = group.stats[key];
              if (!stats) {
                resRow[key] = col.function === 'COUNT' ? 0 : null;
              } else {
                if (col.function === 'COUNT') resRow[key] = stats.count;
                else if (col.function === 'SUM') resRow[key] = stats.sum;
                else if (col.function === 'AVG')
                  resRow[key] =
                    stats.count > 0 ? stats.sum / stats.count : null;
              }
            }
          }
          finalResults.push(resRow);
        }
      }

      if (ast.orderBy) {
        const { column, direction } = ast.orderBy;
        finalResults.sort((a, b) => {
          const valA = a[column];
          const valB = b[column];
          if (typeof valA === 'number' && typeof valB === 'number') {
            return direction === 'ASC' ? valA - valB : valB - valA;
          }
          const strA = String(valA);
          const strB = String(valB);
          if (strA < strB) return direction === 'ASC' ? -1 : 1;
          if (strA > strB) return direction === 'ASC' ? 1 : -1;
          return 0;
        });
      }

      if (ast.limit !== undefined) {
        finalResults = finalResults.slice(0, ast.limit);
      }

      postMessage({
        type: 'QUERY_RESULTS',
        payload: {
          queryId,
          results: finalResults,
          columns: ast.select.isStar
            ? [...LOG_COLUMNS]
            : ast.select.columns.map((c) =>
                c.type === 'Column' ? c.name : `${c.function}(${c.column})`,
              ),
        },
      });
    } catch (error: unknown) {
      postMessage({
        type: 'QUERY_ERROR',
        payload: {
          queryId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
