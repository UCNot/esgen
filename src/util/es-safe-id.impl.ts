export function esEscapeUnsafeId(id: string): string {
  return id.replace(ES_UNSAFE_ID_REPLACEMENT_PATTERN, esReplaceUnsafeIdChars);
}

const ES_UNSAFE_ID_REPLACEMENT_PATTERN =
  // eslint-disable-next-line no-misleading-character-class
  /(?:^[^\p{Lu}\p{Ll}\p{Lt}\p{Lm}\p{Lo}\p{Nl}_$]|(?<!^)[^\p{Lu}\p{Ll}\p{Lt}\p{Lm}\p{Lo}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}\u{200c}\u{200d}_$])+/gu;

function esReplaceUnsafeIdChars(chars: string): string {
  let result = '_';

  for (const char of chars) {
    result += 'x' + char.codePointAt(0)!.toString(16).toUpperCase();
  }

  return result + '_';
}
