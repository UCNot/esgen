/**
 * Generated code {@link esEvaluate evaluation} error.
 */
export class EsEvaluationError extends Error {

  readonly #evaluatedCode: string;
  readonly #isSyntaxError: boolean;

  /**
   * Constructs evaluation error.
   *
   * @param message - Error message.
   * @param options - Error options.
   */
  constructor(message = 'Evaluation error', options: EsEvaluationErrorOptions) {
    super(message, options);
    this.name = 'EsEvaluationError';

    const { evaluatedCode, isSyntaxError = false } = options;

    this.#evaluatedCode = evaluatedCode;
    this.#isSyntaxError = isSyntaxError;
  }

  /**
   * Evaluated source code caused the error.
   */
  get evaluatedCode(): string {
    return this.#evaluatedCode;
  }

  /**
   * Whether the error caused by syntax error within {@link evaluatedCode evaluated code}.
   */
  get isSyntaxError(): boolean {
    return this.#isSyntaxError;
  }

}

/**
 * Generated code {@link EsEvaluationError evaluation error} options.
 */
export interface EsEvaluationErrorOptions extends ErrorOptions {
  /**
   * Evaluated source code caused the error.
   */
  readonly evaluatedCode: string;

  /**
   * Whether the error caused by syntax error within {@link evaluatedCode evaluated code}.
   *
   * @defaultValue `false`
   */
  readonly isSyntaxError?: boolean | undefined;
}
