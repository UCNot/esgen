import { EsBundle } from '../emission/es-bundle.js';

/**
 * Collection of bundle declarations.
 */
export class EsDeclarations {

  readonly #bundle: EsBundle;

  constructor(bundle: EsBundle) {
    this.#bundle = bundle;
  }

  get bundle(): EsBundle {
    return this.#bundle;
  }

}
