import json
import shutil
from datetime import datetime

from makeat_prices.publish import build, product_codes

from .test_feeds import FIXTURES


def raw_with_osher_ad(tmp_path):
    chain = tmp_path / "OSHER_AD"
    chain.mkdir(parents=True)
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
    # The stale branch is left out, so the app never ranks old prices with fresh ones.
    assert doc["stores"] == []
    assert any("OSHER_AD/32" in p and "older" in p for p in problems)
    assert any("OSHER_AD/10" in p for p in problems)
    assert any("RAMI_LEVY/34" in p for p in problems)


def test_product_codes_come_from_every_ingredient():
    products = {"products": {"a": [{"code": "1"}, {"code": "2"}], "b": [{"code": "3", "perKg": True}]}}
    assert product_codes(products) == {"1", "2", "3"}


def test_a_branch_missing_from_the_store_list_is_reported(tmp_path):
    raw = raw_with_osher_ad(tmp_path)
    (raw / "OSHER_AD" / "stores.json").write_text("[]", encoding="utf-8")
    doc, problems = build(raw, {"OSHER_AD": ["32"]}, set(), datetime(2026, 10, 22, 12, 0))
    assert len(doc["stores"]) == 1
    assert any("not in the chain's store list" in p for p in problems)


def test_no_fresh_branch_writes_no_file(tmp_path):
    from makeat_prices.publish import main

    raw = raw_with_osher_ad(tmp_path / "raw")
    branches = tmp_path / "branches.json"
    branches.write_text(json.dumps({"branches": {"RAMI_LEVY": ["34"]}}), encoding="utf-8")
    products = tmp_path / "products.json"
    products.write_text(json.dumps({"products": {}}), encoding="utf-8")
    out = tmp_path / "prices.json"
    assert main(["--raw", str(raw), "--branches", str(branches), "--products", str(products), "--out", str(out)]) == 1
    assert not out.exists()
