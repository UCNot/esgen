import { jsStringLiteral } from 'httongue';
import { EsEmission, EsEmissionResult, EsEmitter } from '../emission/es-emission.js';
import { EsCode } from '../es-code.js';
import { EsSource } from '../es-source.js';
import { EsNameRegistry } from '../symbols/es-name-registry.js';
import { EsAnySymbol, EsNaming, EsReference } from '../symbols/es-symbol.js';
import { esSafeId } from '../util/es-safe-id.js';
import { EsAnyMember, EsMember, EsMemberRef, EsMemberVisibility } from './es-member.js';

/**
 * Class representation.
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
              code.write('extends ', baseClass.symbol);
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
   * @param member - Member to find.
   *
   * @returns Either found member reference, or `undefined` if the member neither declared in this class, nor in one of
   * its {@link baseClass base classes}.
   */
  findMember<TMember extends EsAnyMember>(member: TMember): EsMemberRef<TMember> | undefined {
    const found = this.#findMember(member);

    return found?.toRef();
  }

  #findMember<TDeclaration extends unknown[], TMember extends EsMember<TDeclaration>>(
    member: TMember,
  ): EsMemberEntry<TDeclaration, TMember> | undefined {
    return member.visibility === EsMemberVisibility.Public
      ? this.#findPublicMember(member)
      : this.#findPrivateMember(member);
  }

  #findPublicMember<TDeclaration extends unknown[], TMember extends EsMember<TDeclaration>>(
    member: TMember,
  ): EsMemberEntry<TDeclaration, TMember> | undefined {
    const present = this.#members.get(member) as EsMemberEntry<TDeclaration, TMember> | undefined;

    if (present) {
      return present;
    }

    if (!this.#baseClass?.findMember(member)) {
      return;
    }

    return this.#addPublicMember(member);
  }

  #findPrivateMember<TDeclaration extends unknown[], TMember extends EsMember<TDeclaration>>(
    member: TMember,
  ): EsMemberEntry<TDeclaration, TMember> | undefined {
    return this.#privateMembers.get(member) as EsMemberEntry<TDeclaration, TMember> | undefined;
  }

  /**
   * Declares class member.
   *
   * @param member - Member instance.
   * @param declaration - Member declaration details.
   *
   * @returns Declared member reference.
   *
   * @throw [TypeError] if the `member` already declared in this class.
   *
   * [TypeError]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/TypeError
   */
  declareMember<TDeclaration extends unknown[], TMember extends EsMember<TDeclaration>>(
    member: TMember,
    ...declaration: TDeclaration
  ): EsMemberRef<TMember> {
    return (
      member.visibility === EsMemberVisibility.Public
        ? this.#declarePublicMember(member, declaration)
        : this.#declarePrivateMember(member, declaration)
    ).toRef();
  }

  #declarePublicMember<TDeclaration extends unknown[], TMember extends EsMember<TDeclaration>>(
    member: TMember,
    declaration: TDeclaration,
  ): EsMemberEntry<TDeclaration, TMember> {
    let entry = this.#findPublicMember<TDeclaration, TMember>(member);

    if (!entry) {
      entry = this.#addPublicMember(member);
    }

    this.#body.write(entry.declare(...declaration));

    return entry;
  }

  #addPublicMember<TDeclaration extends unknown[], TMember extends EsMember<TDeclaration>>(
    member: TMember,
  ): EsMemberEntry<TDeclaration, TMember> {
    const { memberNames } = this.#shared;
    let name = memberNames.get(member);

    if (!name) {
      name = this.#names.reserveName(member.requestedName);
      memberNames.set(member, name);
    }

    const entry = new EsMemberEntry<TDeclaration, TMember>(this, member, name);

    this.#members.set(member, entry);

    return entry;
  }

  #declarePrivateMember<TDeclaration extends unknown[], TMember extends EsMember<TDeclaration>>(
    member: TMember,
    declaration: TDeclaration,
  ): EsMemberEntry<TDeclaration, TMember> {
    let entry = this.#findPrivateMember<TDeclaration, TMember>(member);

    if (!entry) {
      entry = this.#addPrivateMember(member);
    }

    this.#privateBody.write(entry.declare(...declaration));

    return entry;
  }

  #addPrivateMember<TDeclaration extends unknown[], TMember extends EsMember<TDeclaration>>(
    member: TMember,
  ): EsMemberEntry<TDeclaration, TMember> {
    const name = this.#privateNames.reserveName(member.requestedName);
    const entry = new EsMemberEntry(this, member, `#${esSafeId(name)}`);

    this.#privateMembers.set(member, entry);

    return entry;
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
   * Emits class declaration.
   *
   * @param emission - Code emission control.
   *
   * @returns Code emission result that prints class declaration.
   */
  emit(emission: EsEmission): EsEmissionResult {
    return this.#code.emit(emission);
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
  in TDeclaration extends unknown[] = any,
  out TMember extends EsMember<TDeclaration> = EsMember<TDeclaration>,
> {

  readonly #hostClass: EsClass;
  readonly #member: TMember;
  readonly #name: string;
  readonly #key: string;
  readonly #accessor: string;
  #declared = false;

  constructor(hostClass: EsClass, member: TMember, name: string) {
    this.#hostClass = hostClass;
    this.#member = member;
    this.#name = name;
    if (member.visibility === EsMemberVisibility.Public) {
      const safeId = esSafeId(name);

      if (safeId === name) {
        this.#key = name;
        this.#accessor = `.${name}`;
      } else {
        this.#key = this.#accessor = `[${jsStringLiteral(name)}]`;
      }
    } else {
      this.#key = name;
      this.#accessor = `.${name}`;
    }
  }

  isDeclared(): boolean {
    return this.#declared;
  }

  declare(...declaration: TDeclaration): EsSource {
    if (this.#declared) {
      throw new TypeError(`${String(this.#member)} already declared in ${this.#hostClass}`);
    }

    this.#declared = true;

    return this.#member.declare(
      {
        member: this.#member,
        name: this.#name,
        key: this.#key,
        accessor: this.#accessor,
        hostClass: this.#hostClass,
      },
      ...declaration,
    );
  }

  toRef(): EsMemberRef<TMember> {
    return {
      member: this.#member,
      name: this.#name,
      key: this.#key,
      accessor: this.#accessor,
      declared: this.#declared,
    };
  }

}

interface EsClass$SharedState {
  readonly memberNames: Map<EsAnyMember, string>;
}
