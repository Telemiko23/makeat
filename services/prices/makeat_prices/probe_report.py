"""Summarise feeds downloaded by `fetch` so a run's log shows what the chains publish.

    python -m makeat_prices.probe_report /tmp/raw

Prints, per chain: how fresh each file is, how often the chain publishes (from
the FTP listing), a sample-basket quote per store with and without the loyalty
club, and candidates for fresh produce, which has no shared barcode. Ends with
the Ministry of Economy's list of publishing chains.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from datetime import datetime
from decimal import Decimal
from ftplib import FTP_TLS
from pathlib import Path
from zoneinfo import ZoneInfo

from .basket import Line, quote
from .feeds import load_xml, parse_prices, parse_promotions

ISRAEL = ZoneInfo("Asia/Jerusalem")

# Packaged staples found with the same barcode in every probed store on 2026-10-22.
SAMPLE_BASKET = [
    ("7290004131074", 2, "Tnuva milk 3% 1L"),
    ("7290000041445", 2, "Tnuva cottage 5% 250g"),
    ("7290116932033", 1, "Tnuva butter 200g"),
    ("7290000211442", 1, "Sugat Persian rice 1kg"),
    ("7290000060880", 2, "Osem spaghetti 500g"),
    ("7290104066566", 1, "Achla tahini 500g"),
    ("7290000208428", 1, "Yachin whole chickpeas 550g"),
    ("7290002157953", 1, "Willi-Food tuna in canola oil"),
    ("7290000497112", 1, "Berman sliced bread 750g"),
    ("7290000176079", 1, "Elite Turkish coffee with cardamom"),
    ("7290002019794", 2, "Pri-Nir tomato sauce"),
    ("7290000176420", 1, "Strauss instant coffee 200g"),
]

FRESH = {
    "tomatoes": "עגבני",
    "cucumbers": "מלפפון",
    "potatoes": "תפוח אדמה",
    "onions": "בצל",
    "eggs": "ביצים",
    "chicken breast": "חזה עוף",
}

FTP_USERS = {"RAMI_LEVY": "RamiLevi", "OSHER_AD": "osherad"}


def ftp_listing(user: str) -> list[str]:
    """Every file name the chain has on the Cerberus FTP."""
    ftp = FTP_TLS("url.retail.publishedprices.co.il", user, "", timeout=120)
    ftp.trust_server_pasv_ipv4_address = True
    try:
        return [name for name, facts in ftp.mlsd(facts=["type"]) if facts.get("type") == "file"]
    finally:
        ftp.close()


def publishing_rhythm(user: str, store_ids: list[str]) -> None:
    try:
        files = ftp_listing(user)
    except Exception as error:  # noqa: BLE001 - report and carry on
        print(f"FTP listing failed: {error}")
        return
    print(f"FTP: {len(files)} files")
    for store_id in store_ids:
        mine = sorted(n for n in files if re.search(rf"-0*{int(store_id)}-\d{{8}}", n))
        kinds = Counter(re.match(r"[A-Za-z]+", n).group(0).lower() for n in mine)
        print(f"  store {store_id}: {dict(kinds)}")
        for kind in sorted(kinds):
            of_kind = [n for n in mine if n.lower().startswith(kind)]
            print(f"    {kind}: last {of_kind[-6:]}")


def main(raw: Path) -> int:
    now = datetime.now(ISRAEL).replace(tzinfo=None)
    print(f"Report time (Israel): {now:%Y-%m-%d %H:%M}")
    totals: dict[str, list[str]] = {}
    for chain_dir in sorted(p for p in raw.iterdir() if p.is_dir()):
        chain = chain_dir.name
        print(f"\n===== {chain} =====")
        prices, promos = {}, {}
        for f in sorted(chain_dir.glob("*.xml")):
            lower = f.name.lower()
            if lower.startswith("pricefull"):
                pf = parse_prices(load_xml(f.read_bytes()))
                prices[pf.store_id] = (f.name, pf)
            elif lower.startswith("promofull"):
                root = load_xml(f.read_bytes())
                promos[parse_prices(root).store_id] = (f.name, parse_promotions(root))

        for store_id, (name, pf) in sorted(prices.items()):
            print(
                f"PriceFull store {store_id} ({name}): {len(pf.items)} items, "
                f"{sum(p.is_weighted for p in pf.items.values())} weighted, newest price change {pf.latest_update}"
            )
        for store_id, (name, ps) in sorted(promos.items()):
            active = [p for p in ps if p.active_at(now)]
            print(
                f"PromoFull store {store_id} ({name}): {len(ps)} promos, {len(active)} active now; "
                f"club codes {dict(Counter(''.join(sorted(p.club_codes)) for p in active))}; "
                f"coupons {sum(p.is_coupon for p in active)}; min spend {sum(bool(p.min_purchase_amount) for p in active)}"
            )
            for p in [p for p in active if "1" in p.club_codes][:5]:
                print(f"  club promo {p.promotion_id} codes {sorted(p.club_codes)}: {p.description} ({len(p.items)} items)")

        if chain in FTP_USERS:
            publishing_rhythm(FTP_USERS[chain], sorted(prices))

        print(f"--- sample basket ({len(SAMPLE_BASKET)} lines) ---")
        lines = [Line(code, Decimal(qty)) for code, qty, _ in SAMPLE_BASKET]
        for store_id, (_, pf) in sorted(prices.items()):
            ps = promos.get(store_id, (None, []))[1]
            plain = quote(pf, ps, lines, at=now)
            member = quote(pf, ps, lines, at=now, club_member=True)
            totals[f"{chain}:{store_id}"] = [str(plain.items_total), str(member.items_total)]
            print(
                f"store {store_id}: {plain.items_total} (club member {member.items_total}); "
                f"missing {plain.missing}; data as of {plain.data_as_of}"
            )
            for ln in plain.lines:
                print(f"    {ln.item_code} {ln.name}: {ln.shelf_price} x {ln.quantity} = {ln.total}"
                      + (f" [promo: {ln.promotion_text}]" if ln.promotion_id else ""))
            for ln, plain_line in zip(member.lines, plain.lines):
                if ln.total != plain_line.total:
                    print(f"    club-only saving on {ln.item_code}: {ln.promotion_text} -> {ln.total}")

        print("--- fresh produce candidates (no shared barcode) ---")
        for store_id, (_, pf) in sorted(prices.items()):
            for label, word in FRESH.items():
                hits = [p for p in pf.items.values() if p.name.startswith(word) or (word in p.name and p.is_weighted)]
                hits.sort(key=lambda p: (not p.is_weighted, len(p.item_code), p.name))
                shown = [f"{p.item_code}|{p.name}|{p.price}{'/kg' if p.is_weighted else ''}" for p in hits[:4]]
                print(f"  store {store_id} {label}: {shown}")

    print("\n===== basket totals [everyone, club member] =====")
    print(json.dumps(totals, indent=1))
    print("\n===== gov.il chain list =====")
    gov_il_chains()
    return 0


def gov_il_chains() -> None:
    """Print the chain list from the Ministry of Economy's price-transparency page."""
    from il_supermarket_scarper.utils.connection import _fetch_gov_il_content_api

    try:
        data = _fetch_gov_il_content_api("cpfta_prices_regulations")
    except Exception as error:  # noqa: BLE001 - report and carry on
        print(f"gov.il page failed: {error}")
        return
    strings = []

    def walk(node):
        if isinstance(node, dict):
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)
        elif isinstance(node, str):
            strings.append(node)

    walk(data)
    plain = re.sub(r"<[^>]+>", "\n", "\n".join(strings))
    lines = [ln.strip() for ln in plain.splitlines() if ln.strip()]
    haviv = [ln for ln in lines if "חביב" in ln or "haviv" in ln.lower() or "habib" in ln.lower()]
    print(f"gov.il page: {len(lines)} text lines; mentions of Haviv: {haviv}")
    for ln in lines:
        if len(ln) < 120:
            print(f"  gov.il | {ln}")


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1])))
