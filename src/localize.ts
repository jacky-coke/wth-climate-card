import * as en from "./localize/en.json";
import * as de from "./localize/de.json";

type Dict = { [key: string]: Dict | string };

const LANGUAGES: Record<string, Dict> = {
  en: en as unknown as Dict,
  de: de as unknown as Dict
};

function lookup(dict: Dict, key: string): string | undefined {
  let node: Dict | string = dict;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Dict)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Resolve a localization key against the given Home Assistant language,
 * falling back to English, and finally to the key itself.
 */
export function localize(
  language: string | undefined,
  key: string,
  vars?: Record<string, string>
): string {
  const lang = (language || "en").split("-")[0].toLowerCase();
  const dict = LANGUAGES[lang] || LANGUAGES.en;
  let result = lookup(dict, key) ?? lookup(LANGUAGES.en, key) ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(`{${k}}`, v);
    }
  }
  return result;
}
