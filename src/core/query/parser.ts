import {
  Token,
  TokenType,
  ASTNode,
  ExpressionNode,
  SelectNode,
  ColumnNode,
  AggregateNode,
  OrderByNode,
} from './types';

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): ASTNode {
    return this.parseQuery();
  }

  private parseQuery(): ASTNode {
    const select = this.parseSelect();

    // Optional FROM clause (ignored for now as we only have one log store)
    if (this.match(TokenType.FROM)) {
      this.consume(TokenType.IDENTIFIER, 'Expect identifier after FROM.');
    }

    let where: ExpressionNode | undefined;
    if (this.match(TokenType.WHERE)) {
      where = this.parseExpression();
    }

    let groupBy: string[] | undefined;
    if (this.match(TokenType.GROUP)) {
      this.consume(TokenType.BY, 'Expect BY after GROUP.');
      groupBy = [];
      do {
        groupBy.push(
          this.consume(TokenType.IDENTIFIER, 'Expect identifier for GROUP BY.')
            .value,
        );
      } while (this.match(TokenType.COMMA));
    }

    let orderBy: OrderByNode | undefined;
    if (this.match(TokenType.ORDER)) {
      this.consume(TokenType.BY, 'Expect BY after ORDER.');

      let column: string;
      if (this.check(TokenType.AGGREGATE)) {
        const func = this.advance().value;
        this.consume(TokenType.LPAREN, 'Expect ( after aggregate.');
        const col = this.match(TokenType.STAR)
          ? '*'
          : this.consume(
              TokenType.IDENTIFIER,
              'Expect identifier in aggregate.',
            ).value;
        this.consume(TokenType.RPAREN, 'Expect ) after aggregate argument.');
        column = `${func}(${col})`;
      } else {
        column = this.consume(
          TokenType.IDENTIFIER,
          'Expect identifier for ORDER BY.',
        ).value;
      }

      let direction: 'ASC' | 'DESC' = 'ASC';
      if (this.match(TokenType.ASC)) direction = 'ASC';
      if (this.match(TokenType.DESC)) direction = 'DESC';
      orderBy = { type: 'OrderBy', column, direction };
    }

    let limit: number | undefined;
    if (this.match(TokenType.LIMIT)) {
      limit = parseInt(
        this.consume(TokenType.NUMBER, 'Expect number after LIMIT.').value,
      );
    }

    return {
      type: 'Query',
      select,
      where,
      groupBy,
      orderBy,
      limit,
    };
  }

  private parseSelect(): SelectNode {
    this.consume(TokenType.SELECT, 'Expect SELECT.');

    if (this.match(TokenType.STAR)) {
      return { type: 'Select', columns: [], isStar: true };
    }

    const columns: (ColumnNode | AggregateNode)[] = [];
    do {
      if (this.check(TokenType.AGGREGATE)) {
        const func = this.advance().value as 'COUNT' | 'SUM' | 'AVG';
        this.consume(TokenType.LPAREN, 'Expect ( after aggregate function.');
        const col = this.match(TokenType.STAR)
          ? '*'
          : this.consume(
              TokenType.IDENTIFIER,
              'Expect identifier in aggregate.',
            ).value;
        this.consume(TokenType.RPAREN, 'Expect ) after aggregate argument.');
        columns.push({ type: 'Aggregate', function: func, column: col });
      } else {
        const name = this.consume(
          TokenType.IDENTIFIER,
          'Expect column name.',
        ).value;
        columns.push({ type: 'Column', name });
      }
    } while (this.match(TokenType.COMMA));

    return { type: 'Select', columns, isStar: false };
  }

  private parseExpression(): ExpressionNode {
    return this.parseOr();
  }

  private parseOr(): ExpressionNode {
    let expr = this.parseAnd();
    while (this.match(TokenType.OR)) {
      const right = this.parseAnd();
      expr = { type: 'BinaryExpression', left: expr, operator: 'OR', right };
    }
    return expr;
  }

  private parseAnd(): ExpressionNode {
    let expr = this.parseEquality();
    while (this.match(TokenType.AND)) {
      const right = this.parseEquality();
      expr = { type: 'BinaryExpression', left: expr, operator: 'AND', right };
    }
    return expr;
  }

  private parseEquality(): ExpressionNode {
    let expr = this.parseComparison();
    while (this.match(TokenType.EQ, TokenType.NEQ, TokenType.LIKE)) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      expr = { type: 'BinaryExpression', left: expr, operator, right };
    }
    return expr;
  }

  private parseComparison(): ExpressionNode {
    let expr = this.parsePrimary();
    while (
      this.match(
        TokenType.GT,
        TokenType.GTE,
        TokenType.LT,
        TokenType.LTE,
        TokenType.IN,
      )
    ) {
      const operator = this.previous().value;
      if (operator.toUpperCase() === 'IN') {
        this.consume(TokenType.LPAREN, 'Expect ( after IN.');
        const values: ExpressionNode[] = [];
        do {
          values.push(this.parsePrimary());
        } while (this.match(TokenType.COMMA));
        this.consume(TokenType.RPAREN, 'Expect ) after IN values.');
        expr = { type: 'InExpression', left: expr, values };
      } else {
        const right = this.parsePrimary();
        expr = { type: 'BinaryExpression', left: expr, operator, right };
      }
    }
    return expr;
  }

  private parsePrimary(): ExpressionNode {
    if (this.match(TokenType.NUMBER)) {
      return {
        type: 'Literal',
        value: parseFloat(this.previous().value),
        valueType: 'number',
      };
    }
    if (this.match(TokenType.STRING)) {
      return {
        type: 'Literal',
        value: this.previous().value,
        valueType: 'string',
      };
    }
    if (this.match(TokenType.IDENTIFIER)) {
      return { type: 'Identifier', name: this.previous().value };
    }
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN, 'Expect ) after expression.');
      return expr;
    }
    if (this.match(TokenType.NOT)) {
      const e = this.parsePrimary();
      return { type: 'UnaryExpression', operator: 'NOT', e };
    }

    throw new Error(
      `Unexpected token: ${this.peek().value} at line ${this.peek().line}`,
    );
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(
      message + ` (Found ${this.peek().type} at line ${this.peek().line})`,
    );
  }
}
