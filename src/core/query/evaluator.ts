import { ExpressionNode, SelectNode } from './types';
import { LOG_COLUMNS } from '../types/domain';

export type RowData = Record<string, unknown> | ((field: string) => unknown);

export class Evaluator {
  /**
   * Evaluates a WHERE expression against a set of column values.
   */
  public static evaluateExpression(
    expr: ExpressionNode,
    row: RowData,
  ): unknown {
    switch (expr.type) {
      case 'Literal':
        return expr.value;
      case 'Identifier': {
        const val = typeof row === 'function' ? row(expr.name) : row[expr.name];
        return val !== undefined ? val : null;
      }
      case 'UnaryExpression':
        if (expr.operator === 'NOT') {
          return !this.evaluateExpression(expr.e, row);
        }
        return null;
      case 'BinaryExpression': {
        const left = this.evaluateExpression(expr.left, row);
        const right = this.evaluateExpression(expr.right, row);
        switch (expr.operator) {
          case '=':
            if (typeof left === 'string' && typeof right === 'string') {
              return left.toLowerCase() === right.toLowerCase();
            }
            return left === right;
          case '!=':
          case '<>':
            if (typeof left === 'string' && typeof right === 'string') {
              return left.toLowerCase() !== right.toLowerCase();
            }
            return left !== right;
          case '>':
            return (left as number) > (right as number);
          case '>=':
            return (left as number) >= (right as number);
          case '<':
            return (left as number) < (right as number);
          case '<=':
            return (left as number) <= (right as number);
          case 'AND':
            return !!(left && right);
          case 'OR':
            return !!(left || right);
          case 'LIKE': {
            if (typeof left !== 'string' || typeof right !== 'string')
              return false;
            // Simple LIKE: % for anything, _ for single char.
            // Convert to Regex.
            const pattern = (right as string)
              .replace(/%/g, '.*')
              .replace(/_/g, '.');
            const regex = new RegExp(`^${pattern}$`, 'i');
            return regex.test(left as string);
          }
          default:
            return null;
        }
      }
      case 'InExpression': {
        const left = this.evaluateExpression(expr.left, row);
        const values = expr.values.map((v) => this.evaluateExpression(v, row));
        if (typeof left === 'string') {
          const lowerLeft = left.toLowerCase();
          return (values as unknown[]).some((v) =>
            typeof v === 'string' ? v.toLowerCase() === lowerLeft : v === left,
          );
        }
        return (values as unknown[]).includes(left);
      }
      default:
        return null;
    }
  }

  /**
   * Projects a row based on SELECT columns.
   */
  public static projectRow(
    select: SelectNode,
    row: RowData,
  ): Record<string, unknown> {
    if (select.isStar) {
      if (typeof row === 'function') {
        const result: Record<string, unknown> = {};
        for (const col of LOG_COLUMNS) {
          result[col] = row(col);
        }
        return result;
      }
      return row;
    }

    const result: Record<string, unknown> = {};
    for (const col of select.columns) {
      if (col.type === 'Column') {
        const val = typeof row === 'function' ? row(col.name) : row[col.name];
        result[col.name] = val !== undefined ? val : null;
      }
    }
    return result;
  }
}
