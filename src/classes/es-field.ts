import { EsSource } from '../es-source.js';
import { esline } from '../esline.tag.js';
import { EsMember, EsMemberContext, EsMemberInit, EsMemberVisibility } from './es-member.js';

/**
 * Class field representation.
 */
export class EsField implements EsMember<[EsFieldDeclaration?]> {

  readonly #requestedName: string;
  readonly #visibility: EsMemberVisibility;

  /**
   * Constructs class field.
   *
   * @param requestedName - Requested field name.
   * @param init - Field initialization options.
   */
  constructor(requestedName: string, init?: EsMemberInit);
  constructor(
    requestedName: string,
    { visibility = EsMemberVisibility.Public }: EsMemberInit = {},
  ) {
    this.#requestedName = requestedName;
    this.#visibility = visibility;
  }

  get requestedName(): string {
    return this.#requestedName;
  }

  get visibility(): EsMemberVisibility {
    return this.#visibility;
  }

  declare(context: EsMemberContext<this>, declaration?: EsFieldDeclaration): EsSource;
  declare(context: EsMemberContext<this>, { initializer }: EsFieldDeclaration = {}): EsSource {
    const { key } = context;

    return initializer ? esline`${key} = ${initializer(context)};` : esline`${key};`;
  }

}

/**
 * Class {@link EsField field} declaration details.
 */
export interface EsFieldDeclaration {
  /**
   * Field value initializer.
   */
  readonly initializer?: ((this: void, context: EsMemberContext<EsField>) => EsSource) | undefined;
}
