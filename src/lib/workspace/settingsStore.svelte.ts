import { getDefaultSettings, type AppSettings } from "./settings";

export let appSettings = $state<AppSettings>(getDefaultSettings());

export function updateAppSettings(patch: Partial<AppSettings>) {
  appSettings = { ...appSettings, ...patch };
}
