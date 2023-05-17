import { EsSource } from '../es-source.js';
import { EsClass } from './es-class.js';

/**
 * Member of {@link EsClass class}.
 *
 * Members uniquely identifies by this instances of this type.
 */
export interface EsMember {
  /**
   * Requested member name.
   *
   * Note that the class may decide to rename it in order to resolve naming conflicts.
   */
  get requestedName(): string;

  /**
   * Informs whether this member is [private].
   *
   * @returns `true` for [private] member, or `false` for [public] one.
   *
   * [private]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Classes/Private_class_fields
   * [public]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Classes/Public_class_fields
   */
  isPrivate(): boolean;
}

/**
 * Class {@link EsMember member} reference.
 *
 * Returned in response to {@link EsClass#findMember member search}.
 *
 * @typeParam TMember - Member type.
 */
export interface EsMemberRef<out TMember extends EsMember = EsMember> {
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
   * Whether the member is declared in host class.
   *
   * `false` value means the member is declared in one of the {@link EsClass#baseClass base classes}, and not yet
   * overridden in host class.
   */
  readonly declared: boolean;
}

/**
 * Class {@link EsMember member} {@link EsClass#declareMember declaration} details.
 *
 * @typeParam TMember - Member type.
 */
export interface EsMemberDeclaration<out TMember extends EsMember> {
  /**
   * Declares class member.
   *
   * @param context - Member declaration context.
   *
   * @returns Source of code containing member declaration.
   */
  declare(this: void, context: EsMemberContext<TMember>): EsSource;
}

/**
 *
 */
export interface EsMemberContext<out TMember extends EsMember> {
  readonly hostClass: EsClass;
  readonly member: TMember;
}
