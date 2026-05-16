import { checkLinterAvailability } from "./linter";

export const linterAvailability = $state<{ language: string | null; available: boolean | null }>({
  language: null,
  available: null,
});

export async function updateLinterAvailability(language: string | null) {
  if (!language) {
    linterAvailability.language = null;
    linterAvailability.available = null;
    return;
  }
  if (linterAvailability.language === language && linterAvailability.available !== null) {
    return;
  }
  linterAvailability.language = language;
  linterAvailability.available = await checkLinterAvailability(language);
}
