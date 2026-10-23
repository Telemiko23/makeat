/**
 * Internal alpha builds show draft recipes so the team can test the journey
 * before nutrition review (ADR 0011). Must be false from the closed beta on;
 * the v0.2 release checklist checks it.
 */
export const SHOW_DRAFT_RECIPES = true;

/** What the recipe gate lets through in this build. */
export const GATE = { includeDrafts: SHOW_DRAFT_RECIPES };

/** The hourly shelf-price file (decision 0012). */
export const PRICES_URL = 'https://raw.githubusercontent.com/Telemiko23/makeat/prices-data/prices.json';
