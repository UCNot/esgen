export function safeJsId(id: string): string {
  if (JS_KEYWORDS.has(id)) {
    return `__${id}__`;
  }

  return id.replace(UNSAFE_JS_ID_REPLACEMENT_PATTERN, replaceUnsafeJsChars);
}

const JS_KEYWORDS = new Set([
  'instanceof',
  'typeof',
  'break',
  'do',
  'new',
  'var',
  'case',
  'else',
  'return',
  'void',
  'catch',
  'finally',
  'continue',
  'for',
  'switch',
  'while',
  'this',
  'with',
  'debugger',
  'function',
  'throw',
  'default',
  'if',
  'try',
  'delete',
  'in',
]);

const UNSAFE_JS_ID_REPLACEMENT_PATTERN =
  // eslint-disable-next-line no-misleading-character-class
  /(?:^[^\p{Lu}\p{Ll}\p{Lt}\p{Lm}\p{Lo}\p{Nl}_$]|(?<!^)[^\p{Lu}\p{Ll}\p{Lt}\p{Lm}\p{Lo}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}\u{200c}\u{200d}_$])+/gu;

function replaceUnsafeJsChars(chars: string): string {
  let result = '_';

  for (const char of chars) {
    result += 'x' + char.codePointAt(0)!.toString(16).toUpperCase();
  }

  return result + '_';
}
