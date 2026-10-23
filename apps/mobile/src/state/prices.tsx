import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PriceFile, StorePrices } from '../../../../packages/shared/src/prices/quote';
import { PRICES_URL } from '../config';
import { useStorageWriter } from './storage';

// The last price file is kept on the device so the list still shows prices offline.
// It holds public shelf prices only, nothing about the household.
const STORAGE_KEY = 'makeat.prices.v1';

/** Feed chain codes in the price file, by the chain ids the household picks. */
export const FEED_CHAIN: Record<string, string> = { ramiLevy: 'RAMI_LEVY', osherAd: 'OSHER_AD' };

type Status = 'loading' | 'ok' | 'offline';

type PricesContext = {
  /** The newest file we have, downloaded now or kept from before; null if none. */
  file: PriceFile | null;
  /** 'offline' when the last download failed (a kept file may still be shown). */
  status: Status;
  refresh: () => void;
};

const Ctx = createContext<PricesContext | null>(null);

const isStore = (s: unknown): s is StorePrices => {
  const x = s as StorePrices;
  return !!x && typeof x.chain === 'string' && typeof x.storeId === 'string' && typeof x.name === 'string' && !!x.prices && typeof x.prices === 'object';
};

/** The file if it has the shape we read, with malformed branches and prices dropped; null otherwise. */
export function parsePriceFile(data: unknown): PriceFile | null {
  const f = data as PriceFile;
  if (!f || f.version !== 1 || typeof f.generatedAt !== 'string' || !Array.isArray(f.stores)) return null;
  const stores = f.stores.filter(isStore).map((s) => ({
    ...s,
    publishedAt: typeof s.publishedAt === 'string' ? s.publishedAt : null,
    prices: Object.fromEntries(Object.entries(s.prices).filter(([, p]) => typeof p === 'number' && Number.isFinite(p) && p > 0)),
  }));
  return { version: 1, generatedAt: f.generatedAt, stores };
}

export function PricesProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<PriceFile | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const { write, onDisk } = useStorageWriter(STORAGE_KEY);
  // A download that finishes after a newer one must not replace it.
  const attempt = useRef(0);
  const fresh = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const kept = raw ? parsePriceFile(JSON.parse(raw)) : null;
        if (!kept || fresh.current) return;
        onDisk(kept);
        setFile(kept);
      })
      .catch(() => undefined);
  }, [onDisk]);

  // Status starts as 'loading', so the first download needs no state change before it.
  const load = useCallback(() => {
    const n = ++attempt.current;
    fetch(PRICES_URL, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        const parsed = parsePriceFile(data);
        if (!parsed) throw new Error('bad price file');
        if (n !== attempt.current) return;
        fresh.current = true;
        setFile(parsed);
        setStatus('ok');
        write(parsed);
      })
      .catch(() => {
        if (n === attempt.current) setStatus('offline');
      });
  }, [write]);

  useEffect(load, [load]);

  const refresh = useCallback(() => {
    setStatus('loading');
    load();
  }, [load]);

  const value = useMemo(() => ({ file, status, refresh }), [file, status, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrices(): PricesContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrices must be used inside PricesProvider');
  return ctx;
}
