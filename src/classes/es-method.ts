import { EsSource } from '../es-source.js';
import { esline } from '../esline.tag.js';
import { EsSignature } from '../functions/es-signature.js';
import { EsClass } from './es-class.js';
import { EsMember, EsMemberInit, EsMemberRef } from './es-member.js';

/**
 * Class method representation.
 *
 * @typeParam TArgs - Type of method arguments definition.
 */
export class EsMethod<out TArgs extends EsSignature.Args> extends EsMember<EsMethodHandle<TArgs>> {

  readonly #signature: EsSignature<TArgs>;

  /**
   * Constructs class method.
   *
   * @param requestedName - Requested method name.
   * @param init - Method initialization options.
   */
  constructor(requestedName: string, init: EsMethodInit<TArgs>) {
    super(requestedName, init);

    this.#signature = EsSignature.for(init.args);
  }

  /**
   * Method signature.
   */
  get signature(): EsSignature<TArgs> {
    return this.#signature;
  }

  /**
   * Per-argument symbols available by their names.
   *
   * Shorthand for `this.signature.args`.
   */
  get args(): EsSignature.Symbols<TArgs> {
    return this.signature.args;
  }

  /**
   * Declares this method in the given class.
   *
   * @param hostClass - Host class to declare method in.
   * @param declaration - Method declaration details.
   *
   * @returns Declared method handle.
   */
  declareIn(hostClass: EsClass, declaration: EsMethodDeclaration<TArgs>): EsMethodHandle<TArgs>;

  declareIn(hostClass: EsClass, { args, body }: EsMethodDeclaration<TArgs>): EsMethodHandle<TArgs> {
    const handle: EsMethodHandle<TArgs> = {
      method: this,
      call: (target, args: EsSignature.ValuesOf<TArgs>) => esline`${target}${ref.accessor}${this.signature.call(args)}`,
    };
    const ref = hostClass.addMember(this, handle, code => {
      code.scope(code => {
        code
          .inline(ref.key, this.signature.declare(args), ' {')
          .indent(body(ref, hostClass))
          .write('}');
      });
    });

    return handle;
  }

}

/**
 * Class {@link EsMethod method} initialization options.
 *
 * @typeParam TArgs - Type of method arguments definition.
 */
export interface EsMethodInit<out TArgs extends EsSignature.Args> extends EsMemberInit {
  /**
   * Either method signature or arguments definition.
   */
  readonly args: EsSignature<TArgs> | TArgs;
}

/**
 * Class method {@link EsMethod#declareIn declaration} details.
 *
 * @typeParam TArgs - Type of method arguments definition.
 */
export interface EsMethodDeclaration<out TArgs extends EsSignature.Args> {
  /**
   * Method argument declarations.
   */
  readonly args?: EsSignature.Declarations<TArgs> | undefined;

  /**
   * Emits method body.
   *
   * @param member - Declared member reference.
   * @param hostClass - Class to declare the method for.
   *
   * @returns Source of code containing method body declaration.
   */
  body(
    this: void,
    member: EsMemberRef<EsMethod<TArgs>, EsMethodHandle<TArgs>>,
    hostClass: EsClass,
  ): EsSource;
}

/**
 * Class {@link EsMethod method} handle used to call the method.
 *
 * @typeParam TArgs - Type of method arguments definition.
 */
export interface EsMethodHandle<out TArgs extends EsSignature.Args> {
  /**
   * Target method.
   */
  readonly method: EsMethod<TArgs>;

  /**
   * Class the method.
   *
   * @param target - Host class instance expression.
   * @param args - Named argument values.
   *
   * @returns Source of code containing method call.
   */
  call(
    target: EsSource,
    ...args: EsSignature.RequiredKeyOf<TArgs> extends never
      ? [EsSignature.ValuesOf<TArgs>?]
      : [EsSignature.ValuesOf<TArgs>]
  ): EsSource;
}
