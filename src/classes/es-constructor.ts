import { EsSnippet } from '../es-snippet.js';
import { esline } from '../esline.tag.js';
import { EsSignature } from '../functions/es-signature.js';
import { EsClass, EsClassHandle } from './es-class.js';
import { EsMember, EsMemberInit, EsMemberRef, EsMemberVisibility } from './es-member.js';

/**
 * Constructor of {@link EsClass class}.
 *
 * @typeParam TArgs - Type of class constructor arguments definition.
 */
export class EsConstructor<out TArgs extends EsSignature.Args = EsSignature.Args> extends EsMember<
  EsClassHandle<TArgs>
> {

  /**
   * Creates no-args constructor for the given initialization options.
   *
   * @param value - Either constructor instance, or its initialization options.
   *
   * @returns Constructor itself if the `value` is a constructor instance already, or new constructor instance.
   */
  static for(
    value?: EsConstructor<EsSignature.NoArgs> | EsConstructorInit<EsSignature.NoArgs>,
  ): EsConstructor<EsSignature.NoArgs>;

  /**
   * Creates constructor for the given initialization options.
   *
   * @typeParam TArgs - Type of class constructor arguments definition.
   * @param value - Either constructor instance, or its initialization options.
   *
   * @returns Constructor itself if the `value` is a constructor instance already, or new constructor instance.
   */
  static for<TArgs extends EsSignature.Args>(
    value: EsConstructor<TArgs> | EsConstructorInit<TArgs>,
  ): EsConstructor<TArgs>;

  static for<TArgs extends EsSignature.Args>(
    value: EsConstructor<TArgs> | EsConstructorInit<TArgs> = {
      args: {},
    } as EsConstructorInit<TArgs>,
  ): EsConstructor<TArgs> {
    return value instanceof EsConstructor ? value : new EsConstructor(value);
  }

  readonly #signature: EsSignature<TArgs>;

  /**
   * Constructs class constructor.
   *
   * @param init - Constructor initialization options.
   */
  constructor(init: EsConstructorInit<TArgs>) {
    super('constructor', { ...init, visibility: EsMemberVisibility.Public });

    const { args } = init;

    this.#signature = EsSignature.for(args);
  }

  /**
   * Constructor signature.
   */
  get signature(): EsSignature {
    return this.#signature;
  }

  /**
   * Per-argument symbols available by their {@link EsArg.NameOf names}.
   *
   * The same as `this.signature.args`;
   */
  get args(): EsSignature.Symbols<TArgs> {
    return this.signature.args;
  }

  /**
   * Declares constructor automatically if it has no arguments, or throws otherwise.
   *
   * @param hostClass - Host class to declare constructor for.
   * @param ref - Incomplete member reference.
   *
   * @returns Class handler.
   *
   * @throws [ReferenceError] if constructor requires arguments.
   *
   * [TypeError]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
   */
  override autoDeclare(
    hostClass: EsClass<TArgs>,
    ref: Omit<EsMemberRef<this, EsClassHandle<TArgs>>, 'getHandle'>,
  ): EsClassHandle<TArgs> {
    const { baseClass } = hostClass;

    if (baseClass) {
      return this.inherit(hostClass, baseClass.findMember(baseClass.classConstructor)!, baseClass);
    }
    if (!Object.keys(this.args).length) {
      return {
        hostClass,
        instantiate: (args: EsSignature.ValuesOf<TArgs>) => this.#instantiate(hostClass, args),
      };
    }

    return super.autoDeclare(hostClass, ref);
  }

  /**
   * Inherits constructor from the base class.
   *
   * Ensures constructor signatures are compatible.
   *
   * @param hostClass - Host class to inherit member for.
   * @param ref - Inherited constructor reference.
   * @param baseClass - Base class the member inherited from.
   *
   * @returns Inherited class handle.
   *
   * @throws [TypeError] if constructor signature is not compatible with the one of the base class.
   *
   * [TypeError]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
   */
  override inherit(
    hostClass: EsClass<TArgs>,
    ref: EsMemberRef<EsConstructor, EsClassHandle>,
    baseClass: EsClass<EsSignature.Args>,
  ): EsClassHandle<TArgs>;

  override inherit(
    hostClass: EsClass<TArgs>,
    _ref: EsMemberRef<EsConstructor, EsClassHandle>,
    baseClass: EsClass<EsSignature.Args>,
  ): EsClassHandle<TArgs> {
    const { classConstructor: baseConstructor } = baseClass;

    if (!baseConstructor.signature.acceptsArgsFor(this.signature)) {
      throw new TypeError(
        `${this} of ${hostClass} can not accept arguments from base ${baseConstructor} of ${baseClass}`,
      );
    }

    return {
      hostClass,
      instantiate: (args: EsSignature.ValuesOf<TArgs>) => this.#instantiate(hostClass, args),
    };
  }

  /**
   * Declares constructor in the given class.
   *
   * Typically called by {@link EsClass#declareConstructor}.
   *
   * @param hostClass - Host class to declare member in.
   * @param declaration - Constructor declaration details.
   *
   * @returns Declared class handle.
   */
  declareIn(
    hostClass: EsClass<TArgs>,
    declaration: EsConstructorDeclaration<TArgs>,
  ): EsClassHandle<TArgs>;

  declareIn(
    hostClass: EsClass<TArgs>,
    { args, body }: EsConstructorDeclaration<TArgs>,
  ): EsClassHandle<TArgs> {
    const { signature } = this;
    const handle: EsClassHandle<TArgs> = {
      hostClass,
      instantiate: (args: EsSignature.ValuesOf<TArgs>) => this.#instantiate(hostClass, args),
    };
    const ref = hostClass.addMember(this, handle, code => {
      code.scope(code => {
        code
          .line('constructor', signature.declare(args), ' {')
          .indent(body(ref, hostClass))
          .write('}');
      });
    });

    return handle;
  }

  #instantiate(hostClass: EsClass<TArgs>, args: EsSignature.ValuesOf<TArgs>): EsSnippet {
    return esline`new ${hostClass}${this.signature.call(args)}`;
  }

  toString(): string {
    return `constructor${this.signature}`;
  }

}

/**
 * Class {@link EsConstructor constructor} initialization options.
 *
 * @typeParam TArgs - Type of class constructor arguments definition.
 */
export interface EsConstructorInit<out TArgs extends EsSignature.Args>
  extends Omit<EsMemberInit, 'visibility'> {
  /**
   * Either constructor signature or parameters definition.
   */
  readonly args: EsSignature<TArgs> | TArgs;
}

/**
 * Class constructor {@link EsConstructor#declareIn declaration} details.
 *
 * @typeParam TArgs - Type of class constructor arguments definition.
 */
export interface EsConstructorDeclaration<out TArgs extends EsSignature.Args> {
  /**
   * Constructor argument declarations.
   */
  readonly args?: EsSignature.Declarations<TArgs> | undefined;

  /**
   * Emits constructor body.
   *
   * @param member - Declared constructor reference.
   * @param hostClass - Class to declare constructor for.
   *
   * @returns Code snippet containing constructor body.
   */
  body(
    this: void,
    member: EsMemberRef<EsConstructor<TArgs>, EsClassHandle<TArgs>>,
    hostClass: EsClass,
  ): EsSnippet;
}
