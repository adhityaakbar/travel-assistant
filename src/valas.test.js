import assert from 'node:assert/strict';
import test from 'node:test';
import { CURRENCIES, convert, formatAmount, formatHistoryPayload, isConversionRateAvailable, parseAmount } from './valas.js';

test('conversion starts at zero and uses selected currency rate', () => {
  assert.equal(convert(0, 0.0067), 0);
  assert.equal(convert(100, 15000), 1500000);
});

test('parses en-US comma amount and numeric input equivalently', () => {
  assert.equal(parseAmount('1,500,000'), 1500000);
  assert.equal(parseAmount(1500000), 1500000);
});

test('display groups digits with en-US commas without changing numeric conversion', () => {
  assert.equal(formatAmount(1500000), '1,500,000');
  assert.deepEqual(CURRENCIES, ['JPY', 'USD', 'SGD', 'KRW', 'EUR', 'GBP', 'AUD', 'CNY', 'THB', 'MYR']);
});

test('history mutation payload preserves editable row fields', () => {
  assert.deepEqual(formatHistoryPayload({
    from_currency: 'JPY',
    to_currency: 'IDR',
    from_amount: '100',
    to_amount: '1500000',
    exchange_rate: '15000',
    note: 'lunch',
  }), {
    from_currency: 'JPY',
    to_currency: 'IDR',
    from_amount: 100,
    to_amount: 1500000,
    exchange_rate: 15000,
    note: 'lunch',
  });
});

test('conversion rate must be finite and positive before saving', () => {
  assert.equal(isConversionRateAvailable(15000, 1), true);
  assert.equal(isConversionRateAvailable(0, 1), false);
  assert.equal(isConversionRateAvailable(15000, 0), false);
  assert.equal(isConversionRateAvailable(NaN, 1), false);
});

test('empty note remains empty for persistence', () => {
  assert.equal(''.trim(), '');
});
