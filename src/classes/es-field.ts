import { EsSource } from '../es-source.js';
import { esline } from '../esline.tag.js';
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
   * @returns Source of code containing field declaration.
   */
  readonly initializer?:
    | ((this: void, member: EsMemberRef<EsField>, hostClass: EsClass) => EsSource)
    | undefined;
}

/**
 * {@link EsField field} handle.
 *
 * Grants access to the field stored in class instance.
 */
export interface EsFieldHandle {
  /**
   * Read field value.
   *
   * @param target - Class instance expression.
   *
   * @returns Value read expression.
   */
  get(this: void, target: EsSource): EsSource;

  /**
   * Assigns field value.
   *
   * @param target - Class instance expression.
   * @param value - Assigned value expression.
   *
   * @returns Value assignment expression.
   */
  set(this: void, target: EsSource, value: EsSource): EsSource;
}
