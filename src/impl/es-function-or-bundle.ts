import { EsScope } from '../scopes/es-scope.js';
import { EsNamespace } from '../symbols/es-namespace.js';

export function esFunctionOrBundle(scope: EsScope): EsNamespace {
  return scope.functionOrBundle.ns;
}
