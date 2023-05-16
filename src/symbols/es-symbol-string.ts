/**
 * Builds a string representation of the symbol with the given `name`.
 *
 * @param name - Symbol name.
 * @param tag - Symbol tag to include. Defaults to none.
 * @param comment - Symbol comment.
 *
 * @returns - String representation of this symbol.
 */
export function esSymbolString(
  name: string,
  {
    tag,
    comment,
  }: {
    readonly tag?: string | null | undefined;
    readonly comment?: string | null | undefined;
  } = {},
): string {
  let out = name;

  if (tag || comment) {
    out += ` /*`;
    if (tag) {
      out += ` ${tag}`;
    }
    if (comment) {
      out += ` ${comment}`;
    }
    out += ' */';
  }

  return out;
}
