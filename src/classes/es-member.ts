import { esMemberAccessor } from '../util/es-member-accessor.js';
import { EsClass } from './es-class.js';
import { EsMemberVisibility } from './es-member-visibility.js';

/**
 * Member of {@link EsClass class}.
 *
 * Members uniquely identifies by this instances of this type.
 *
 * @typeParam THandle - Type of member handle.
 */
export abstract class EsMember<out THandle = void> {

  readonly #requestedName: string;
  readonly #visibility: EsMemberVisibility;

  constructor(requestedName: string, init?: EsMemberInit);
  constructor(requestedName: string, init?: EsMemberInit) {
    this.#requestedName = requestedName;
    this.#visibility = init?.visibility ?? EsMemberVisibility.Public;
  }

  /**
   * Requested member name.
   *
   * Note that the class may decide to rename it in order to resolve naming conflicts.
   */
  get requestedName(): string {
    return this.#requestedName;
  }

  /**
   * Visibility of this member.
   */
  get visibility(): EsMemberVisibility {
    return this.#visibility;
  }

  /**
   * Declares member automatically rather explicitly.
   *
   * Called by host class if this member is not declared in the base class.
   *
   * Automatic declaration would be disposed of once the member is declared explicitly.
   *
   * @param hostClass - Host class to declare member for.
   * @param ref - Incomplete member reference.
   *
   * @throws [ReferenceError] by default.
   *
   * [ReferenceError]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/ReferenceError
   */
  autoDeclare(hostClass: EsClass, ref: Omit<EsMemberRef<this, THandle>, 'getHandle'>): THandle {
    throw new ReferenceError(`${this.toString(ref)} is not declared in ${hostClass}`);
  }

  /**
   * Inherits this member from the base class.
   *
   * Called by host class to update inherited member handle.
   *
   * Returns the `handle` as is by default.
   *
   * @param hostClass - Host class to inherit member for.
   * @param ref - Inherited member reference.
   * @param baseClass - Base class the member inherited from.
   *
   * @returns Member handle updated for inherited member.
   */
  inherit(hostClass: EsClass, ref: EsMemberRef<this, THandle>, baseClass: EsClass): THandle;

  inherit(_hostClass: EsClass, ref: EsMemberRef<this, THandle>, _baseClass: EsClass): THandle {
    return ref.getHandle();
  }

  toString({
    accessor = esMemberAccessor(this.requestedName, this.visibility).accessor,
  }: {
    readonly accessor?: string | undefined;
  } = {}): string {
    return accessor;
  }

}

export interface EsMember<out THandle = void> {
  /**
   * Brand field to make type inference work.
   */
  __handle__?: THandle;
}

/**
 * Any class {@link EsAnyMember member}.
 *
 * @typeParam THandle - Member handle type.
 */
export type EsAnyMember = EsMember<any>;

export namespace EsMember {
  /**
   * Handle type extracted from member.
   *
   * @typeParam TMember - Member type.
   */
  export type HandleOf<TMember extends EsAnyMember> = TMember extends EsMember<infer THandle>
    ? THandle
    : never;
}

/**
 * Class {@link EsMember member} reference.
 *
 * Returned in response to {@link EsClass#findMember member search}.
 *
 * @typeParam TMember - Member type.
 */
export interface EsMemberRef<
  out TMember extends EsAnyMember = EsAnyMember,
  out THandle = EsMember.HandleOf<TMember>,
> {
  /**
   * Member instance.
   */
  readonly member: TMember;

  /**
   * Actual member name.
   *
   * {@link EsMemberVisibility.Private Private} member names always start with `#`.
   */
  readonly name: string;

  /**
   * Member key string.
   *
   * Either ECMAScript-safe member identifier, or indexed member accessor like `['0unsafe']` otherwise.
   */
  readonly key: string;

  /**
   * Member accessor expression.
   *
   * Either `.${name}` in case of ECMAScript-safe member name, or indexed member accessor like `['0unsafe']` otherwise.
   */
  readonly accessor: string;

  /**
   * Whether the member is declared in host class.
   *
   * `false` value means the member is declared in one of the {@link EsClass#baseClass base classes}, and not yet
   * overridden in host class.
   */
  readonly declared: boolean;

  /**
   * Obtains member handle.
   */
  getHandle(this: void): THandle;
}

/**
 * Class member initialization options.
 */
export interface EsMemberInit {
  /**
   * Member visibility, either `public` or `private`
   *
   * @defaultValue {@link EsMemberVisibility#Public Public} by default.
   */
  readonly visibility?: EsMemberVisibility;
}
