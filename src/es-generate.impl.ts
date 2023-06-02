import { mayHaveProperties } from '@proc7ts/primitives';
import { EsCode } from './code/es-code.js';
import { EsOutput, EsPrinter } from './code/es-output.js';
import { EsSnippet } from './code/es-snippet.js';
import { EsGenerationOptions } from './es-generate.js';
import { EsBundleFormat } from './scopes/es-bundle-format.js';
import { EsBundle } from './scopes/es-bundle.js';

export async function generateEsCode(
  defaults: EsGenerationOptions | undefined,
  snippetOrOptions?: EsGenerationOptions | EsSnippet,
  ...restSnippets: EsSnippet[]
): Promise<string> {
  let snippets: EsSnippet[];
  let options: EsGenerationOptions | undefined;

  if (isEsSnippet(snippetOrOptions)) {
    options = defaults;
    snippets = [snippetOrOptions, ...restSnippets];
  } else {
    options = { ...defaults, ...snippetOrOptions };
    snippets = restSnippets;
  }

  const bundle = new EsBundle(options);
  const { printer } = bundle.span(
    new EsCode().write(
      bundle.imports,
      bundle.declarations.body,
      ...snippets,
      bundle.declarations.exports,
    ),
  );

  bundle.done();

  return await new EsOutput().print(printEsBundle(bundle, printer)).asText();
}

function printEsBundle(bundle: EsBundle, body: EsPrinter): EsPrinter {
  return {
    printTo: async out => {
      await bundle.whenDone();

      switch (bundle.format) {
        case EsBundleFormat.IIFE:
          out.print(printIIFE(body));

          break;
        case EsBundleFormat.ES2015:
          out.print(body);
      }
    },
  };
}

function printIIFE(content: EsPrinter): EsPrinter {
  return {
    printTo: out => {
      out.line(out => {
        out
          .print(`(async () => {`)
          .indent(out => out.print(content, ''))
          .print(`})()`);
      });
    },
  };
}

function isEsSnippet(value: EsGenerationOptions | EsSnippet | undefined): value is EsSnippet {
  return (
    typeof value === 'string'
    || typeof value === 'function'
    || (mayHaveProperties(value) && ('emit' in value || 'printTo' in value))
  );
}
