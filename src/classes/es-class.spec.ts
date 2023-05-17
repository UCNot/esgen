import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsCode } from '../es-code.js';
import { EsSource } from '../es-source.js';
import { EsLocalSymbol } from '../symbols/es-local.symbol.js';
import { EsClass } from './es-class.js';
import { EsLocalClass } from './es-local.class.js';
import { EsMember, EsMemberContext, EsMemberVisibility } from './es-member.js';

describe('EsClass', () => {
  let baseClass: EsClass;
  let hostClass: EsClass;

  beforeEach(() => {
    baseClass = new EsLocalClass('Base');
    hostClass = new EsLocalClass('Test', { baseClass });
  });

  describe('declareMember', () => {
    it('declares public class member', () => {
      const member = new TestMember('test');

      expect(hostClass.findMember(member)).toBeUndefined();

      hostClass.declareMember(member);

      expect(hostClass.findMember(member)).toEqual({
        member,
        name: 'test',
        key: 'test',
        accessor: '.test',
        declared: true,
      });
      expect([...hostClass.members()]).toEqual([
        {
          member,
          name: 'test',
          key: 'test',
          accessor: '.test',
          declared: true,
        },
      ]);
    });
    it('declares override class member', () => {
      const member = new TestMember('test');

      expect(hostClass.findMember(member)).toBeUndefined();

      baseClass.declareMember(member);

      expect(hostClass.findMember(member)).toEqual({
        member,
        name: 'test',
        key: 'test',
        accessor: '.test',
        declared: false,
      });
      expect([...hostClass.members()]).toEqual([
        {
          member,
          name: 'test',
          key: 'test',
          accessor: '.test',
          declared: false,
        },
      ]);

      hostClass.declareMember(member);

      expect(hostClass.findMember(member)).toEqual({
        member,
        name: 'test',
        key: 'test',
        accessor: '.test',
        declared: true,
      });
      expect([...hostClass.members()]).toEqual([
        {
          member,
          name: 'test',
          key: 'test',
          accessor: '.test',
          declared: true,
        },
      ]);
    });
    it('declares private class member', () => {
      const member = new TestMember('test', EsMemberVisibility.Private);

      expect(hostClass.findMember(member)).toBeUndefined();

      hostClass.declareMember(member);

      expect(hostClass.findMember(member)).toEqual({
        member,
        name: '#test',
        key: '#test',
        accessor: '.#test',
        declared: true,
      });
      expect([...hostClass.members()]).toEqual([
        {
          member,
          name: '#test',
          key: '#test',
          accessor: '.#test',
          declared: true,
        },
      ]);
    });
    it('declares private member of base class only', () => {
      const member = new TestMember('test', EsMemberVisibility.Private);

      expect(hostClass.findMember(member)).toBeUndefined();

      baseClass.declareMember(member);

      expect(hostClass.findMember(member)).toBeUndefined();
      expect([...hostClass.members()]).toEqual([]);
    });
    it('permits arbitrary public member name', () => {
      const member = new TestMember('test\n');

      expect(hostClass.declareMember(member)).toEqual({
        member,
        name: 'test\n',
        key: "['test\\n']",
        accessor: "['test\\n']",
        declared: true,
      });
    });
    it('converts private member name to ECMAScript-safe identifier', () => {
      const member = new TestMember('test\n', EsMemberVisibility.Private);

      expect(hostClass.declareMember(member)).toEqual({
        member,
        name: '#test_xA_',
        key: '#test_xA_',
        accessor: '.#test_xA_',
        declared: true,
      });
    });
    it('resolves private member name conflict', () => {
      const member1 = new TestMember('test', EsMemberVisibility.Private);
      const member2 = new TestMember('test', EsMemberVisibility.Private);

      expect(hostClass.declareMember(member1).name).toBe('#test');
      expect(hostClass.declareMember(member2).name).toBe('#test$0');
    });
    it('resolves naming conflict between base and derived classes', () => {
      const member1 = new TestMember('test');
      const member2 = new TestMember('test');
      const member3 = new TestMember('test');
      const class2 = new EsClass(new EsLocalSymbol('Test2'), { baseClass });

      expect(hostClass.declareMember(member1).name).toBe('test');
      expect(baseClass.declareMember(member2).name).toBe('test$0');
      expect(class2.declareMember(member3).name).toBe('test');
    });
    it('prevents duplicate member declaration', () => {
      const member = new TestMember('test');

      hostClass.declareMember(member);
      expect(() => hostClass.declareMember(member)).toThrow(
        new TypeError(`test already declared in Test /* [Class] */`),
      );
    });
  });

  describe('members', () => {
    it('iterates over derived class members', () => {
      const member = new TestMember('test');

      baseClass.declareMember(member);
      expect([...hostClass.members({ derived: true })]).toEqual([
        {
          member,
          name: 'test',
          key: 'test',
          accessor: '.test',
          declared: false,
        },
      ]);
      expect([...hostClass.members({ derived: false })]).toEqual([]);
    });
    it('iterates over private class members', () => {
      const member = new TestMember('test', EsMemberVisibility.Private);

      hostClass.declareMember(member);
      expect([...hostClass.members({ visibility: 'private' })]).toEqual([
        {
          member,
          name: '#test',
          key: '#test',
          accessor: '.#test',
          declared: true,
        },
      ]);
      expect([...hostClass.members({ visibility: 'public' })]).toEqual([]);
    });
    it('iterates over public class members', () => {
      const member = new TestMember('test');

      hostClass.declareMember(member);
      expect([...hostClass.members({ visibility: 'public' })]).toEqual([
        {
          member,
          name: 'test',
          key: 'test',
          accessor: '.test',
          declared: true,
        },
      ]);
      expect([...hostClass.members({ derived: false })]).toEqual([
        {
          member,
          name: 'test',
          key: 'test',
          accessor: '.test',
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

class TestMember implements EsMember<[]> {

  readonly #requestedName: string;
  readonly #visibility: EsMemberVisibility;

  constructor(requestedName: string, visibility: EsMemberVisibility = EsMemberVisibility.Public) {
    this.#requestedName = requestedName;
    this.#visibility = visibility;
  }

  get requestedName(): string {
    return this.#requestedName;
  }

  get visibility(): EsMemberVisibility {
    return this.#visibility;
  }

  declare(_context: EsMemberContext<this>): EsSource {
    return EsCode.none;
  }

}
