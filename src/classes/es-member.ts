import { EsClass } from './es-class.js';

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
   * {@link EsMemberVisibility.Private Private} class names always start with `#`.
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
   * Member handle.
   */
  readonly handle: THandle;
}

/**
 * Class {@link EsMember member} visibility.
 */
export enum EsMemberVisibility {
  /**
   * Member is [public] (the default).
   *
   * [public]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Classes/Public_class_fields
   */
  Public = 'public',

  /**
   * Member is [private].
   *
   * [private]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Classes/Private_class_fields
   */
  Private = 'private',
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
