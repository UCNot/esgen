import { EsCode } from './es-code.js';
import { EsPrintable } from './es-printer.js';

export type EsSource = string | EsPrintable | EsEmitter | EsFragment | EsBuilder;

export interface EsEmitter {
  emit(): string | EsPrintable | PromiseLike<string | EsPrintable>;
}

export type EsBuilder = (this: void, code: EsCode) => void | PromiseLike<void>;

export interface EsFragment {
  toCode(): EsSource;
}
