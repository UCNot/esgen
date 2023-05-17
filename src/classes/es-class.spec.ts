import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsCode } from '../es-code.js';
import { EsLocalSymbol } from '../symbols/es-local.symbol.js';
import { EsClass } from './es-class.js';
import { EsMember } from './es-member.js';

describe('EsClass', () => {
  let baseClass: EsClass;
  let hostClass: EsClass;

  beforeEach(() => {
    baseClass = new EsClass(new EsLocalSymbol('Base'));
    hostClass = new EsClass(new EsLocalSymbol('Test'), { baseClass });
  });

  describe('declareMember', () => {
    it('declares public class member', () => {
      const member = new TestMember('test');

      expect(hostClass.findMember(member)).toBeUndefined();

      hostClass.declareMember(member, { declare: () => EsCode.none });

      expect(hostClass.findMember(member)).toEqual({
        member,
        name: 'test',
        declared: true,
      });
      expect([...hostClass.members()]).toEqual([
        {
          member,
          name: 'test',
          declared: true,
        },
      ]);
    });
    it('declares override class member', () => {
      const member = new TestMember('test');

      expect(hostClass.findMember(member)).toBeUndefined();

      baseClass.declareMember(member, { declare: () => EsCode.none });

      expect(hostClass.findMember(member)).toEqual({
        member,
        name: 'test',
        declared: false,
      });
      expect([...hostClass.members()]).toEqual([
        {
          member,
          name: 'test',
          declared: false,
        },
      ]);

      hostClass.declareMember(member, { declare: () => EsCode.none });

      expect(hostClass.findMember(member)).toEqual({
        member,
        name: 'test',
        declared: true,
      });
      expect([...hostClass.members()]).toEqual([
        {
          member,
          name: 'test',
          declared: true,
        },
      ]);
    });
    it('declares private class member', () => {
      const member = new TestMember('test', true);

      expect(hostClass.findMember(member)).toBeUndefined();

      hostClass.declareMember(member, { declare: () => EsCode.none });

      expect(hostClass.findMember(member)).toEqual({
        member,
        name: '#test',
        declared: true,
      });
      expect([...hostClass.members()]).toEqual([
        {
          member,
          name: '#test',
          declared: true,
        },
      ]);
    });
    it('declares private member of base class only', () => {
      const member = new TestMember('test', true);

      expect(hostClass.findMember(member)).toBeUndefined();

      baseClass.declareMember(member, { declare: () => EsCode.none });

      expect(hostClass.findMember(member)).toBeUndefined();
      expect([...hostClass.members()]).toEqual([]);
    });
    it('permits arbitrary public member name', () => {
      const member = new TestMember('test\n');

      expect(hostClass.declareMember(member, { declare: () => EsCode.none }).name).toBe('test\n');
    });
    it('converts private member name to ECMAScript-safe identifier', () => {
      const member = new TestMember('test\n', true);

      expect(hostClass.declareMember(member, { declare: () => EsCode.none }).name).toBe(
        '#test_xA_',
      );
    });
    it('resolves private member name conflict', () => {
      const member1 = new TestMember('test', true);
      const member2 = new TestMember('test', true);

      expect(hostClass.declareMember(member1, { declare: () => EsCode.none }).name).toBe('#test');
      expect(hostClass.declareMember(member2, { declare: () => EsCode.none }).name).toBe('#test$0');
    });
    it('resolves naming conflict between base and derived classes', () => {
      const member1 = new TestMember('test');
      const member2 = new TestMember('test');
      const member3 = new TestMember('test');
      const class2 = new EsClass(new EsLocalSymbol('Test2'), { baseClass });

      expect(hostClass.declareMember(member1, { declare: () => EsCode.none }).name).toBe('test');
      expect(baseClass.declareMember(member2, { declare: () => EsCode.none }).name).toBe('test$0');
      expect(class2.declareMember(member3, { declare: () => EsCode.none }).name).toBe('test');
    });
  });

  describe('members', () => {
    it('iterates over derived class members', () => {
      const member = new TestMember('test');

      baseClass.declareMember(member, { declare: () => EsCode.none });
      expect([...hostClass.members({ derived: true })]).toEqual([
        {
          member,
          name: 'test',
          declared: false,
        },
      ]);
      expect([...hostClass.members({ derived: false })]).toEqual([]);
    });
    it('iterates over private class members', () => {
      const member = new TestMember('test', true);

      hostClass.declareMember(member, { declare: () => EsCode.none });
      expect([...hostClass.members({ visibility: 'private' })]).toEqual([
        {
          member,
          name: '#test',
          declared: true,
        },
      ]);
      expect([...hostClass.members({ visibility: 'public' })]).toEqual([]);
    });
    it('iterates over public class members', () => {
      const member = new TestMember('test');

      hostClass.declareMember(member, { declare: () => EsCode.none });
      expect([...hostClass.members({ visibility: 'public' })]).toEqual([
        {
          member,
          name: 'test',
          declared: true,
        },
      ]);
      expect([...hostClass.members({ derived: false })]).toEqual([
        {
          member,
          name: 'test',
          declared: true,
        },
      ]);
      expect([...hostClass.members({ visibility: 'private' })]).toEqual([]);
    });
  });

  describe('toString', () => {
    it('reflects class name', () => {
      expect(hostClass.toString()).toBe(`Test /* [Class] */`);
    });
  });
});

class TestMember implements EsMember {

  readonly #requestedName: string;
  readonly #isPrivate: boolean;

  constructor(requestedName: string, isPrivate = false) {
    this.#requestedName = requestedName;
    this.#isPrivate = isPrivate;
  }

  get requestedName(): string {
    return this.#requestedName;
  }

  isPrivate(): boolean {
    return this.#isPrivate;
  }

}
