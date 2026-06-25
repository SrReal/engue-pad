import type { Dictionary } from "./types";
import { en } from "./en";
import { es } from "./es";

export type Locale = "en" | "es";

const dicts: Record<Locale, Dictionary> = { en, es };

let currentLocale = $state<Locale>("en");

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function t(key: keyof Dictionary, ...args: (string | number)[]): string {
  const dict = dicts[currentLocale];
  let value = dict[key] ?? dicts.en[key] ?? key;
  // Simple positional interpolation: "Hello {0}" → replace with args
  for (let i = 0; i < args.length; i++) {
    value = value.replaceAll(`{${i}}`, String(args[i]));
  }
  return value;
}

// Default export for convenience
export { en, es };
export type { Dictionary };
