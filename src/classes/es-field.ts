import { EsSource } from '../es-source.js';
import { esline } from '../esline.tag.js';
import { EsMember, EsMemberContext, EsMemberInit, EsMemberVisibility } from './es-member.js';

/**
 * Class field representation.
 */
export class EsField implements EsMember<[EsFieldDeclaration?], EsFieldHandle> {

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

  declare(
    context: EsMemberContext<this>,
    declaration?: EsFieldDeclaration,
  ): [EsSource, EsFieldHandle];
  declare(
    context: EsMemberContext<this>,
    { initializer }: EsFieldDeclaration = {},
  ): [EsSource, EsFieldHandle] {
    const { key, accessor } = context;

    return [
      initializer ? esline`${key} = ${initializer(context)};` : esline`${key};`,
      {
        get: target => esline`${target}${accessor}`,
        set: (target, value) => esline`${target}${accessor} = ${value}`,
      },
    ];
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

/**
 * {@link EsField field} handle.
 *
 * Grants access to the field stored in class instance.
 */
export interface EsFieldHandle {
  /**
   * Read field value.
   *
   * @param target - Class instance expression.
   *
   * @returns Value read expression.
   */
  get(this: void, target: EsSource): EsSource;

  /**
   * Assigns field value.
   *
   * @param target - Class instance expression.
   * @param value - Assigned value expression.
   *
   * @returns Value assignment expression.
   */
  set(this: void, target: EsSource, value: EsSource): EsSource;
}
