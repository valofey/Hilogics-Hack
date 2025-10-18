const RU_LOCALE = 'ru-RU';

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(RU_LOCALE, {
    maximumFractionDigits: 0,
    ...options
  }).format(value);
}

export function formatPercent(value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(RU_LOCALE, {
    style: 'percent',
    maximumFractionDigits: 1,
    ...options
  }).format(value);
}

export function formatCurrency(value: number, currency: string = 'USD') {
  return new Intl.NumberFormat(RU_LOCALE, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}
