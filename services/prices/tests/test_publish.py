import json
import shutil
from datetime import datetime

from makeat_prices.publish import build, product_codes

from .test_feeds import FIXTURES


def raw_with_osher_ad(tmp_path):
    chain = tmp_path / "OSHER_AD"
    chain.mkdir()
    shutil.copy(FIXTURES / "osherad_pricefull.xml", chain / "PriceFull7290103152017-001-032-20261022-080014.xml")
    (chain / "stores.json").write_text(json.dumps([{"store_id": "32", "name": "קרית אונו", "city": "2620"}]), encoding="utf-8")
    return tmp_path


def test_keeps_only_mapped_products_with_names_and_times(tmp_path):
    raw = raw_with_osher_ad(tmp_path)
    doc, problems = build(raw, {"OSHER_AD": ["32"]}, {"7290119386383", "0000"}, datetime(2026, 10, 22, 12, 0))
    assert problems == []
    [store] = doc["stores"]
    assert store["name"] == "קרית אונו" and store["storeId"] == "32"
    assert store["publishedAt"] == "2026-10-22T08:00:14"
    assert store["prices"] == {"7290119386383": 19.9}


def test_reports_missing_and_stale_branches(tmp_path):
    raw = raw_with_osher_ad(tmp_path)
    doc, problems = build(raw, {"OSHER_AD": ["32", "10"], "RAMI_LEVY": ["34"]}, set(), datetime(2026, 10, 23, 9, 0))
    assert len(doc["stores"]) == 1
    assert any("OSHER_AD/32" in p and "older" in p for p in problems)
    assert any("OSHER_AD/10" in p for p in problems)
    assert any("RAMI_LEVY/34" in p for p in problems)


def test_product_codes_come_from_every_ingredient():
    products = {"products": {"a": [{"code": "1"}, {"code": "2"}], "b": [{"code": "3", "perKg": True}]}}
    assert product_codes(products) == {"1", "2", "3"}
