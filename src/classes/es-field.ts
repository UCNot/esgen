import { EsSnippet } from '../code/es-snippet.js';
import { esline } from '../code/esline.tag.js';
import { EsClass } from './es-class.js';
import { EsMember, EsMemberRef } from './es-member.js';

/**
 * Class field representation.
 */
export class EsField extends EsMember<EsFieldHandle> {

  /**
   * Declares this field in the given class.
   *
   * @param hostClass - Host class to declare field in.
   * @param declaration - Field declaration details.
   *
   * @returns Declared field handle.
   */
  declareIn(hostClass: EsClass, declaration?: EsFieldDeclaration): EsFieldHandle;

  declareIn(hostClass: EsClass, { initializer }: EsFieldDeclaration = {}): EsFieldHandle {
    const handle: EsFieldHandle = {
      field: this,
      get: target => esline`${target}${ref.accessor}`,
      set: (target, value) => esline`${target}${ref.accessor} = ${value}`,
    };
    const ref = hostClass.addMember(this, handle, code => {
      code.write(
        initializer ? esline`${ref.key} = ${initializer(ref, hostClass)};` : esline`${ref.key};`,
      );
    });

    return handle;
  }

}

/**
 * Class field {@link EsField#declareIn declaration} details.
 */
export interface EsFieldDeclaration {
  /**
   * Emits field value initializer.
   *
   * @param member - Declared field reference.
   * @param hostClass - Class to declare the field for.
   *
   * @returns Code snippet containing field declaration.
   */
  readonly initializer?:
    | ((this: void, member: EsMemberRef<EsField>, hostClass: EsClass) => EsSnippet)
    | undefined;
}

/**
 * Class {@link EsField field} handle used to read and assign field value.
 */
export interface EsFieldHandle {
  /**
   * Target field.
   */
  readonly field: EsField;

  /**
   * Reads field value.
   *
   * @param target - Class instance expression.
   *
   * @returns Value read expression.
   */
  get(this: void, target: EsSnippet): EsSnippet;

  /**
   * Assigns field value.
   *
   * @param target - Class instance expression.
   * @param value - Assigned value expression.
   *
   * @returns Value assignment expression.
   */
  set(this: void, target: EsSnippet, value: EsSnippet): EsSnippet;
}
