export const CURRENCIES = ['JPY', 'USD', 'SGD', 'KRW', 'EUR', 'GBP', 'AUD', 'CNY', 'THB', 'MYR'];

export const CURRENCY_FLAGS = {
  JPY: '🇯🇵',
  USD: '🇺🇸',
  SGD: '🇸🇬',
  KRW: '🇰🇷',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  AUD: '🇦🇺',
  CNY: '🇨🇳',
  THB: '🇹🇭',
  MYR: '🇲🇾',
  IDR: '🇮🇩',
};

export const convert = (amount, rate) => amount * rate;
export const parseAmount = (value) => Number(String(value).replace(/,/g, '')) || 0;
export const formatAmount = (amount) => new Intl.NumberFormat('en-US').format(amount);
export const isConversionRateAvailable = (idrRate, currencyRate) => [idrRate, currencyRate].every((rate) => Number.isFinite(Number(rate)) && Number(rate) > 0);

export const formatChipRate = (rates, curr) => {
  const idrRate = Number(rates?.IDR) || 0;
  const currRate = Number(rates?.[curr]) || 0;
  if (!idrRate || !currRate) return '';
  const idrPerUnit = idrRate / currRate;
  if (idrPerUnit >= 1000) {
    return `Rp ${new Intl.NumberFormat('en-US').format(Math.round(idrPerUnit))}`;
  } if (idrPerUnit >= 10) {
    return `Rp ${idrPerUnit.toFixed(1)}`;
  }
  return `Rp ${idrPerUnit.toFixed(2)}`;
};
export const formatHistoryPayload = (item) => ({
  from_currency: item.from_currency,
  to_currency: item.to_currency,
  from_amount: Number(item.from_amount),
  to_amount: Number(item.to_amount),
  exchange_rate: Number(item.exchange_rate),
  note: item.note || '',
});
