import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ar } from "./ar";
import { en, type MessageKey, type PluralKey } from "./en";

export type Language = "ar" | "en";
export type Params = Record<string, string | number>;

const dictionaries: Record<Language, Record<string, string | undefined>> = { en, ar };

export function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

export const directionFor = (language: Language): "rtl" | "ltr" => (language === "ar" ? "rtl" : "ltr");

/** Western digits in Arabic text keep numbers consistent with the rest of the UI and with <input type=date>. */
export const intlLocale = (language: Language): string => (language === "ar" ? "ar-EG-u-nu-latn" : "en-US");

export interface Translator {
  (key: MessageKey, params?: Params): string;
  /** Pluralised message: picks `${base}_${category}` using CLDR rules, falling back to `_other`. */
  plural(base: PluralKey, count: number, params?: Params): string;
}

export function createTranslator(language: Language): Translator {
  const dict = dictionaries[language];
  const rules = new Intl.PluralRules(language === "ar" ? "ar" : "en");
  const t = ((key: MessageKey, params?: Params) => interpolate(dict[key] ?? key, params)) as Translator;
  t.plural = (base, count, params) => {
    const category = count === 0 && language === "ar" ? "zero" : rules.select(count);
    const lookup = (suffix: string) => dict[`${base}_${suffix}`];
    return interpolate(lookup(category) ?? lookup("other") ?? base, { count, ...params });
  };
  return t;
}

interface I18nValue {
  language: Language;
  dir: "rtl" | "ltr";
  locale: string;
  t: Translator;
}
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const value = useMemo<I18nValue>(
    () => ({ language, dir: directionFor(language), locale: intlLocale(language), t: createTranslator(language) }),
    [language],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
