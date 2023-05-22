import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsComment } from './es-comment.js';
import { EsOutput } from './es-output.js';

describe('EsComment', () => {
  describe('from', () => {
    it('returns empty comment without parameter', () => {
      const comment = EsComment.from();

      expect(comment.isEmpty()).toBe(true);
      expect(comment).toBe(EsComment.empty);
    });
    it('returns empty comment for empty parameter', () => {
      const comment = EsComment.from('');

      expect(comment.isEmpty()).toBe(true);
      expect(comment).toBe(EsComment.empty);
    });
    it('splits non-empty input onto lines', () => {
      expect(EsComment.from('\nFirst\nSecond\n').toString()).toBe(
        `
/*

   First
   Second

*/`.trimStart(),
      );
    });
    it('returns comment instance itself', () => {
      const comment = new EsComment('!!!');

      expect(EsComment.from(comment)).toBe(comment);
    });
  });

  describe('empty', () => {
    let comment: EsComment;

    beforeEach(() => {
      comment = new EsComment();
    });

    describe('isEmpty()', () => {
      it('returns true', () => {
        expect(comment.isEmpty()).toBe(true);
      });
    });
    describe('toString()', () => {
      it('prints without prefix', () => {
        expect(comment.toString()).toBe('/**/');
      });
      it('prints with prefix', () => {
        expect(comment.toString('[Test]')).toBe('/* [Test] */');
      });
    });

    describe('printTo()', () => {
      it('prints nothing', async () => {
        await expect(print(comment)).resolves.toBe('');
      });
    });
  });

  describe('single line', () => {
    let comment: EsComment;

    beforeEach(() => {
      comment = new EsComment('Comment text');
    });

    describe('isEmpty()', () => {
      it('returns false', () => {
        expect(comment.isEmpty()).toBe(false);
      });
    });

    describe('toString()', () => {
      it('prints without prefix', () => {
        expect(comment.toString()).toBe('/* Comment text */');
      });
      it('prints with prefix', () => {
        expect(comment.toString('[Test]')).toBe('/* [Test] Comment text */');
      });
    });

    describe('printTo()', () => {
      it('prints single-line block comment', async () => {
        await expect(print(comment)).resolves.toBe('/* Comment text */\n');
      });
    });
  });

  describe('empty single line', () => {
    let comment: EsComment;

    beforeEach(() => {
      comment = new EsComment('');
    });

    describe('isEmpty()', () => {
      it('returns false', () => {
        expect(comment.isEmpty()).toBe(false);
      });
    });

    describe('toString()', () => {
      it('prints without prefix', () => {
        expect(comment.toString()).toBe('/**/');
      });
      it('prints with prefix', () => {
        expect(comment.toString('[Test]')).toBe('/* [Test] */');
      });
    });

    it('prints empty block comment', async () => {
      await expect(print(comment)).resolves.toBe('/**/\n');
    });
  });

  describe('multi-line', () => {
    let comment: EsComment;

    beforeEach(() => {
      comment = new EsComment('First', 'Second');
    });

    describe('isEmpty()', () => {
      it('returns false', () => {
        expect(comment.isEmpty()).toBe(false);
      });
    });

    describe('toString()', () => {
      it('prints without prefix', () => {
        expect(comment.toString()).toBe(
          `
/*
   First
   Second
*/`.trimStart(),
        );
      });
      it('prints with prefix', () => {
        expect(comment.toString('[Test]')).toBe(
          `
/* [Test]
   First
   Second
*/`.trimStart(),
        );
      });

      it('prints multi-line block comment', async () => {
        await expect(print(comment)).resolves.toBe(
          `
/*
   First
   Second
*/
`.trimStart(),
        );
      });
      it('prints multi-line block comment within line', async () => {
        await expect(printLine(comment)).resolves.toBe(
          `
/*
   First
   Second
*/
`.trimStart(),
        );
      });
    });
  });

  async function print(comment: EsComment): Promise<string> {
    return await new EsOutput().print(comment).asText();
  }

  async function printLine(comment: EsComment): Promise<string> {
    return await new EsOutput()
      .line(out => {
        out.print(comment);
      })
      .asText();
  }
});
