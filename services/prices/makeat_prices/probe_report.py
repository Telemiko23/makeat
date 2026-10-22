"""Summarise feeds downloaded by `fetch` so a run's log shows what the chains publish.

    python -m makeat_prices.probe_report /tmp/raw
"""
from __future__ import annotations

import ftplib
import json
import re
import sys
from collections import Counter
from pathlib import Path

from .feeds import load_xml, parse_prices, parse_promotions, parse_stores

STAPLES = {
    "milk 3% 1L": ["חלב", "3%"],
    "eggs L 12": ["ביצים"],
    "cottage 5%": ["קוטג"],
    "white cheese 5%": ["גבינה לבנה"],
    "yellow cheese": ["עמק"],
    "butter": ["חמאה"],
    "rice": ["אורז"],
    "pasta spaghetti": ["ספגטי"],
    "canola oil": ["שמן קנולה"],
    "sugar 1kg": ["סוכר"],
    "white flour": ["קמח"],
    "tahini": ["טחינה"],
    "hummus": ["חומוס"],
    "tuna": ["טונה"],
    "bamba": ["במבה"],
    "tomatoes": ["עגבני"],
    "cucumbers": ["מלפפון"],
    "potatoes": ["תפוח אדמה", "תפוא"],
    "onions": ["בצל"],
    "chicken breast": ["חזה עוף"],
    "bread": ["לחם"],
    "coffee": ["קפה"],
}


def _ftp_listing(user: str, store_ids: list[str]) -> list[str]:
    """File names on the Cerberus FTP for the given stores, to see how often each file is refreshed."""
    try:
        with ftplib.FTP("url.retail.publishedprices.co.il", timeout=60) as ftp:
            ftp.login(user, "")
            names = ftp.nlst()
    except Exception as error:  # noqa: BLE001 - report and carry on
        return [f"FTP listing failed: {error}"]
    wanted = [rf"-{int(s):03d}-" for s in store_ids]
    return sorted(n for n in names if any(re.search(w, n) for w in wanted))


def main(raw: Path) -> int:
    all_prices = {}
    for chain_dir in sorted(p for p in raw.iterdir() if p.is_dir()):
        chain = chain_dir.name
        print(f"\n===== {chain} =====")
        files = sorted(chain_dir.glob("*.xml"))
        for kind in ("store", "pricefull", "promofull"):
            sample = next((f for f in files if f.name.lower().startswith(kind)), None)
            if sample:
                head = sample.read_text(encoding="utf-8", errors="replace")[:1800]
                print(f"--- head of {sample.name}\n{head}\n---")

        stores_file = next((f for f in files if f.name.lower().startswith("store")), None)
        if stores_file:
            stores = parse_stores(load_xml(stores_file.read_bytes()))
            print(f"stores: {len(stores)}; StoreType counts {Counter(s.store_type for s in stores)}")
            for s in stores:
                print(f"  store {s.store_id} | {s.name} | {s.address} | city={s.city} | type={s.store_type}")

        prices = {}
        for f in files:
            if f.name.lower().startswith("pricefull"):
                pf = parse_prices(load_xml(f.read_bytes()))
                prices[pf.store_id] = pf
                stamps = sorted(p.updated_at for p in pf.items.values() if p.updated_at)
                weighted = sum(p.is_weighted for p in pf.items.values())
                print(
                    f"PriceFull {f.name}: store {pf.store_id}, {len(pf.items)} items ({weighted} weighted), "
                    f"PriceUpdateDate {stamps[0] if stamps else None} .. {stamps[-1] if stamps else None}"
                )
            elif f.name.lower().startswith("promofull"):
                promos = parse_promotions(load_xml(f.read_bytes()))
                print(
                    f"PromoFull {f.name}: {len(promos)} promos; ClubId {Counter(c for p in promos for c in p.club_ids)}; "
                    f"RewardType {Counter(p.reward_type for p in promos)}; coupons {sum(p.is_coupon for p in promos)}; "
                    f"min purchase {sum(bool(p.min_purchase_amount) for p in promos)}"
                )
                store_prices = next(iter(prices.values()), None)
                shown = 0
                for p in promos:
                    if len(p.item_codes) == 1 and shown < 12:
                        code = next(iter(p.item_codes))
                        base = store_prices.items.get(code) if store_prices else None
                        print(
                            f"  promo {p.promotion_id} club={sorted(p.club_ids)} '{p.description}' min={p.min_qty} "
                            f"max={p.max_qty} disc_price={p.discounted_price} rate={p.discount_rate} "
                            f"reward={p.reward_type} {p.starts_at}..{p.ends_at} item={code} "
                            f"shelf={base.price if base else '?'}"
                        )
                        shown += 1

        user = {"RAMI_LEVY": "RamiLevi", "OSHER_AD": "osherad"}.get(chain)
        if user and prices:
            print("FTP files for these stores:")
            for name in _ftp_listing(user, list(prices)):
                print(f"  {name}")
        all_prices.update({f"{chain}:{k}": v for k, v in prices.items()})

    print(f"\n===== staples present in every store ({', '.join(all_prices)}) =====")
    for label, words in STAPLES.items():
        common = None
        for pf in all_prices.values():
            codes = {c for c, p in pf.items.items() if all(w in p.name for w in words[:1]) and
                     all(w in p.name for w in words[1:2])}
            common = codes if common is None else common & codes
        rows = []
        for code in sorted(common or []):
            row = {k: str(pf.items[code].price) for k, pf in all_prices.items()}
            any_item = next(iter(all_prices.values())).items[code]
            rows.append((code, any_item.name, any_item.manufacturer, any_item.is_weighted, row))
        print(f"{label}: {len(rows)} common")
        for r in rows[:8]:
            print(f"  {json.dumps(r, ensure_ascii=False)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1])))
