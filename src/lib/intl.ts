/**
 * Browser formatters, built once.
 *
 * Creating an `Intl` formatter is the expensive part of writing a date, and a
 * list writes hundreds of them per render. One instance per locale and set of
 * options is enough, since a formatter holds no state.
 */
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();
const numberFormatters = new Map<string, Intl.NumberFormat>();

function cached<T>(cache: Map<string, T>, locale: string, options: object, make: () => T): T {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = cache.get(key);
  if (!formatter) { formatter = make(); cache.set(key, formatter); }
  return formatter;
}

export const intlDate = (locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat =>
  cached(dateFormatters, locale, options, () => new Intl.DateTimeFormat(locale, options));

export const intlRelative = (locale: string, options: Intl.RelativeTimeFormatOptions): Intl.RelativeTimeFormat =>
  cached(relativeFormatters, locale, options, () => new Intl.RelativeTimeFormat(locale, options));

export const intlNumber = (locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat =>
  cached(numberFormatters, locale, options, () => new Intl.NumberFormat(locale, options));
