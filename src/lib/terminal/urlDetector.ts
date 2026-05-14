import { writable } from "svelte/store";

export interface DetectedUrl {
  url: string;
  terminalId: string;
  timestamp: number;
}

export const detectedUrls = writable<DetectedUrl[]>([]);

const seenUrls = new Set<string>();

export function reportUrl(url: string, terminalId: string): void {
  const key = `${terminalId}::${url}`;
  if (seenUrls.has(key)) return;
  seenUrls.add(key);

  detectedUrls.update((list) => [
    ...list,
    { url, terminalId, timestamp: Date.now() },
  ]);
}

export function clearUrls(): void {
  detectedUrls.set([]);
  seenUrls.clear();
}

export function clearUrl(url: string, terminalId: string): void {
  const key = `${terminalId}::${url}`;
  seenUrls.delete(key);
  detectedUrls.update((list) =>
    list.filter((u) => !(u.url === url && u.terminalId === terminalId))
  );
}
