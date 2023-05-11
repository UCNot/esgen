import { collectLines } from './impl/collect-lines.js';

export class EsOutput implements EsPrinter {

  #indent = '';
  #nl = '\n';
  readonly #records: EsPrintRecord[] = [];

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

  inline(print: (out: EsOutput) => void): this {
    const inline = new EsOutput();

    inline.#nl = '';
    print(inline);
    this.print(inline);

    return this;
  }

  indent(print: (out: EsOutput) => void, indent = '  '): this {
    const indented = new EsOutput();

    indented.#indent = indent;
    print(indented);
    this.print(indented);

    return this;
  }

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
      // Insert into block.
      const lastLine = lines[lines.length - 1];

      if (!lastLine.endsWith('\n')) {
        // Add newline.
        lines[lines.length - 1] += this.#nl;
      }
    } else {
      // Insert into inline.
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

  async asLines(): Promise<string[]> {
    return await collectLines(this.lines());
  }

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
   * Prints code to the `output`.
   *
   * @param out - Target code output.
   *
   * @returns Either none if code printed synchronously, or promise-like instance resolved when code printed
   * asynchronously.
   */
  printTo(out: EsOutput): void | PromiseLike<void>;
}

type EsPrintRecord = string[] | Promise<string[]>;
