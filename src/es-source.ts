import { EsCode } from './es-code.js';
import { EsEmitter } from './es-emission.js';
import { EsPrinter } from './es-output.js';

export type EsSource = string | EsPrinter | EsEmitter | EsFragment | EsBuilder;

export type EsBuilder = (this: void, code: EsCode) => void | PromiseLike<void>;

export interface EsFragment {
  toCode(): EsSource;
}
