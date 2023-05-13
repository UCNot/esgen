import { EsImportedSymbol } from './es-imported.symbol.js';
import { EsModule } from './es-module.js';

/**
 * External module to {@link EsImportedSymbol import symbols} from.
 *
 * Module instances are identified by their name and cached.
 */
export class EsExternalModule extends EsModule {

  /**
   * Finds previously created external module with the given name, or creates one if not created yet.
   *
   * @param moduleName - External module name.
   *
   * @returns External module instance.
   */
  static byName(moduleName: string): EsExternalModule {
    const cached = EsExternalModule$cache.get(moduleName);

    return cached ?? new EsExternalModule(moduleName);
  }

  readonly #moduleName!: string;

  /**
   * Constructs external module.
   *
   * If external module with the given name already exists, then returns it instead.
   *
   * @param moduleName - External module name.
   */
  constructor(moduleName: string) {
    const cached = EsExternalModule$cache.get(moduleName);

    if (cached) {
      return cached;
    }

    super();

    this.#moduleName = moduleName;
    EsExternalModule$cache.set(moduleName, this);
  }

  /**
   * Module {@link moduleName} used as module identifier.
   */
  override get moduleId(): unknown {
    return this.moduleName;
  }

  override get moduleName(): string {
    return this.#moduleName;
  }

}

const EsExternalModule$cache = new Map<string, EsExternalModule>();
