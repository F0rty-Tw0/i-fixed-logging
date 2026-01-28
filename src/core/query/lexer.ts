import { Token, TokenType } from './types';

export class Lexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      const char = this.peek();

      if (this.isWhitespace(char)) {
        this.advance();
        continue;
      }

      if (this.isDigit(char)) {
        tokens.push(this.readNumber());
        continue;
      }

      if (this.isAlpha(char)) {
        tokens.push(this.readIdentifierOrKeyword());
        continue;
      }

      if (char === "'") {
        tokens.push(this.readString());
        continue;
      }

      if (char === '*') {
        tokens.push(this.makeToken(TokenType.STAR, '*'));
        this.advance();
        continue;
      }

      if (char === ',') {
        tokens.push(this.makeToken(TokenType.COMMA, ','));
        this.advance();
        continue;
      }

      if (char === '(') {
        tokens.push(this.makeToken(TokenType.LPAREN, '('));
        this.advance();
        continue;
      }

      if (char === ')') {
        tokens.push(this.makeToken(TokenType.RPAREN, ')'));
        this.advance();
        continue;
      }

      if (char === '=') {
        tokens.push(this.makeToken(TokenType.EQ, '='));
        this.advance();
        continue;
      }

      if (char === '!' && this.peekNext() === '=') {
        tokens.push(this.makeToken(TokenType.NEQ, '!='));
        this.advance();
        this.advance();
        continue;
      }

      if (char === '>') {
        if (this.peekNext() === '=') {
          tokens.push(this.makeToken(TokenType.GTE, '>='));
          this.advance();
          this.advance();
        } else {
          tokens.push(this.makeToken(TokenType.GT, '>'));
          this.advance();
        }
        continue;
      }

      if (char === '<') {
        if (this.peekNext() === '=') {
          tokens.push(this.makeToken(TokenType.LTE, '<='));
          this.advance();
          this.advance();
        } else if (this.peekNext() === '>') {
          tokens.push(this.makeToken(TokenType.NEQ, '<>'));
          this.advance();
          this.advance();
        } else {
          tokens.push(this.makeToken(TokenType.LT, '<'));
          this.advance();
        }
        continue;
      }

      throw new Error(
        `Unexpected character: ${char} at line ${this.line}, col ${this.column}`,
      );
    }

    tokens.push(this.makeToken(TokenType.EOF, ''));
    return tokens;
  }

  private peek(): string {
    return this.input[this.pos] || '';
  }

  private peekNext(): string {
    return this.input[this.pos + 1] || '';
  }

  private advance(): string {
    const char = this.peek();
    this.pos++;
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  private makeToken(type: TokenType, value: string): Token {
    return { type, value, line: this.line, column: this.column };
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z_]/.test(char);
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9_]/.test(char);
  }

  private readNumber(): Token {
    let value = '';
    const startCol = this.column;
    while (this.isDigit(this.peek()) || this.peek() === '.') {
      value += this.advance();
    }
    return { type: TokenType.NUMBER, value, line: this.line, column: startCol };
  }

  private readString(): Token {
    this.advance(); // consume opening '
    let value = '';
    const startCol = this.column;
    while (this.peek() !== "'" && this.pos < this.input.length) {
      value += this.advance();
    }
    this.advance(); // consume closing '
    return { type: TokenType.STRING, value, line: this.line, column: startCol };
  }

  private readIdentifierOrKeyword(): Token {
    let value = '';
    const startCol = this.column;
    while (this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    const upperValue = value.toUpperCase();

    const keywords: Record<string, TokenType> = {
      SELECT: TokenType.SELECT,
      FROM: TokenType.FROM,
      WHERE: TokenType.WHERE,
      GROUP: TokenType.GROUP,
      ORDER: TokenType.ORDER,
      BY: TokenType.BY,
      ASC: TokenType.ASC,
      DESC: TokenType.DESC,
      LIMIT: TokenType.LIMIT,
      AND: TokenType.AND,
      OR: TokenType.OR,
      NOT: TokenType.NOT,
      IN: TokenType.IN,
      LIKE: TokenType.LIKE,
      COUNT: TokenType.AGGREGATE,
      SUM: TokenType.AGGREGATE,
      AVG: TokenType.AGGREGATE,
      STAR: TokenType.STAR,
    };

    if (keywords[upperValue]) {
      return {
        type: keywords[upperValue],
        value: upperValue,
        line: this.line,
        column: startCol,
      };
    }

    return {
      type: TokenType.IDENTIFIER,
      value,
      line: this.line,
      column: startCol,
    };
  }
}
