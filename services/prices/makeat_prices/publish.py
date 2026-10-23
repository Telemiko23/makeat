"""Build the hourly price file the app reads (decision 0012).

    python -m makeat_prices.publish --raw /tmp/raw --products ../../content/products.json --out /tmp/prices.json
    python -m makeat_prices.publish --fetch ...   # download the configured branches first

For every configured branch (data/branches.json) it rebuilds the current shelf
prices (newest full file plus later updates) and keeps only the products in
content/products.json. A branch with no data, or whose newest file is older
than MAX_AGE, is left out of the file and makes the run exit non-zero, so a
stale feed shows as a failed run while the app still gets the fresh branches.
With no fresh branch at all no file is written, so the last good one stays
published.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from .snapshot import store_prices

ISRAEL = ZoneInfo("Asia/Jerusalem")
MAX_AGE = timedelta(hours=12)
HERE = Path(__file__).resolve().parent.parent


def product_codes(products: dict) -> set[str]:
    return {p["code"] for options in products["products"].values() for p in options}


def store_names(chain_dir: Path) -> dict[str, dict]:
    path = chain_dir / "stores.json"
    if not path.exists():
        return {}
    return {s["store_id"]: s for s in json.loads(path.read_text(encoding="utf-8"))}


def build(raw: Path, branches: dict[str, list[str]], codes: set[str], now: datetime) -> tuple[dict, list[str]]:
    """The price file and a list of problems (missing or stale branches)."""
    stores, problems = [], []
    for chain, ids in branches.items():
        chain_dir = raw / chain
        names = store_names(chain_dir)
        for store_id in ids:
            prices = store_prices(chain_dir, store_id) if chain_dir.exists() else None
            if prices is None:
                problems.append(f"{chain}/{store_id}: no price file")
                continue
            published = prices.published_at
            if published is None or now - published > MAX_AGE:
                problems.append(f"{chain}/{store_id}: newest file is from {published}, older than {MAX_AGE}")
                continue
            info = names.get(store_id, {})
            if not info.get("name"):
                problems.append(f"{chain}/{store_id}: not in the chain's store list")
            stores.append({
                "chain": chain,
                "storeId": store_id,
                "name": info.get("name", ""),
                "city": info.get("city"),
                # Israel local time, as published in the file name.
                "publishedAt": published.isoformat() if published else None,
                "prices": {code: float(p.price) for code, p in sorted(prices.items.items()) if code in codes},
            })
    doc = {"version": 1, "generatedAt": now.isoformat(timespec="seconds"), "stores": stores}
    return doc, problems


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--raw", type=Path, required=True)
    parser.add_argument("--products", type=Path, default=HERE.parent.parent / "content" / "products.json")
    parser.add_argument("--branches", type=Path, default=HERE / "data" / "branches.json")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--fetch", action="store_true", help="download the configured branches into --raw first")
    args = parser.parse_args(argv)

    branches = json.loads(args.branches.read_text(encoding="utf-8"))["branches"]
    if args.fetch:
        from .fetch import run

        for chain, ids in branches.items():
            # One chain's server failing must not cost the other chains their prices.
            try:
                failed = run(chain, args.raw / chain, [], 0, ids, promotions=False) != 0
            except Exception as e:  # noqa: BLE001 - network and FTP errors of every kind
                print(f"{chain}: {e!r}", file=sys.stderr)
                failed = True
            if failed:
                print(f"{chain}: download failed", file=sys.stderr)

    codes = product_codes(json.loads(args.products.read_text(encoding="utf-8")))
    doc, problems = build(args.raw, branches, codes, datetime.now(ISRAEL).replace(tzinfo=None))
    if doc["stores"]:
        args.out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    else:
        problems.append("no fresh branch; no file written")
    for s in doc["stores"]:
        print(f"{s['chain']}/{s['storeId']} {s['name']}: {len(s['prices'])} of {len(codes)} products, data from {s['publishedAt']}")
    for p in problems:
        print(f"PROBLEM {p}", file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
