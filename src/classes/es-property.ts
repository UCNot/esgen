import { asis } from '@proc7ts/primitives';
import { EsSnippet } from '../es-snippet.js';
import { esline } from '../esline.tag.js';
import { EsScopeKind } from '../scopes/es-scope.js';
import { EsVarSymbol } from '../symbols/es-var.symbol.js';
import { EsClass } from './es-class.js';
import { EsField } from './es-field.js';
import { EsMember, EsMemberRef, EsMemberVisibility } from './es-member.js';

/**
 * Class property representation.
 */
export class EsProperty extends EsMember<EsPropertyHandle> {

  /**
   * Declares this property in the given class.
   *
   * @param hostClass - Host class to declare field in.
   * @param declaration - Accessor declaration details.
   *
   * @returns Declared property handle.
   */
  declareIn(hostClass: EsClass, declaration?: EsPropertyDeclaration): EsPropertyHandle;

  declareIn(hostClass: EsClass, { get, set }: EsPropertyDeclaration = {}): EsPropertyHandle {
    if (!get && !set) {
      const store = new EsField(`_${this.requestedName}`, {
        visibility: EsMemberVisibility.Private,
      }).declareIn(hostClass);

      get = (_member, _hostClass) => esline`return ${store.get('this')};`;
      set = (value, _member, _hostClass) => esline`${store.set('this', value)};`;
    }

    const handle: EsPropertyHandle = {
      property: this,
      readable: !!get,
      writable: !!set,
      get: get ? target => esline`${target}${ref.accessor}` : this.#notReadable.bind(this),
      set: set
        ? (target, value) => esline`${target}${ref.accessor} = ${value}`
        : this.#notWritable.bind(this),
    };
    const ref = hostClass.addMember(this, handle, code => {
      if (get) {
        code
          .write(`get ${ref.key}() {`)
          .scope({ kind: EsScopeKind.Function }, code => {
            code.indent(get!(ref, hostClass));
          })
          .write('}');
      }
      if (set) {
        code
          .write(`set ${ref.key}(value) {`)
          .scope({ kind: EsScopeKind.Function }, (code, { ns }) => {
            const value = ns.addSymbol(new EsVarSymbol('value'), asis);

            code.write().indent(set!(value, ref, hostClass));
          })
          .write('}');
      }
    });

    return handle;
  }

  #notReadable(_target: EsSnippet): never {
    throw new TypeError(`${this} is not readable`);
  }

  #notWritable(_target: EsSnippet, _value: EsSnippet): never {
    throw new TypeError(`${this} is not writable`);
  }

}

/**
 * Class property {@link EsProperty#declareIn declaration} details.
 *
 * Declares property {@link get getter} and/or {@link set setter}. If neither declared, both will be declared
 * automatically.
 */
export interface EsPropertyDeclaration {
  /**
   * Emits property getter body.
   *
   * @param member - Declared property reference.
   * @param hostClass - Class to declare the property for.
   *
   * @returns Code snippet containing property getter declaration.
   */
  readonly get?:
    | ((this: void, member: EsMemberRef<EsProperty>, hostClass: EsClass) => EsSnippet)
    | undefined;

  /**
   * Emits property setter body.
   *
   * @param value - Assigned value expression.
   * @param member - Declared property reference.
   * @param hostClass - Class to declare the property for.
   *
   * @returns Code snippet containing property getter declaration.
   */
  readonly set?:
    | ((
        this: void,
        value: EsSnippet,
        member: EsMemberRef<EsProperty>,
        hostClass: EsClass,
      ) => EsSnippet)
    | undefined;
}

/**
 * Class {@link EsProperty property} handle used to read and assign property value.
 */
export interface EsPropertyHandle {
  /**
   * Target property.
   */
  readonly property: EsProperty;

  /**
   * Whether the property is readable.
   *
   * `true` if {@link EsPropertyDeclaration#get property getter} has been declared, or `false` otherwise.
   */
  readable: boolean;

  /**
   * Whether te property is writable.
   *
   * `true` if {@link EsPropertyDeclaration#set property setter} has been declared, or `false` otherwise.
   */
  writable: boolean;

  /**
   * Reads property value via {@link EsPropertyDeclaration#get getter}, if defined.
   *
   * @param target - Class instance expression.
   *
   * @returns Value read expression.
   *
   * @throws [TypeError] if getter is not {@link readable}.
   *
   * [TypeError]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/TypeError
   */
  get(this: void, target: EsSnippet): EsSnippet;

  /**
   * Assigns property value via {@link EsPropertyDeclaration#set setter}, if defined.
   *
   * @param target - Class instance expression.
   * @param value - Assigned value expression.
   *
   * @returns Value assignment expression.
   *
   * @throws [TypeError] if setter is not {@link writable}.
   *
   * [TypeError]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/TypeError
   */
  set(this: void, target: EsSnippet, value: EsSnippet): EsSnippet;
}
