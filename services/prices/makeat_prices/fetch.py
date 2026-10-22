"""Download a chain's store list, then the newest PriceFull and PromoFull files
for the stores we care about, plus every hourly Price/Promo update published
after them.

    python -m makeat_prices.fetch --chain RAMI_LEVY --match פתח --out raw/

Stores are picked when a --match substring appears in their city, name or
address, plus every store the chain marks as online (StoreType 2 or 3).

Chains on the shared Cerberus server (url.retail.publishedprices.co.il) are read
directly over FTP-TLS. `il-supermarket-scraper` was tried first, but with
limit=1 it returned the oldest file on the server (a July file for Rami Levy's
online store), so we choose files by the timestamp in their names ourselves.
"""
from __future__ import annotations

import argparse
import io
import json
import re
import sys
from datetime import datetime
from ftplib import FTP_TLS
from pathlib import Path

from .feeds import file_timestamp, load_xml, parse_stores

CERBERUS_HOST = "url.retail.publishedprices.co.il"
CERBERUS_USERS = {"RAMI_LEVY": "RamiLevi", "OSHER_AD": "osherad"}
ONLINE_STORE_TYPES = {"2", "3"}
ONLINE_NAME_HINTS = ("אינטרנט", "online", "משלוח")


def file_kind(name: str) -> str | None:
    """'stores', 'pricefull', 'price', 'promofull' or 'promo'."""
    m = re.match(r"(stores|pricefull|price|promofull|promo)\d", name.lower())
    return m.group(1) if m else None


def file_store(name: str) -> str | None:
    """Store id in a feed file name: '...-001-032-2026...' or '...-039-2026...'."""
    m = re.search(r"-(\d{3,4})-\d{8}", name)
    return m.group(1).lstrip("0") or "0" if m else None


def newest(names: list[str], kind: str, store_id: str | None = None) -> str | None:
    matching = [
        n for n in names
        if file_kind(n) == kind and (store_id is None or file_store(n) == store_id) and file_timestamp(n)
    ]
    return max(matching, key=file_timestamp, default=None)


def updates_after(names: list[str], kind: str, store_id: str, after: datetime) -> list[str]:
    """Hourly delta files of `kind` ('price' or 'promo') published after `after`, oldest first."""
    matching = [
        n for n in names
        if file_kind(n) == kind and file_store(n) == store_id and (file_timestamp(n) or after) > after
    ]
    return sorted(matching, key=file_timestamp)


def is_online(store) -> bool:
    text = f"{store.name} {store.address or ''}".lower()
    return store.store_type in ONLINE_STORE_TYPES or any(h in text for h in ONLINE_NAME_HINTS)


def pick_stores(stores, matches: list[str], max_stores: int):
    """Every online store, then up to `max_stores` physical stores that match."""
    online = [s for s in stores if is_online(s)]
    local = [s for s in stores if not is_online(s) and any(m in f"{s.city or ''} {s.name} {s.address or ''}" for m in matches)]
    return online + local[:max_stores]


class Cerberus:
    def __init__(self, user: str):
        self.ftp = FTP_TLS(CERBERUS_HOST, user, "", timeout=120)
        self.ftp.trust_server_pasv_ipv4_address = True
        self.names = self.ftp.nlst()  # the server rejects MLSD

    def download(self, name: str, out: Path) -> Path:
        buf = io.BytesIO()
        self.ftp.retrbinary(f"RETR {name}", buf.write)
        path = out / name
        path.write_bytes(buf.getvalue())
        return path

    def close(self):
        self.ftp.close()


def run(chain: str, out: Path, matches: list[str], max_stores: int) -> int:
    if chain not in CERBERUS_USERS:
        print(f"{chain}: only Cerberus chains are supported so far ({', '.join(CERBERUS_USERS)})", file=sys.stderr)
        return 2
    out.mkdir(parents=True, exist_ok=True)
    server = Cerberus(CERBERUS_USERS[chain])
    try:
        stores_name = newest(server.names, "stores")
        if stores_name is None:
            print(f"{chain}: no store file on the server", file=sys.stderr)
            return 1
        stores = parse_stores(load_xml(server.download(stores_name, out).read_bytes()))
        (out / "stores.json").write_text(
            json.dumps([s.__dict__ for s in stores], ensure_ascii=False, indent=1), encoding="utf-8"
        )
        picked = pick_stores(stores, matches, max_stores)
        print(f"{chain}: {len(server.names)} files, {len(stores)} stores, picked "
              f"{[(s.store_id, s.name, s.city) for s in picked]}")
        for s in picked:
            for full, delta in (("pricefull", "price"), ("promofull", "promo")):
                name = newest(server.names, full, s.store_id)
                if name is None:
                    print(f"  store {s.store_id}: no {full} file")
                    continue
                server.download(name, out)
                deltas = updates_after(server.names, delta, s.store_id, file_timestamp(name))
                for d in deltas:
                    server.download(d, out)
                print(f"  store {s.store_id}: {name} + {len(deltas)} {delta} updates")
    finally:
        server.close()
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--chain", required=True, choices=sorted(CERBERUS_USERS))
    parser.add_argument("--match", action="append", default=[], help="substring of city/name/address")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--max-stores", type=int, default=8, help="physical stores; online stores are always added")
    args = parser.parse_args(argv)
    return run(args.chain, args.out / args.chain, args.match, args.max_stores)


if __name__ == "__main__":
    sys.exit(main())
