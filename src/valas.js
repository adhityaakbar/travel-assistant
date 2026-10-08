export const CURRENCIES = ['JPY', 'USD', 'SGD', 'KRW', 'EUR', 'GBP', 'AUD', 'CNY', 'THB', 'MYR'];

export const convert = (amount, rate) => amount * rate;
export const parseAmount = (value) => Number(String(value).replace(/,/g, '')) || 0;
export const formatAmount = (amount) => new Intl.NumberFormat('en-US').format(amount);
export const isConversionRateAvailable = (idrRate, currencyRate) => [idrRate, currencyRate].every((rate) => Number.isFinite(Number(rate)) && Number(rate) > 0);
export const formatHistoryPayload = (item) => ({
  from_currency: item.from_currency,
  to_currency: item.to_currency,
  from_amount: Number(item.from_amount),
  to_amount: Number(item.to_amount),
  exchange_rate: Number(item.exchange_rate),
  note: item.note || '',
});
