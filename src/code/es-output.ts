import { collectLines } from '../impl/collect-lines.js';

/**
 * Code output collects {@link print printed} code. The printed code can be {@link asText() serialized} then.
 */
export class EsOutput implements EsPrinter {
  #indent = '';
  #nl = '\n';
  readonly #records: EsPrintRecord[] = [];

  /**
   * Prints code records.
   *
   * Each record is placed on a new line, unless this is an {@link line} output.
   *
   * @param records - Written code records, either strings or {@link EsPrinter code printers}.
   *
   * @returns `this` instance.
   */
  print(...records: (string | EsPrinter)[]): this {
    if (records.length) {
      for (const record of records) {
        if (typeof record === 'string') {
          if (record) {
            this.#records.push([`${record}${this.#nl}`]);
          } else {
            this.#newLine();
          }
        } else {
          this.#records.push(this.#print(record));
        }
      }
    } else {
      this.#newLine();
    }

    return this;
  }

  #newLine(): void {
    if (this.#nl) {
      this.#records.push([this.#nl]);
    }
  }

  async #print(printer: EsPrinter): Promise<string[]> {
    const out = new EsOutput();

    out.#nl = this.#nl;
    await printer.printTo(out);

    return await out.asLines();
  }

  /**
   * Prints code records on single line.
   *
   * @param print - A function that receives an inline output to print the records to.
   *
   * @returns `this` instance.
   */
  line(print: (out: EsOutput) => void): this {
    const inline = new EsOutput();

    inline.#nl = '';
    print(inline);
    this.print(inline);

    return this;
  }

  /**
   * Prints indented code records.
   *
   * Always places each record on a new line, and prepends it with indentation symbols. Even for {@link line} output.
   *
   * @param print - A function that receives an indented output to print the records to.
   * @param indent - Indentation symbols. Two spaces by default.
   *
   * @returns `this` instance.
   */
  indent(print: (out: EsOutput) => void, indent = '  '): this {
    const indented = new EsOutput();

    indented.#indent = indent;
    print(indented);
    this.print(indented);

    return this;
  }

  /**
   * Prints collected code to another output.
   *
   * @param out - Target code output.
   */
  printTo(out: EsOutput): void {
    if (this.#records.length) {
      out.print({
        printTo: this.#printTo.bind(this),
      });
    }
  }

  async #printTo(out: EsOutput): Promise<void> {
    out.#appendLines(await this.asLines(), this);
  }

  #appendLines(lines: string[], from: EsOutput): void {
    if (!lines.length) {
      return;
    }

    const prefix = this.#indent + from.#indent;

    if (this.#nl) {
      // Insert into multi-line code.
      const lastLine = lines[lines.length - 1];

      if (!lastLine.endsWith('\n')) {
        // Add newline.
        lines[lines.length - 1] += this.#nl;
      }
    } else {
      // Insert into line.
      if (from.#indent) {
        // Insert newline before indented code.
        this.#records.push([from.#nl]);
      }

      const lastLine = lines[lines.length - 1];

      if (lastLine.endsWith('\n')) {
        // Remove last newline.
        lines[lines.length - 1] = lastLine.slice(0, -1);
      }
    }

    this.#records.push(
      lines.map(line => (line && line !== '\n' ? `${prefix}${line}` : line) /* Do not indent NL */),
    );
  }

  /**
   * Iterates over printed lines of code.
   *
   * @returns Asynchronous iterable iterator over all printed lines.
   */
  async *lines(): AsyncIterableIterator<string> {
    const records = await Promise.all(this.#records);
    let prevNL = false;
    let lastLine = '';

    for (const lines of records) {
      for (const line of lines) {
        if (line !== '\n') {
          prevNL = false;
          lastLine += line;
          if (line.endsWith('\n')) {
            yield lastLine;
            lastLine = '';
          }
        } else if (!prevNL) {
          if (lastLine) {
            yield lastLine;
            lastLine = '';
          }
          yield line;
          prevNL = true;
        }
      }
    }

    if (lastLine) {
      yield lastLine;
    }
  }

  /**
   * Represents this output as lines of code.
   *
   * @returns Promise resolved to array of lines.
   */
  async asLines(): Promise<string[]> {
    return await collectLines(this.lines());
  }

  /**
   * Represents this output as text.
   *
   * @returns Promise resolved to printed text.
   */
  async asText(): Promise<string> {
    const lines = await this.asLines();

    return lines.join('');
  }
}

/**
 * Code printer.
 */
export interface EsPrinter {
  /**
   * Prints code to the given output.
   *
   * @param out - Code output.
   *
   * @returns Either none if code printed synchronously, or promise-like instance resolved when code printed
   * asynchronously.
   */
  printTo(out: EsOutput): void | PromiseLike<void>;
}

type EsPrintRecord = string[] | Promise<string[]>;
