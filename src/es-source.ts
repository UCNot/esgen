import { EsCode } from './es-code.js';
import { EsEmitter } from './es-emission.js';
import { EsPrintable } from './es-printer.js';

export type EsSource = string | EsPrintable | EsEmitter | EsFragment | EsBuilder;

export type EsBuilder = (this: void, code: EsCode) => void | PromiseLike<void>;

export interface EsFragment {
  toCode(): EsSource;
}
