import { getDefaultSettings, type AppSettings } from "./settings";

export const appSettings = $state<AppSettings>(getDefaultSettings());

export function updateAppSettings(patch: Partial<AppSettings>) {
  Object.assign(appSettings, patch);
}