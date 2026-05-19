import { getDefaultSettings, type AppSettings } from "./settings";
import { updateMascotSettings, loadMascot } from "$lib/mascot/store.svelte";

export const appSettings = $state<AppSettings>(getDefaultSettings());

export function updateAppSettings(patch: Partial<AppSettings>) {
  Object.assign(appSettings, patch);
  if (patch.mascotScope) {
    // scope change handled by caller (AppLayout / MascotSidebar)
  }
  if (patch.mascot) {
    updateMascotSettings(patch.mascot);
    if (patch.mascot.currentMascot) {
      loadMascot(patch.mascot.currentMascot);
    }
  }
}
