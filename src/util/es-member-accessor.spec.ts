import { describe, expect, it } from '@jest/globals';
import { EsMemberVisibility } from '../classes/es-member-visibility.js';
import { esMemberAccessor } from './es-member-accessor.js';

describe('esMemberAccessor', () => {
  describe('for private members', () => {
    it('replaces empty name', () => {
      expect(esMemberAccessor('', EsMemberVisibility.Private)).toEqual({
        key: '#__',
        accessor: '.#__',
      });
    });
    it('escapes unsafe ID', () => {
      expect(esMemberAccessor('123', EsMemberVisibility.Private)).toEqual({
        key: '#_x31_23',
        accessor: '.#_x31_23',
      });
    });
    it('handles safe ID', () => {
      expect(esMemberAccessor('abc', EsMemberVisibility.Private)).toEqual({
        key: '#abc',
        accessor: '.#abc',
      });
    });
  });

  describe('for public members', () => {
    it('handles empty name', () => {
      expect(esMemberAccessor('')).toEqual({
        key: "['']",
        accessor: "['']",
      });
    });
    it('handles "constructor" name', () => {
      expect(esMemberAccessor('constructor')).toEqual({
        key: "['constructor']",
        accessor: "['constructor']",
      });
    });
    it('handles unsafe ID', () => {
      expect(esMemberAccessor('123')).toEqual({
        key: "['123']",
        accessor: "['123']",
      });
    });
    it('handles safe ID', () => {
      expect(esMemberAccessor('abc')).toEqual({
        key: 'abc',
        accessor: '.abc',
      });
    });
  });
});
