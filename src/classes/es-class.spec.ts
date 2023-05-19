import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsCode } from '../es-code.js';
import { EsLocalSymbol } from '../symbols/es-local.symbol.js';
import { EsClass } from './es-class.js';
import { EsLocalClass } from './es-local.class.js';
import { EsMember, EsMemberRef, EsMemberVisibility } from './es-member.js';

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

      member.declareIn(hostClass);

      const ref = hostClass.findMember(member);

      expect(ref).toEqual({
        member,
        name: 'test',
        key: 'test',
        accessor: '.test',
        declared: true,
        getHandle: expect.any(Function),
      });
      expect(ref?.getHandle()).toBe(hostClass);
      expect([...hostClass.members()]).toEqual([
        hostClass.findMember(hostClass.classConstructor),
        ref,
      ]);
    });
    it('declares override class member', () => {
      const member = new TestMember('test');

      expect(hostClass.findMember(member)).toBeUndefined();

      member.declareIn(baseClass);

      const ref1 = hostClass.findMember(member);

      expect(ref1).toEqual({
        member,
        name: 'test',
        key: 'test',
        accessor: '.test',
        declared: false,
        getHandle: expect.any(Function),
      });
      expect(ref1?.getHandle()).toBe(baseClass);
      expect([...hostClass.members()]).toEqual([
        hostClass.findMember(hostClass.classConstructor),
        ref1,
      ]);

      member.declareIn(hostClass);

      const ref2 = hostClass.findMember(member);

      expect(ref2).toEqual({
        member,
        name: 'test',
        key: 'test',
        accessor: '.test',
        declared: true,
        getHandle: expect.any(Function),
      });
      expect(ref2?.getHandle()).toBe(hostClass);
      expect([...hostClass.members()]).toEqual([
        hostClass.findMember(hostClass.classConstructor),
        ref2,
      ]);
    });
    it('declares private class member', () => {
      const member = new TestMember('test', { visibility: EsMemberVisibility.Private });

      expect(hostClass.findMember(member)).toBeUndefined();

      member.declareIn(hostClass);

      const ref = hostClass.findMember(member);

      expect(ref).toEqual({
        member,
        name: '#test',
        key: '#test',
        accessor: '.#test',
        declared: true,
        getHandle: expect.any(Function),
      });
      expect(ref?.getHandle()).toBe(hostClass);
      expect([...hostClass.members()]).toEqual([
        ref,
        hostClass.findMember(hostClass.classConstructor),
      ]);
    });
    it('declares private member of base class only', () => {
      const member = new TestMember('test', { visibility: EsMemberVisibility.Private });

      expect(hostClass.findMember(member)).toBeUndefined();

      member.declareIn(baseClass);

      expect(hostClass.findMember(member)).toBeUndefined();
      expect([...hostClass.members()]).toEqual([hostClass.findMember(hostClass.classConstructor)]);
    });
    it('permits arbitrary public member name', () => {
      const member = new TestMember('test\n');

      expect(member.declareIn(hostClass)).toEqual({
        member,
        name: 'test\n',
        key: "['test\\n']",
        accessor: "['test\\n']",
        declared: true,
        getHandle: expect.any(Function),
      });
    });
    it('converts private member name to ECMAScript-safe identifier', () => {
      const member = new TestMember('test\n', { visibility: EsMemberVisibility.Private });

      expect(member.declareIn(hostClass)).toEqual({
        member,
        name: '#test_xA_',
        key: '#test_xA_',
        accessor: '.#test_xA_',
        declared: true,
        getHandle: expect.any(Function),
      });
    });
    it('resolves private member name conflict', () => {
      const member1 = new TestMember('test', { visibility: EsMemberVisibility.Private });
      const member2 = new TestMember('test', { visibility: EsMemberVisibility.Private });

      expect(member1.declareIn(hostClass).name).toBe('#test');
      expect(member2.declareIn(hostClass).name).toBe('#test$0');
    });
    it('resolves naming conflict between base and derived classes', () => {
      const member1 = new TestMember('test');
      const member2 = new TestMember('test');
      const member3 = new TestMember('test');
      const class2 = new EsClass(new EsLocalSymbol('Test2'), { baseClass });

      expect(member1.declareIn(hostClass).name).toBe('test');
      expect(member2.declareIn(baseClass).name).toBe('test$0');
      expect(member3.declareIn(class2).name).toBe('test');
    });
    it('prevents duplicate member declaration', () => {
      const member = new TestMember('test');

      member.declareIn(hostClass);
      expect(() => member.declareIn(hostClass)).toThrow(
        new TypeError(`.test already declared in Test /* [Class] */`),
      );
    });
  });

  describe('member', () => {
    it('returns declared field handle', () => {
      const member = new TestMember('test');

      member.declareIn(hostClass);

      expect(hostClass.member(member)).toBe(hostClass);
    });
    it('fails for undeclared member', () => {
      const member = new TestMember('test');

      expect(() => hostClass.member(member)).toThrow(
        `.test is not available in Test /* [Class] */`,
      );
    });
  });

  describe('members', () => {
    it('iterates over derived class members', () => {
      const member = new TestMember('test');

      member.declareIn(baseClass);
      expect([...hostClass.members({ derived: true })]).toEqual([
        hostClass.findMember(hostClass.classConstructor),
        {
          member,
          name: 'test',
          key: 'test',
          accessor: '.test',
          declared: false,
          getHandle: expect.any(Function),
        },
      ]);
      expect([...hostClass.members({ derived: false })]).toEqual([]);
    });
    it('iterates over private class members', () => {
      const member = new TestMember('test', { visibility: EsMemberVisibility.Private });

      member.declareIn(hostClass);
      expect([...hostClass.members({ visibility: 'private' })]).toEqual([
        {
          member,
          name: '#test',
          key: '#test',
          accessor: '.#test',
          declared: true,
          getHandle: expect.any(Function),
        },
      ]);
      expect([...hostClass.members({ visibility: 'public' })]).toEqual([
        hostClass.findMember(hostClass.classConstructor),
      ]);
    });
    it('iterates over public class members', () => {
      const member = new TestMember('test');

      member.declareIn(hostClass);
      expect([...hostClass.members({ visibility: 'public' })]).toEqual([
        hostClass.findMember(hostClass.classConstructor),
        {
          member,
          name: 'test',
          key: 'test',
          accessor: '.test',
          declared: true,
          getHandle: expect.any(Function),
        },
      ]);
      expect([...hostClass.members({ derived: false })]).toEqual([
        {
          member,
          name: 'test',
          key: 'test',
          accessor: '.test',
          declared: true,
          getHandle: expect.any(Function),
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

class TestMember extends EsMember<EsClass> {

  declareIn(hostClass: EsClass): EsMemberRef<TestMember, EsClass> {
    return hostClass.addMember(this, hostClass, EsCode.none);
  }

}
