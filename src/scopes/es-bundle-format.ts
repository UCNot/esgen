/**
 * Format of the bundled code.
 */
export enum EsBundleFormat {
  /**
   * ECMAScript [module].
   *
   * [module]: https://developer.mozilla.org/docs/Web/JavaScript/Guide/Modules
   */
  ES2015 = 'ES2015',

  /**
   * Immediately Invoked Function Expression ([IIFE]).
   *
   * Utilizes [dynamic imports].
   *
   * [IIFE]: https://developer.mozilla.org/docs/Glossary/IIFE
   * [dynamic imports]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Operators/import
   */
  IIFE = 'IIFE',

  /**
   * Default format.
   */
  Default = ES2015,
}
