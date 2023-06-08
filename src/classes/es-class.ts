import { lazyValue } from '@proc7ts/primitives';
import { EsCode } from '../code/es-code.js';
import { EsSnippet } from '../code/es-snippet.js';
import { esline } from '../code/esline.tag.js';
import { EsSignature } from '../functions/es-signature.js';
import { EsEmissionResult, EsEmitter, EsScope } from '../scopes/es-scope.js';
import { EsNameRegistry } from '../symbols/es-name-registry.js';
import {
  EsDeclarationPolicy,
  EsNaming,
  EsReference,
  EsSymbol,
  EsSymbolInit,
} from '../symbols/es-symbol.js';
import { esMemberAccessor } from '../util/es-member-accessor.js';
import { esSafeId } from '../util/es-safe-id.js';
import { EsConstructor, EsConstructorDeclaration, EsConstructorInit } from './es-constructor.js';
import { EsMemberVisibility } from './es-member-visibility.js';
import { EsAnyMember, EsMember, EsMemberRef } from './es-member.js';

/**
 * Mutable class representation.
 *
 * Class identified by unique {@link symbol} and has {@link members}.
 *
 * @typeParam TArgs - Type of class constructor arguments definition.
 * @typeParam TNaming - Type of class symbol naming.
 * @typeParam TSymbol - Type of class symbol.
 */
export class EsClass<out TArgs extends EsSignature.Args = EsSignature.Args>
  implements EsReference<EsClassNaming<TArgs>>, EsEmitter {

  readonly #symbol: EsSymbol<EsClassNaming<TArgs>>;
  readonly #baseClass: EsClass | undefined;
  readonly #classConstructor: EsConstructor<TArgs>;

  readonly #shared: EsClass$SharedState;
  #code?: EsCode;
  readonly #privateBody = new EsCode();
  readonly #body = new EsCode();

  readonly #names: EsNameRegistry;
  readonly #members = new Map<EsAnyMember, EsMemberEntry>();

  readonly #privateNames = new EsNameRegistry();
  readonly #privateMembers = new Map<EsAnyMember, EsMemberEntry>();

  #allMembersDerived: boolean;

  /**
   * Constructs class representation.
   *
   * @param requestedName - Either requested class name, or symbol (e.g. {@link esImportClass imported} from another
   * module).
   * @param init - Class initialization options.
   */
  constructor(
    requestedName: string | EsSymbol<EsClassNaming<TArgs>>,
    ...init: EsSignature.NoArgs extends TArgs ? [EsClassInit<TArgs>?] : [EsClassInit<TArgs>]
  );

  constructor(
    requestedName: string | EsSymbol<EsClassNaming<TArgs>>,
    init: Partial<EsClassInit<TArgs>> = {},
  ) {
    const { baseClass, declare, classConstructor } = init;

    this.#symbol =
      typeof requestedName === 'string'
        ? new EsSymbol(requestedName, {
            ...init,
            declare: declare && {
              ...declare,
              as: context => {
                if (baseClass) {
                  context.refer(baseClass);
                }

                return [this.asDeclaration(), this.#createNaming(context.naming)];
              },
            },
          })
        : requestedName;

    this.#baseClass = baseClass;
    if (baseClass) {
      this.#classConstructor = (
        classConstructor ? EsConstructor.from(classConstructor) : baseClass.classConstructor
      ) as EsConstructor<TArgs>;
      this.#shared = baseClass.#shared;
      this.#names = baseClass.#names.nest();
      this.#allMembersDerived = false;
    } else {
      this.#classConstructor = EsConstructor.from(classConstructor) as EsConstructor<TArgs>;
      this.#shared = { memberNames: new Map() };
      this.#names = new EsNameRegistry();
      this.#allMembersDerived = true;
    }

    this.#addPublicMember(this.classConstructor);
  }

  #createNaming(naming: EsNaming): EsClassNaming<TArgs> {
    const {
      symbol,
      classConstructor: { signature },
    } = this;

    return {
      ...naming,
      symbol,
      signature,
      instantiate(args: EsSignature.ValuesOf<TArgs>) {
        return esline`new ${naming}${signature.call(args)}`;
      },
    };
  }

  /**
   * Unique class symbol.
   */
  get symbol(): EsSymbol<EsClassNaming<TArgs>> {
    return this.#symbol;
  }

  /**
   * The base class this one extends, if any.
   */
  get baseClass(): EsClass | undefined {
    return this.#baseClass;
  }

  /**
   * Class constructor.
   */
  get classConstructor(): EsConstructor<TArgs> {
    return this.#classConstructor;
  }

  /**
   * Obtains class handle.
   *
   * Shorthand for `this.member(this.classConstructor)`.
   */
  getHandle(): EsClassHandle<TArgs> {
    return this.member(this.classConstructor);
  }

  /**
   * Instantiates this class.
   *
   * Shorthand for `this.getHandle().instantiate(args).
   *
   * @param args - Named argument values.
   *
   * @returns Class instantiation expression.
   */
  instantiate(
    ...args: EsSignature.RequiredKeyOf<TArgs> extends never
      ? [EsSignature.ValuesOf<TArgs>?]
      : [EsSignature.ValuesOf<TArgs>]
  ): EsSnippet;

  instantiate(args: EsSignature.ValuesOf<TArgs>): EsSnippet {
    return this.getHandle().instantiate(args);
  }

  /**
   * Searches for the `member` declaration.
   *
   * @typeParam TMember - Member type.
   * @typeParam THandle - Handle type.
   * @param member - Member to find.
   *
   * @returns Either found member reference, or `undefined` if the member neither declared in this class, nor in one of
   * its {@link baseClass base classes}.
   */
  findMember<TMember extends EsMember<THandle>, THandle = EsMember.HandleOf<TMember>>(
    member: TMember,
  ): EsMemberRef<TMember, THandle> | undefined {
    return this.#findMember<TMember, THandle>(member)?.toRef();
  }

  /**
   * Obtains `member`'s handle.
   *
   * @typeParam TMember - Member type.
   * @typeParam THandle - Handle type.
   * @param member - Member to access.
   *
   * @returns Member handle, either declared in this class, or derived from the {@link baseClass base} one.
   *
   * @throws [ReferenceError] if the `member` is neither declared in this class, nor derived from one of the
   * {@link baseClass base} ones.
   *
   * [ReferenceError]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/ReferenceError
   */
  member<TMember extends EsMember<THandle>, THandle = EsMember.HandleOf<TMember>>(
    member: TMember,
  ): THandle {
    const found = this.#findMember<TMember, THandle>(member);

    if (found) {
      return found.getHandle();
    }

    throw new ReferenceError(`${member} is not available in ${this}`);
  }

  #findMember<TMember extends EsMember<THandle>, THandle>(
    member: TMember,
  ): EsMemberEntry<TMember, THandle> | undefined {
    return member.visibility === EsMemberVisibility.Public
      ? this.#findPublicMember(member)
      : this.#findPrivateMember(member);
  }

  #findPublicMember<TMember extends EsMember<THandle>, THandle>(
    member: TMember,
  ): EsMemberEntry<TMember, THandle> | undefined {
    const present = this.#members.get(member) as EsMemberEntry<TMember, THandle> | undefined;

    if (present) {
      return present;
    }

    if (!this.#baseClass?.findMember<TMember, THandle>(member)) {
      return;
    }

    return this.#addPublicMember(member);
  }

  #findPrivateMember<TMember extends EsMember<THandle>, THandle>(
    member: TMember,
  ): EsMemberEntry<TMember, THandle> | undefined {
    return this.#privateMembers.get(member) as EsMemberEntry<TMember, THandle>;
  }

  /**
   * Explicitly declares {@link classConstructor class constructor}.
   *
   * @param init - Declaration details.
   *
   * @returns Class handle.
   */
  declareConstructor(declaration: EsConstructorDeclaration<TArgs>): EsClassHandle<TArgs> {
    return this.classConstructor.declareIn(this, declaration);
  }

  /**
   * Adds class member.
   *
   * Called typically by member declaration method.
   *
   * @typeParam TMember - Member type.
   * @typeParam THandle - Type of member handle.
   * @param member - Member to add.
   * @param handle - Member handle.
   *
   * @returns Declared member reference.
   *
   * @throw [TypeError] if the `member` already declared in this class.
   *
   * [TypeError]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/TypeError
   */
  addMember<TMember extends EsMember<THandle>, THandle = EsMember.HandleOf<TMember>>(
    member: TMember,
    handle: THandle,
    declaration: EsSnippet,
  ): EsMemberRef<TMember, THandle> {
    return (
      member.visibility === EsMemberVisibility.Public
        ? this.#declarePublicMember(member, handle, declaration)
        : this.#declarePrivateMember(member, handle, declaration)
    ).toRef();
  }

  #declarePublicMember<TMember extends EsMember<THandle>, THandle>(
    member: TMember,
    handle: THandle,
    declaration: EsSnippet,
  ): EsMemberEntry<TMember, THandle> {
    const entry: EsMemberEntry<TMember, THandle> =
      this.#findPublicMember(member) ?? this.#addPublicMember(member);

    entry.declare(handle);
    this.#body.write(declaration);

    return entry;
  }

  #addPublicMember<TMember extends EsMember<THandle>, THandle>(
    member: TMember,
  ): EsMemberEntry<TMember, THandle> {
    const { memberNames } = this.#shared;
    let name = memberNames.get(member);

    if (!name) {
      name = this.#names.reserveName(member.requestedName);
      memberNames.set(member, name);
    }

    const newEntry = new EsMemberEntry<TMember, THandle>(this, member, name);

    this.#members.set(member, newEntry);

    return newEntry;
  }

  #declarePrivateMember<TMember extends EsMember<THandle>, THandle>(
    member: TMember,
    handle: THandle,
    declaration: EsSnippet,
  ): EsMemberEntry<TMember, THandle> {
    const entry: EsMemberEntry<TMember, THandle> =
      this.#findPrivateMember(member) ?? this.#addPrivateMember(member);

    entry.declare(handle);
    this.#privateBody.write(declaration);

    return entry;
  }

  #addPrivateMember<TMember extends EsMember<THandle>, THandle>(
    member: TMember,
  ): EsMemberEntry<TMember, THandle> {
    const name = this.#privateNames.reserveName(esSafeId(member.requestedName));
    const newEntry = new EsMemberEntry<TMember, THandle>(this, member, name);

    this.#privateMembers.set(member, newEntry);

    return newEntry;
  }

  /**
   * Iterates over class members.
   *
   * @param filter - Optional member filter.
   *
   * @returns Iterable iterator of matching members.
   */
  members(filter?: {
    /**
     * Members visibility.
     *
     * Either `public` to include only public members, `private` to include only private members, or `all` to include
     * all members.
     *
     * @defaultValue `all`.
     */
    readonly visibility?: 'public' | 'private' | 'all' | undefined;

    /**
     * Whether to include members derived from the {@link baseClass base class} and not overridden in this one.
     *
     * @defaultValue `true`
     */
    readonly derived?: boolean | undefined;
  }): IterableIterator<EsMemberRef>;

  *members({
    visibility,
    derived = true,
  }: {
    /**
     * Members visibility.
     *
     * Either `public` to include only public members, `private` to include only private members, or `all` to include
     * all members.
     *
     * @defaultValue `all`.
     */
    readonly visibility?: 'public' | 'private' | 'all' | undefined;

    /**
     * Whether to include members derived from the {@link baseClass base class} and not overridden in this one.
     *
     * Ignored when {@link visibility} is `private`.
     *
     * @defaultValue `true`
     */
    readonly derived?: boolean | undefined;
  } = {}): IterableIterator<EsMemberRef> {
    if (visibility !== 'public') {
      yield* this.#listPrivateMembers();
    }

    if (visibility !== 'private') {
      if (derived) {
        yield* this.#listAllPublicMembers();
      } else {
        yield* this.#listDeclaredPublicMembers();
      }
    }
  }

  *#listPrivateMembers(): IterableIterator<EsMemberRef> {
    for (const entry of this.#privateMembers.values()) {
      yield entry.toRef();
    }
  }

  *#listAllPublicMembers(): IterableIterator<EsMemberRef> {
    // Ensure all derived members listed.
    this.#deriveAllMembers();

    // List all public members
    for (const entry of this.#members.values()) {
      yield entry.toRef();
    }
  }

  *#listDeclaredPublicMembers(): IterableIterator<EsMemberRef> {
    for (const entry of this.#members.values()) {
      if (entry.isDeclared()) {
        yield entry.toRef();
      }
    }
  }

  #deriveAllMembers(): void {
    if (!this.#allMembersDerived) {
      for (const { member } of this.baseClass!.members()) {
        this.#findMember(member);
      }

      this.#allMembersDerived = true;
    }
  }

  /**
   * Emits class reference.
   *
   * @param scope - Code emission scope.
   *
   * @returns Code emission result that prints class name.
   */
  emit(scope: EsScope): EsEmissionResult {
    return this.symbol.emit(scope);
  }

  /**
   * Declares class.
   *
   * @returns Class declaration statement.
   */
  declare(): EsSnippet {
    return this.symbol.declareSymbol({
      as: context => [this.asDeclaration(), this.#createNaming(context.naming)],
    });
  }

  /**
   * Emits class declaration statement.
   *
   * @returns Class declaration statement.
   */
  asDeclaration(): EsSnippet {
    return {
      emit: scope => this.#getCode().emit(scope),
    };
  }

  #getCode(): EsCode {
    return (this.#code ??= new EsCode().multiLine(code => {
      this.getHandle(); // Ensure class constructor is valid.

      code
        .line(
          'class ',
          this.symbol,
          code => {
            const { baseClass } = this;

            if (baseClass) {
              code.write(' extends ', baseClass);
            }
          },
          ' {',
        )
        .indent(this.#privateBody, this.#body)
        .write('}');
    }));
  }

  toString(): string {
    const { requestedName, comment } = this.symbol;

    return comment.appendTo(requestedName, '[Class]');
  }

}

/**
 * {@link EsClass class} initialization options.
 *
 * @typeParam TArgs - Type of class constructor arguments definition.
 */
export type EsClassInit<TArgs extends EsSignature.Args> =
  | EsClassInit.Custom<TArgs>
  | EsClassInit.Inherited<TArgs>
  | (TArgs extends EsSignature.NoArgs ? EsClassInit.NoArgs : never);

export namespace EsClassInit {
  /**
   * Base {@link EsClass class} initialization options.
   */
  export interface BaseInit extends Omit<EsSymbolInit, 'declare'> {
    /**
     * Automatic class declaration policy.
     *
     * When specified, the class will be automatically declared once referenced.
     *
     * When omitted, the class has to be explicitly {@link EsClass#declare declared} prior to being used.
     */
    readonly declare?: EsClassDeclarationPolicy | undefined;
  }

  /**
   * Custom {@link EsClass class} initialization options with explicit constructor.
   *
   * @typeParam TArgs - Type of class constructor arguments definition.
   */
  export interface Custom<out TArgs extends EsSignature.Args> extends BaseInit {
    /**
     * Either required class constructor or its initialization options.
     *
     * The constructor has to be {@link EsClass#declareConstructor declared}, unless it has signature compatible with
     * {@link baseClass base class}.
     */
    readonly classConstructor: EsConstructor<TArgs> | EsConstructorInit<TArgs>;

    /**
     * Optional base class.
     */
    readonly baseClass?: EsClass | undefined;
  }

  /**
   * Inherited {@link EsClass class} initialization options with derived constructor.
   *
   * @typeParam TArgs - Type of class constructor arguments definition.
   */
  export interface Inherited<out TArgs extends EsSignature.Args> extends BaseInit {
    /**
     * Either optional class constructor or its initialization options.
     *
     * Will be inherited from the {@link baseClass base class} when omitted.
     */
    readonly classConstructor?: EsConstructor<TArgs> | EsConstructorInit<TArgs> | undefined;

    /**
     * Mandatory base class.
     */
    readonly baseClass: EsClass<TArgs>;
  }

  /**
   * No-args {@link EsClass class} initialization options with derived constructor.
   */
  export interface NoArgs extends BaseInit {
    /**
     * Either optional {@link EsSignature.NoArgs no-args} class constructor or its initialization options.
     *
     * Will be inherited from the {@link baseClass base class} when omitted. If there the {@link baseClass base class}
     * unspecified, a no-args constructor will be created.
     */
    readonly classConstructor?:
      | EsConstructor<EsSignature.NoArgs>
      | EsConstructorInit<EsSignature.NoArgs>
      | undefined;

    /**
     * Optional base class.
     */
    readonly baseClass?: EsClass<EsSignature.NoArgs> | undefined;
  }
}

/**
 * Automatic {@link EsClass class} declaration policy.
 */
export type EsClassDeclarationPolicy = Omit<EsDeclarationPolicy, 'as'>;

/**
 * {@link EsClass Class} naming within namespace.
 *
 * @typeParam TArgs - Type of class constructor arguments definition.
 */
export interface EsClassNaming<out TArgs extends EsSignature.Args = EsSignature.Args>
  extends EsNaming {
  /**
   * Named class symbol.
   */
  readonly symbol: EsSymbol<EsClassNaming<TArgs>>;

  /**
   * Constructor signature.
   */
  readonly signature: EsSignature<TArgs>;

  /**
   * Instantiates class.
   *
   * @param args - Named argument values.
   *
   * @returns Class instantiation expression.
   */
  instantiate(
    ...args: EsSignature.RequiredKeyOf<TArgs> extends never
      ? [EsSignature.ValuesOf<TArgs>?]
      : [EsSignature.ValuesOf<TArgs>]
  ): EsSnippet;
}

/**
 * {@link EsClass Class} handle used to instantiate new class instances.
 *
 * @typeParam TArgs - Type of class constructor arguments definition.
 */
export interface EsClassHandle<out TArgs extends EsSignature.Args = EsSignature.Args> {
  /**
   * Host class.
   */
  readonly hostClass: EsClass<TArgs>;

  /**
   * Instantiates class.
   *
   * @param args - Named argument values.
   *
   * @returns Class instantiation expression.
   */
  instantiate(
    ...args: EsSignature.RequiredKeyOf<TArgs> extends never
      ? [EsSignature.ValuesOf<TArgs>?]
      : [EsSignature.ValuesOf<TArgs>]
  ): EsSnippet;
}

class EsMemberEntry<
  out TMember extends EsMember<THandle> = EsAnyMember,
  out THandle = EsMember.HandleOf<TMember>,
> {

  readonly #hostClass: EsClass;
  readonly #member: TMember;
  readonly #name: string;
  readonly #key: string;
  readonly #accessor: string;
  #declared = false;
  getHandle: () => THandle;

  constructor(hostClass: EsClass, member: TMember, name: string) {
    this.#hostClass = hostClass;
    this.#member = member;

    const { key, accessor } = esMemberAccessor(name, member.visibility);

    this.#name = member.visibility === EsMemberVisibility.Private ? key : name;
    this.#key = key;
    this.#accessor = accessor;

    // Obtain handle from base class, unless declared explicitly.
    this.getHandle = lazyValue(() => this.#getDefaultHandle());
  }

  #getDefaultHandle(): THandle {
    const { baseClass } = this.#hostClass;
    const inherited = baseClass?.findMember<TMember, THandle>(this.#member);

    return inherited
      ? this.#member.inherit(this.#hostClass, inherited, baseClass!)
      : this.#member.autoDeclare(this.#hostClass, this.toRef());
  }

  isDeclared(): boolean {
    return this.#declared;
  }

  declare(handle: THandle): void {
    if (this.#declared) {
      throw new TypeError(`${this.#accessor} already declared in ${this.#hostClass}`);
    }

    this.#declared = true;
    this.getHandle = () => handle;
  }

  toRef(): EsMemberRef<TMember, THandle> {
    return {
      member: this.#member,
      name: this.#name,
      key: this.#key,
      accessor: this.#accessor,
      declared: this.#declared,
      getHandle: this.getHandle,
    };
  }

}

interface EsClass$SharedState {
  readonly memberNames: Map<EsAnyMember, string>;
}
