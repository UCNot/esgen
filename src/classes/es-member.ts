import { EsSource } from '../es-source.js';
import { EsClass } from './es-class.js';

/**
 * Member of {@link EsClass class}.
 *
 * Members uniquely identifies by this instances of this type.
 *
 * @typeParam TDeclaration - Type of member declaration details.
 * @typeParam THandle - Type of member handle.
 */
export interface EsMember<in TDeclaration extends unknown[], out THandle = void> {
  /**
   * Requested member name.
   *
   * Note that the class may decide to rename it in order to resolve naming conflicts.
   */
  get requestedName(): string;

  /**
   * Visibility of this member.
   */
  get visibility(): EsMemberVisibility;

  /**
   * Declares class member.
   *
   * Called by class to {@link EsClass#declare declare} this member.
   *
   * Each declared member provides a {@link EsMemberRef#handle handle} that can be used to access it.
   *
   * @param context - Member declaration context.
   * @param TDeclaration - Member declaration details specific to this member type.
   *
   * @returns Tuple containing source of code declaring the member, as well as member handle.
   */
  declare(
    context: EsMemberContext<this>,
    ...declaration: TDeclaration
  ): readonly [source: EsSource, handle: THandle];
}

/**
 * Any class {@link EsAnyMember member}.
 *
 * @typeParam THandle - Member handle type.
 */
export type EsAnyMember<THandle = unknown> = EsMember<any, THandle>;

export namespace EsMember {
  /**
   * Handle type extracted from member.
   *
   * @typeParam TMember - Member type.
   */
  export type HandleOf<TMember extends EsAnyMember> = TMember extends EsAnyMember<infer THandle>
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
export interface EsMemberRef<out TMember extends EsAnyMember = EsAnyMember, out THandle = unknown> {
  /**
   * Member instance.
   */
  readonly member: TMember;

  /**
   * Actual member name.
   *
   * {@link EsMember#isPrivate Private} class names always start with `#`.
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
 * Class member {@link EsDeclaration#declare declaration} context.
 *
 * @typeParam TDeclaration - Type of member declaration details.
 * @typeParam TMember - Member type.
 */
export interface EsMemberContext<out TMember extends EsAnyMember>
  extends Omit<EsMemberRef<TMember>, 'declared' | 'handle'> {
  /**
   * Host class the member declared in.
   */
  readonly hostClass: EsClass;

  /**
   * Declared member.
   */
  readonly member: TMember;
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
