import { useEffect, useState } from 'react';

export type LocalStorageSetter<T> = (v: T) => void;

/** Persist nilai ke localStorage dengan fallback aman (SSR / quota exceeded). */
export function useLocalStorage<T>(key: string, initial: T): [T, LocalStorageSetter<T>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore — quota penuh / storage tidak tersedia
    }
  }, [key, value]);

  return [value, setValue];
}
