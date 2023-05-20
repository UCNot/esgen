import { EsSnippet } from './es-snippet.js';

/**
 * Tagged template emitting a {@link EsCode#line line of code}.
 *
 * @param strings - Template strings.
 * @param snippets - Substituted code snippets.
 *
 * @returns Line of code.
 */
export function esline(strings: TemplateStringsArray, ...snippets: EsSnippet[]): EsSnippet {
  const src = new Array<EsSnippet>(strings.length + snippets.length);

  for (let i = 0; i < snippets.length; ++i) {
    const srcIdx = i << 1;

    src[srcIdx] = strings[i];
    src[srcIdx + 1] = snippets[i];
  }

  src[src.length - 1] = strings[strings.length - 1];

  return code => {
    code.line(...src);
  };
}
