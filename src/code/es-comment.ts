import { EsOutput, EsPrinter } from './es-output.js';

/**
 * Code comment. Either multi-line or single-line.
 */
export class EsComment implements EsPrinter {

  /**
   * Empty comment. I.e. comment with {@link lineCount zero lines}.
   */
  static get empty(): EsComment {
    return EsComment$empty;
  }

  /**
   * Converts the given `input` into comment.
   *
   * Splits `input` onto lines.
   *
   * Converts empty `input` to {@link EsComment.empty empty} comment.
   *
   * Returns the `input` comment instance as is.
   *
   * @param input - Comment input.
   *
   * @returns Comment instance.
   */
  static from(input?: string | EsComment): EsComment {
    if (!input) {
      return this.empty;
    }
    if (typeof input === 'string') {
      return new EsComment(...input.split(EsComment$nlPattern).map(line => line.trimEnd()));
    }

    return input;
  }

  readonly #lines: readonly string[];

  /**
   * Constructs comment.
   *
   * @param lines - Lines of comment text.
   */
  constructor(...lines: string[]) {
    this.#lines = lines;
  }

  /**
   * Comment line count. When `0` the comment is considered {@link empty}.
   */
  get lineCount(): number {
    return this.#lines.length;
  }

  /**
   * Prints block comment to the given code output.
   *
   * Does nothing if comment is {@link EsComment.empty empty}.
   *
   * @param out - Code output.
   */
  printTo(out: EsOutput): void {
    if (!this.#lines.length) {
      return;
    }
    if (this.#lines.length === 1) {
      const [line] = this.#lines;

      out.print(line ? `/* ${line} */` : '/**/');
    } else {
      out.indent(out => {
        out.print('/*');
        out.indent(out => {
          out.print(...this.#lines);
        }, '   ');
        out.print('*/');
      }, '');
    }
  }

  /**
   * Appends comment to some code.
   *
   * @param commented - Code to comment.
   * @param prefix - Optional comment prefix
   *
   * @returns Commented code.
   */
  appendTo(commented: string, prefix?: string): string {
    return this.lineCount || prefix ? `${commented} ${this.toString(prefix)}` : commented;
  }

  /**
   * Builds a string representation of this comment.
   *
   * @param prefix - A prefix to place to comment text.
   *
   * @returns String containing block comment.
   */
  toString(prefix?: string): string {
    if (!this.#lines.length) {
      return prefix ? `/* ${prefix} */` : '/**/';
    }
    if (this.#lines.length === 1) {
      const text = esComment$prefixLine(this.#lines[0], prefix);

      return text ? `/* ${text} */` : '/**/';
    }

    return (
      (prefix ? `/* ${prefix}\n` : `/*\n`)
      + this.#lines.map(line => (line ? `   ${line}\n` : '\n')).join('')
      + '*/'
    );
  }

}

const EsComment$empty = /*#__PURE__*/ new EsComment();

const EsComment$nlPattern = /\r?\n|\r/;

function esComment$prefixLine(line: string, prefix = ''): string {
  if (!prefix) {
    return line;
  }
  if (!line) {
    return prefix;
  }

  return `${prefix} ${line}`;
}
