import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from '../emission/es-bundle.js';
import { EsDeclaredClass } from './es-declared.class.js';

describe('EsDeclaredClass', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  it('declares base class before the class itself', async () => {
    const baseClass = new EsDeclaredClass('Base');
    const cls = new EsDeclaredClass('Test', { baseClass });

    bundle.ns.refer(cls);

    await expect(bundle.emit().asText()).resolves.toBe(
      'class Base {\n}\nclass Test extends Base {\n}\n',
    );
  });
});
