import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundleFormat } from '../scopes/es-bundle-format.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { esDeclareVar } from './es-declare-var.js';

describe('esDeclare', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle({ format: EsBundleFormat.IIFE });
  });

  it('exports declared symbol', async () => {
    const symbol = esDeclareVar('test', { at: 'exports', value: () => '10 + 3' });

    bundle.ns.refer(symbol);

    await expect(bundle.emit().asExports()).resolves.toEqual({ test: 13 });
  });
});
