import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef } from 'react';

/**
 * Writes JSON records under one storage key, one after another, so a slow
 * write never lands after a newer one. A record identical to the last one
 * written (or marked as already on disk) is skipped.
 */
export function useStorageWriter(key: string) {
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const last = useRef<string | null>(null);

  const write = useCallback(
    (data: unknown) => {
      const json = JSON.stringify(data);
      if (json === last.current) return;
      last.current = json;
      queue.current = queue.current.then(() => AsyncStorage.setItem(key, json)).catch(() => undefined);
    },
    [key],
  );

  /** Records that `data` is already on disk, so it is not written straight back. */
  const onDisk = useCallback((data: unknown) => {
    last.current = JSON.stringify(data);
  }, []);

  return { write, onDisk };
}
