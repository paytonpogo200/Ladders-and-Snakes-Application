'use client';

export function rememberedSelectionKey(profileId: string, name: string) {
  return `ladders-snakes:${profileId}:${name}`;
}

export function readRememberedSelection(profileId: string, name: string) {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(rememberedSelectionKey(profileId, name)) ?? '';
}

export function rememberSelection(profileId: string, name: string, value: string) {
  if (typeof window === 'undefined') return;
  if (value) window.localStorage.setItem(rememberedSelectionKey(profileId, name), value);
  else window.localStorage.removeItem(rememberedSelectionKey(profileId, name));
}
