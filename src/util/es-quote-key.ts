/**
 * Conditionally quotes JavaScript key.
 *
 * If the given `key` is valid JavaScript identifier, then leaves it as is. Otherwise, encloses it into quotes and
 * properly {@link escapeJsString escapes} if necessary.
 *
 * @param key - A key to quote.
 * @param quote - Quote symbol to use.
 *
 * @returns Conditionally quoted string.
 */
export { quoteJsKey as esQuoteKey } from 'httongue';
