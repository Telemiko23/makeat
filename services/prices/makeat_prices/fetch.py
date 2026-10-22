"""Download a chain's store list, then the latest PriceFull and PromoFull files
for the stores we care about, using `il-supermarket-scraper`.

    python -m makeat_prices.fetch --chain RAMI_LEVY --match פתח --out raw/

Stores are picked when a --match substring appears in their city, name or
address, plus every store the chain marks as online (StoreType 2 or 3).
Writes the downloaded files and a `stores.json` listing every store.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from .feeds import load_xml, parse_stores

ONLINE_STORE_TYPES = {"2", "3"}
ONLINE_NAME_HINTS = ("אינטרנט", "online", "משלוח")


async def _download(chain: str, out: Path, files_type: str, store_id: int | None = None) -> list[Path]:
    from il_supermarket_scarper import ScraperFactory
    from il_supermarket_scarper.utils import DiskFileOutput

    before = set(out.glob("*"))
    scraper = ScraperFactory.get(chain)(file_output=DiskFileOutput(storage_path=str(out)))
    async for result in scraper.scrape(files_types=[files_type], store_id=store_id, limit=1):
        if getattr(result, "error", None):
            print(f"  {chain} {files_type} store={store_id}: {result.error}", file=sys.stderr)
    return sorted(set(out.glob("*")) - before)


def _is_online(store) -> bool:
    text = f"{store.name} {store.address or ''}".lower()
    return store.store_type in ONLINE_STORE_TYPES or any(h in text for h in ONLINE_NAME_HINTS)


def pick_stores(stores, matches: list[str]):
    picked = []
    for s in stores:
        text = f"{s.city or ''} {s.name} {s.address or ''}"
        if _is_online(s) or any(m in text for m in matches):
            picked.append(s)
    return picked


async def run(chain: str, out: Path, matches: list[str], max_stores: int) -> int:
    out.mkdir(parents=True, exist_ok=True)
    store_files = await _download(chain, out, "STORE_FILE")
    if not store_files:
        print(f"{chain}: no store file downloaded", file=sys.stderr)
        return 1
    stores = parse_stores(load_xml(store_files[-1].read_bytes()))
    (out / "stores.json").write_text(
        json.dumps([s.__dict__ for s in stores], ensure_ascii=False, indent=1), encoding="utf-8"
    )
    picked = pick_stores(stores, matches)[:max_stores]
    print(f"{chain}: {len(stores)} stores, picked {[(s.store_id, s.name, s.city) for s in picked]}")
    for s in picked:
        for files_type in ("PRICE_FULL_FILE", "PROMO_FULL_FILE"):
            got = await _download(chain, out, files_type, store_id=int(s.store_id))
            print(f"  store {s.store_id} {files_type}: {[p.name for p in got] or 'none'}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--chain", required=True, help="ScraperFactory name, e.g. RAMI_LEVY")
    parser.add_argument("--match", action="append", default=[], help="substring of city/name/address")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--max-stores", type=int, default=8)
    args = parser.parse_args(argv)
    return asyncio.run(run(args.chain, args.out / args.chain, args.match, args.max_stores))


if __name__ == "__main__":
    sys.exit(main())
