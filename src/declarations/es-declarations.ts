import { lazyValue } from '@proc7ts/primitives';
import { EsCode } from '../es-code.js';
import { EsOutput, EsPrinter } from '../es-output.js';
import { EsSource } from '../es-source.js';
import { EsBundleFormat } from '../scopes/es-bundle-format.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsAnySymbol, EsNaming, EsReference, EsSymbol } from '../symbols/es-symbol.js';
import { EsDeclaredSymbol } from './es-declared.symbol.js';

/**
 * Collection of bundle declarations.
 */
export class EsDeclarations {

  readonly #bundle: EsBundle;
  readonly #snippets = new Map<EsAnySymbol, EsDeclSnippet>();
  readonly #content = lazyValue(() => this.#build());
  #addDecl: (symbol: EsDeclaredSymbol, snippet: EsDeclSnippet) => void;

  constructor(bundle: EsBundle) {
    this.#bundle = bundle;
    this.#addDecl = this.#doAddDecl;
  }

  #doAddDecl(symbol: EsDeclaredSymbol, snippet: EsDeclSnippet): void {
    this.#snippets.set(symbol, snippet);
  }

  get bundle(): EsBundle {
    return this.#bundle;
  }

  get body(): EsSource {
    return this.#content().body;
  }

  get exports(): EsSource {
    return this.#content().exports;
  }

  /**
   * Add symbol declaration.
   *
   * Called when {@link EsNamespace#nameSymbol naming} the symbol.
   *
   * @param symbol - Declared symbol.
   * @param naming - Symbol naming.
   *
   * @returns
   */
  addDeclaration(symbol: EsDeclaredSymbol, naming: EsNaming): EsNaming {
    const newSnippet = new EsDeclSnippet(symbol, naming);

    this.#addDecl(symbol, newSnippet);

    return naming;
  }

  #build(): EsDeclarations$Content {
    const emit = lazyValue(async () => await this.#emit());

    return {
      body: {
        emit: async () => {
          const { body } = await emit();

          return body;
        },
      },
      exports: {
        emit: async () => {
          const { exports } = await emit();

          return exports;
        },
      },
    };
  }

  async #emit(): Promise<{
    readonly body: EsPrinter;
    readonly exports: EsPrinter;
  }> {
    const decls = this.#emitAll();
    const records = new Map<EsDeclSnippet, EsEmittedDecl>();

    this.#addDecl = (key, snippet) => {
      this.#doAddDecl(key, snippet);
      records.set(snippet, this.#emitSnippet(snippet, decls));
    };

    for (const [snippet, record] of await Promise.all(decls)) {
      records.set(snippet, record);
    }

    const body = new EsOutput();
    const exports: string[] = [];
    const print = lazyValue(() => {
      // Print at most once.
      this.#addDecl = () => {
        throw new TypeError('Declarations already printed');
      };

      this.#printAll(body, exports, records);
    });

    return {
      body: {
        printTo: out => {
          print();
          out.print(body);
        },
      },
      exports: {
        printTo: out => {
          print();
          out.print(this.#printExports(exports));
        },
      },
    };
  }

  #printExports(exports: string[]): EsPrinter {
    return {
      printTo: out => {
        if (exports.length) {
          switch (this.bundle.format) {
            case EsBundleFormat.IIFE:
              out
                .print('return {')
                .indent(span => {
                  span.print(...exports);
                })
                .print('};');

              break;
            case EsBundleFormat.ES2015:
              out
                .print(`export {`)
                .indent(span => span.print(...exports))
                .print('};');
          }
        }
      },
    };
  }

  #emitAll(): Map<EsDeclSnippet, EsEmittedDecl> {
    const decls = new Map<EsDeclSnippet, EsEmittedDecl>();

    for (const snippet of this.#snippets.values()) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.#emitSnippet(snippet, decls);
    }

    return decls;
  }

  #emitSnippet(snippet: EsDeclSnippet, decls: Map<EsDeclSnippet, EsEmittedDecl>): EsEmittedDecl {
    decls.set(snippet, { body: '/* Emitting... */' }); // Prevent recurrent duplicates.

    const decl = snippet.emit(this.bundle);

    decls.set(snippet, decl);

    return decl;
  }

  #printAll(body: EsOutput, exports: string[], decls: Map<EsDeclSnippet, EsEmittedDecl>): void {
    const printed = new Set<EsDeclSnippet>();

    for (const [snippet, record] of decls) {
      this.#printSnippet(snippet, record, decls, printed, body, exports);
    }
  }

  #printSnippet(
    snippet: EsDeclSnippet,
    record: EsEmittedDecl,
    decls: Map<EsDeclSnippet, EsEmittedDecl>,
    printed: Set<EsDeclSnippet>,
    body: EsOutput,
    exports: string[],
  ): void {
    if (!printed.has(snippet)) {
      // Prevent infinite recursion.
      printed.add(snippet);

      // First, print all snipped dependencies.
      for (const ref of snippet.refs()) {
        const refSnippet = this.#snippets.get(ref);

        if (refSnippet) {
          this.#printSnippet(refSnippet, decls.get(refSnippet)!, decls, printed, body, exports);
        }
      }

      // Then, print the snippet itself.
      body.print(record.body);
      if (record.exports) {
        exports.push(...record.exports);
      }
    }
  }

}

interface EsDeclarations$Content {
  readonly body: EsSource;
  readonly exports: EsSource;
}

class EsDeclSnippet {

  readonly #symbol: EsDeclaredSymbol;
  readonly #naming: EsNaming;
  readonly #refs = new Set<EsAnySymbol>();

  constructor(symbol: EsDeclaredSymbol, naming: EsNaming) {
    this.#symbol = symbol;
    this.#naming = naming;
  }

  refs(): IterableIterator<EsSymbol> {
    return this.#refs.values();
  }

  emit(bundle: EsBundle): EsEmittedDecl {
    let exports: string[] | undefined;
    let prefix: string | undefined;

    if (this.#symbol.exported) {
      const { name } = this.#naming;
      const { requestedName } = this.#symbol;

      switch (bundle.format) {
        case EsBundleFormat.IIFE:
          exports = [name === requestedName ? `${name},` : `${requestedName}: ${name},`];

          break;
        case EsBundleFormat.ES2015:
          if (name === requestedName) {
            prefix = 'export ';
          } else {
            exports = [`${name} as ${requestedName},`];
          }
      }
    }

    return {
      body: new EsCode()
        .write(code => {
          const snippet = this.#symbol.declare({
            naming: this.#naming,
            refer: this.#refer.bind(this),
          });

          if (prefix) {
            code.line(prefix, code => {
              code.multiLine(snippet);
            });
          } else {
            code.write(snippet);
          }
        })
        .emit(bundle),
      exports,
    };
  }

  #refer({ symbol }: EsReference): void {
    this.#refs.add(symbol);
  }

}

interface EsEmittedDecl {
  readonly body: EsPrinter | string;
  readonly exports?: string[] | undefined;
}
