import { beforeEach, describe, expect, it } from '@jest/globals';
import { esline } from '../esline.tag.js';
import { EsBundleFormat } from '../scopes/es-bundle-format.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsDeclaredLambda } from './es-declared.lambda.js';

describe('EsDeclaredLambda', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle({ format: EsBundleFormat.IIFE });
  });

  it('exports function', async () => {
    const fn = new EsDeclaredLambda(
      'increase',
      { value: { comment: 'Value to increase' } },
      { exported: true, body: ({ args: { value } }) => esline`return ${value} + 1;` },
    );

    expect(bundle.ns.refer(fn).getNaming().name).toBe('increase');

    const { increase } = (await bundle.emit().asExports()) as { increase(value: number): number };

    expect(increase(1)).toBe(2);
  });
});
