export const formatCurrencyByLang = (amountCents: number, currency: string, lang: string) => {
  const locale = lang?.startsWith('uk') ? 'uk-UA' : 'en-GB';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
};

