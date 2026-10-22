import shutil
from datetime import datetime
from decimal import Decimal

from makeat_prices.snapshot import store_ids, store_prices, store_promotions

from .test_feeds import FIXTURES

UPDATE = """<Root><ChainID>7290103152017</ChainID><StoreID>032</StoreID><Items>
<Item><PriceUpdateTime>2026-10-22T12:10:00.000</PriceUpdateTime><ItemCode>7290004131074</ItemCode>
<ItemName>חלב 3% תנובה 1 ליטר</ItemName><bIsWeighted>0</bIsWeighted><ItemPrice>6.90</ItemPrice></Item>
</Items></Root>"""


def test_hourly_updates_apply_on_top_of_newest_full_file(tmp_path):
    shutil.copy(FIXTURES / "osherad_pricefull.xml", tmp_path / "PriceFull7290103152017-001-032-20261022-080014.xml")
    shutil.copy(FIXTURES / "osherad_promofull.xml", tmp_path / "PromoFull7290103152017-001-032-20261022-080051.xml")
    (tmp_path / "Price7290103152017-001-032-20261022-070000.xml").write_text(UPDATE.replace("6.90", "1.00"), encoding="utf-8")
    (tmp_path / "Price7290103152017-001-032-20261022-130002.xml").write_text(UPDATE, encoding="utf-8")

    assert store_ids(tmp_path) == ["32"]
    prices = store_prices(tmp_path, "32")
    assert prices.items["7290004131074"].price == Decimal("6.90")  # the 07:00 update predates the full file
    assert prices.items["7290119386383"].price == Decimal("19.90")
    assert prices.published_at == datetime(2026, 10, 22, 13, 0, 2)
    assert len(store_promotions(tmp_path, "32")) == 6
