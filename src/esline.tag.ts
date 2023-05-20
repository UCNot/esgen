import { EsSource } from './es-source.js';

/**
 * Tagged template emitting a {@link EsCode#line line of code}.
 *
 * @param strings - Template strings.
 * @param sources - Substituted code sources.
 *
 * @returns Source of inline code.
 */
export function esline(strings: TemplateStringsArray, ...sources: EsSource[]): EsSource {
  const src = new Array<EsSource>(strings.length + sources.length);

  for (let i = 0; i < sources.length; ++i) {
    const srcIdx = i << 1;

    src[srcIdx] = strings[i];
    src[srcIdx + 1] = sources[i];
  }

  src[src.length - 1] = strings[strings.length - 1];

  return code => {
    code.line(...src);
  };
}
