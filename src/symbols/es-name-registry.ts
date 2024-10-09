/**
 * Name registry used to {@link reserveName reserve names} in order to make them unique.
 */
export class EsNameRegistry {
  readonly #enclosing: EsNameRegistry | undefined;
  readonly #names = new Map<string, EsReservedNames>();

  /**
   * Constructs name registry.
   *
   * @param enclosing - Enclosing name registry.
   */
  constructor(enclosing?: EsNameRegistry) {
    this.#enclosing = enclosing;
  }

  /**
   * Enclosing name registry, or `undefined` for top-level one.
   */
  get enclosing(): EsNameRegistry | undefined {
    return this.#enclosing;
  }

  /**
   * Reserves name and resolves naming conflicts.
   *
   * Tries to use `preferred` name. But if this name registered already, then appends unique suffix to it to resolve
   * the conflict.
   *
   * @param preferred - Preferred name. Defaults to `tmp`.
   *
   * @returns Reserved and conflict-free name based on `preferred` one.
   */
  reserveName(preferred = 'tmp'): string {
    return this.#reserveName(preferred, false);
  }

  #reserveName(preferred: string, forNested: boolean): string {
    if (forNested) {
      const names = this.#names.get(preferred);

      if (names?.nested) {
        return names.nested;
      }
    }

    const { enclosing } = this;

    if (enclosing) {
      const names = this.#names.get(preferred);
      const name = this.#saveName(
        enclosing.#reserveName(names ? this.#nextName(names) : preferred, true),
        forNested,
      );

      if (names && name !== preferred) {
        this.#addName(names, name, forNested);
      }

      return name;
    }

    return this.#saveName(preferred, forNested);
  }

  #saveName(preferred: string, forNested: boolean): string {
    const names = this.#names.get(preferred);
    let name: string;

    if (names) {
      name = this.#nextName(names);
      this.#addName(names, name, forNested);
    } else {
      name = preferred;
    }

    this.#names.set(name, { list: [name], nested: forNested ? name : undefined });

    return name;
  }

  #addName(names: EsReservedNames, name: string, forNested: boolean): void {
    names.list.push(name);
    if (forNested && !names.nested) {
      names.nested = name;
    }
  }

  #nextName({ list }: EsReservedNames): string {
    const lastName = list[list.length - 1];
    const dollarIdx = lastName.lastIndexOf('$');
    const lastIndex = dollarIdx < 0 ? NaN : Number(lastName.slice(dollarIdx + 1));
    let name: string;

    if (Number.isFinite(lastIndex)) {
      name = `${lastName.slice(0, dollarIdx)}$${lastIndex + 1}`;
    } else {
      name = `${lastName}$0`;
    }

    const conflict = this.#names.get(name);

    return conflict ? this.#nextName(conflict) : name;
  }

  /**
   * Creates nested names registry.
   *
   * @returns New name registry nested within current one.
   */
  nest(): EsNameRegistry {
    return new EsNameRegistry(this);
  }
}

interface EsReservedNames {
  readonly list: string[];
  nested: string | undefined;
}
