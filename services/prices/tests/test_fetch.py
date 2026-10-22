from datetime import datetime

from makeat_prices.fetch import file_kind, file_store, newest, updates_after

NAMES = [
    "Stores7290058140886-000-20261020-050500.xml",
    "pricefull7290058140886-039-202607150513.gz",
    "pricefull7290058140886-039-202610220516.gz",
    "PriceFull7290103152017-001-032-20261022-080014.gz",
    "PriceFull7290103152017-001-032-20261022-140501.gz",
    "Price7290103152017-001-032-20261022-110003.gz",
    "Price7290103152017-001-032-20261022-150014.gz",
    "Price7290103152017-001-032-20261022-190002.gz",
    "Price7290103152017-001-010-20261022-190002.gz",
]


def test_kind_and_store_from_name():
    assert file_kind(NAMES[0]) == "stores"
    assert (file_kind(NAMES[1]), file_store(NAMES[1])) == ("pricefull", "39")
    assert (file_kind(NAMES[5]), file_store(NAMES[5])) == ("price", "32")


def test_newest_is_by_timestamp_not_listing_order():
    assert newest(NAMES, "pricefull", "39") == "pricefull7290058140886-039-202610220516.gz"
    assert newest(NAMES, "pricefull", "32") == "PriceFull7290103152017-001-032-20261022-140501.gz"
    assert newest(NAMES, "stores") == NAMES[0]
    assert newest(NAMES, "promofull", "32") is None


def test_updates_after_full_file_only_for_that_store():
    assert updates_after(NAMES, "price", "32", datetime(2026, 10, 22, 14, 5, 1)) == [
        "Price7290103152017-001-032-20261022-150014.gz",
        "Price7290103152017-001-032-20261022-190002.gz",
    ]
