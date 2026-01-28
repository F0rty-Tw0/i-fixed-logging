export enum TokenType {
  SELECT = 'SELECT',
  FROM = 'FROM',
  WHERE = 'WHERE',
  GROUP = 'GROUP',
  ORDER = 'ORDER',
  BY = 'BY',
  ASC = 'ASC',
  DESC = 'DESC',
  LIMIT = 'LIMIT',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  IN = 'IN',
  LIKE = 'LIKE',
  STAR = 'STAR',
  COMMA = 'COMMA',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  EQ = 'EQ',
  NEQ = 'NEQ',
  GT = 'GT',
  LT = 'LT',
  GTE = 'GTE',
  LTE = 'LTE',
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  AGGREGATE = 'AGGREGATE', // COUNT, SUM, AVG
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export type ASTNode =
  | {
      type: 'Query';
      select: SelectNode;
      where?: ExpressionNode;
      groupBy?: string[];
      orderBy?: OrderByNode;
      limit?: number;
    }
  | { type: 'Select'; columns: (ColumnNode | AggregateNode)[]; isStar: boolean }
  | { type: 'Column'; name: string }
  | { type: 'Aggregate'; function: 'COUNT' | 'SUM' | 'AVG'; column: string }
  | {
      type: 'BinaryExpression';
      left: ExpressionNode;
      operator: string;
      right: ExpressionNode;
    }
  | { type: 'UnaryExpression'; operator: 'NOT'; e: ExpressionNode }
  | { type: 'InExpression'; left: ExpressionNode; values: ExpressionNode[] }
  | {
      type: 'Literal';
      value: unknown;
      valueType: 'string' | 'number' | 'boolean' | 'null';
    }
  | { type: 'Identifier'; name: string }
  | { type: 'OrderBy'; column: string; direction: 'ASC' | 'DESC' };

export type ExpressionNode =
  | {
      type: 'BinaryExpression';
      left: ExpressionNode;
      operator: string;
      right: ExpressionNode;
    }
  | { type: 'UnaryExpression'; operator: 'NOT'; e: ExpressionNode }
  | { type: 'InExpression'; left: ExpressionNode; values: ExpressionNode[] }
  | {
      type: 'Literal';
      value: unknown;
      valueType: 'string' | 'number' | 'boolean' | 'null';
    }
  | { type: 'Identifier'; name: string };

export type SelectNode = {
  type: 'Select';
  columns: (ColumnNode | AggregateNode)[];
  isStar: boolean;
};
export type ColumnNode = { type: 'Column'; name: string };
export type AggregateNode = {
  type: 'Aggregate';
  function: 'COUNT' | 'SUM' | 'AVG';
  column: string;
};
export type OrderByNode = {
  type: 'OrderBy';
  column: string;
  direction: 'ASC' | 'DESC';
};
