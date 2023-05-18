import { lazyValue } from '@proc7ts/primitives';
import { jsStringLiteral } from 'httongue';
import { EsEmission, EsEmissionResult, EsEmitter } from '../emission/es-emission.js';
import { EsCode } from '../es-code.js';
import { EsSource } from '../es-source.js';
import { EsNameRegistry } from '../symbols/es-name-registry.js';
import { EsAnySymbol, EsNaming, EsReference } from '../symbols/es-symbol.js';
import { esSafeId } from '../util/es-safe-id.js';
import { EsAnyMember, EsMember, EsMemberRef, EsMemberVisibility } from './es-member.js';

/**
 * Mutable class representation.
 *
 * Class identified by unique {@link symbol} and has {@link members}.
 *
 * @typeParam TNaming - Type of class symbol naming.
 * @typeParam TSymbol - Type of class symbol.
 */
export class EsClass<
  out TNaming extends EsNaming = EsNaming,
  out TSymbol extends EsAnySymbol<TNaming> = EsAnySymbol<TNaming>,
> implements EsReference<TNaming, TSymbol>, EsEmitter {

  readonly #symbol: TSymbol;
  readonly #baseClass: EsClass | undefined;
  readonly #shared: EsClass$SharedState;
  readonly #code = new EsCode();
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
   * @param symbol - Class symbol.
   * @param init - Class initialization options.
   */
  constructor(symbol: TSymbol, init: EsClassInit = {}) {
    this.#symbol = symbol;

    const baseClass = init?.baseClass;

    this.#baseClass = baseClass;
    if (baseClass) {
      this.#shared = baseClass.#shared;
      this.#names = baseClass.#names.nest();
      this.#allMembersDerived = false;
    } else {
      this.#shared = { memberNames: new Map() };
      this.#names = new EsNameRegistry();
      this.#allMembersDerived = true;
    }

    this.#code.block(code => {
      code
        .inline(
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
    });
  }

  /**
   * Unique class symbol.
   */
  get symbol(): TSymbol {
    return this.#symbol;
  }

  /**
   * Case class this one extends, if any.
   */
  get baseClass(): EsClass | undefined {
    return this.#baseClass;
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
      return found.handle();
    }

    throw new ReferenceError(
      `${esMemberAccessor(member.requestedName).accessor} is not available in ${this}`,
    );
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
   * Adds class member.
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
    declaration: EsSource,
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
    declaration: EsSource,
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
    declaration: EsSource,
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
    const name = this.#privateNames.reserveName(member.requestedName);
    const newEntry = new EsMemberEntry<TMember, THandle>(this, member, `#${esSafeId(name)}`);

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
   * @param emission - Code emission control.
   *
   * @returns Code emission result that prints class name.
   */
  emit(emission: EsEmission): EsEmissionResult {
    return this.symbol.emit(emission);
  }

  /**
   * Emits class declaration.
   *
   * @returns Class declaration code emission.
   */
  declare(): EsSource {
    return {
      emit: emission => this.#code.emit(emission),
    };
  }

  toString(): string {
    return this.symbol.toString({ tag: '[Class]' });
  }

}

/**
 * {@link EsClass class} initialization options.
 */
export interface EsClassInit {
  /**
   * Base class the constructed one extends.
   */
  readonly baseClass?: EsClass;
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
  handle: () => THandle;

  constructor(hostClass: EsClass, member: TMember, name: string) {
    this.#hostClass = hostClass;
    this.#member = member;
    this.#name = name;
    if (member.visibility === EsMemberVisibility.Public) {
      const { key, accessor } = esMemberAccessor(name);

      this.#key = key;
      this.#accessor = accessor;
    } else {
      this.#key = name;
      this.#accessor = `.${name}`;
    }

    // Obtain handle from base class, unless declared explicitly.
    this.handle = lazyValue(() => this.#hostClass.baseClass!.member(member));
  }

  isDeclared(): boolean {
    return this.#declared;
  }

  declare(handle: THandle): void {
    if (this.#declared) {
      throw new TypeError(`${this.#accessor} already declared in ${this.#hostClass}`);
    }

    this.#declared = true;
    this.handle = () => handle;
  }

  toRef(): EsMemberRef<TMember, THandle> {
    return {
      member: this.#member,
      name: this.#name,
      key: this.#key,
      accessor: this.#accessor,
      declared: this.#declared,
      handle: this.handle(),
    };
  }

}

interface EsClass$SharedState {
  readonly memberNames: Map<EsAnyMember, string>;
}

function esMemberAccessor(name: string): { key: string; accessor: string } {
  const safeId = esSafeId(name);

  if (safeId === name) {
    return { key: name, accessor: `.${name}` };
  }

  const key = `[${jsStringLiteral(name)}]`;

  return { key, accessor: key };
}
