"""Parse the Stores, PriceFull and PromoFull files published under the
Food Price Transparency law.

Chains share the law's field names but not their casing or nesting, so every
lookup here is by lower-cased tag name, wherever the element sits.
"""
from __future__ import annotations

import gzip
import io
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, InvalidOperation
from xml.etree import ElementTree as ET

# Promotion.ClubId values defined by the law.
CLUB_EVERYONE = "0"
CLUB_MEMBERS = "1"
CLUB_CREDIT_CARD = "2"
CLUB_OTHER = "3"


def load_xml(data: bytes) -> ET.Element:
    """Parse a feed file that may be gzipped, zipped, or plain XML."""
    if data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    elif data[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            data = zf.read(zf.namelist()[0])
    return ET.fromstring(data)


def _tag(el: ET.Element) -> str:
    return el.tag.rsplit("}", 1)[-1].lower()


def _iter(root: ET.Element, name: str):
    return (el for el in root.iter() if _tag(el) == name)


def _child_text(el: ET.Element, *names: str) -> str | None:
    """Text of the first direct child whose tag matches one of `names`."""
    wanted = {n.lower() for n in names}
    for child in el:
        if _tag(child) in wanted:
            text = (child.text or "").strip()
            return text or None
    return None


def _first_text(root: ET.Element, *names: str) -> str | None:
    wanted = {n.lower() for n in names}
    for el in root.iter():
        if _tag(el) in wanted and (el.text or "").strip():
            return el.text.strip()
    return None


def _decimal(value: str | None) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(value.replace(",", ""))
    except InvalidOperation:
        return None


def _datetime(value: str | None) -> datetime | None:
    """Feed timestamps come as '2026-10-22 13:05:00', '2026-10-22T13:05:00' or '20261022130500'."""
    if not value:
        return None
    value = value.strip().replace("T", " ")
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%Y%m%d%H%M%S", "%Y%m%d%H%M", "%Y%m%d"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(value.split(".")[0])
    except ValueError:
        return None


def _join_date_hour(date: str | None, hour: str | None) -> datetime | None:
    if date and hour and " " not in date and "T" not in date:
        return _datetime(f"{date} {hour}")
    return _datetime(date)


def _strip_zeros(code: str | None) -> str | None:
    return code.lstrip("0") or "0" if code else code


@dataclass(frozen=True)
class Store:
    chain_id: str | None
    store_id: str
    name: str
    address: str | None
    city: str | None
    store_type: str | None  # law: 1 physical, 2 online, 3 both


@dataclass(frozen=True)
class Price:
    item_code: str
    name: str
    manufacturer: str | None
    price: Decimal
    unit_price: Decimal | None
    unit_of_measure: str | None
    quantity: Decimal | None
    is_weighted: bool
    updated_at: datetime | None


@dataclass
class PriceFile:
    chain_id: str | None
    store_id: str | None
    items: dict[str, Price] = field(default_factory=dict)

    @property
    def latest_update(self) -> datetime | None:
        stamps = [p.updated_at for p in self.items.values() if p.updated_at]
        return max(stamps) if stamps else None


@dataclass(frozen=True)
class Promotion:
    promotion_id: str
    description: str
    starts_at: datetime | None
    ends_at: datetime | None
    reward_type: str | None
    min_qty: Decimal | None
    max_qty: Decimal | None
    discounted_price: Decimal | None
    discount_rate: Decimal | None
    min_purchase_amount: Decimal | None
    club_ids: frozenset[str]
    is_coupon: bool
    item_codes: frozenset[str]
    gift_codes: frozenset[str]

    def active_at(self, at: datetime) -> bool:
        return (self.starts_at is None or self.starts_at <= at) and (self.ends_at is None or at <= self.ends_at)


def parse_stores(root: ET.Element) -> list[Store]:
    chain_id = _first_text(root, "ChainId", "ChainID")
    stores = []
    for el in _iter(root, "store"):
        store_id = _child_text(el, "StoreId", "StoreID")
        if store_id is None:
            continue
        stores.append(
            Store(
                chain_id=_child_text(el, "ChainId", "ChainID") or chain_id,
                store_id=_strip_zeros(store_id),
                name=_child_text(el, "StoreName") or "",
                address=_child_text(el, "Address"),
                city=_child_text(el, "City"),
                store_type=_child_text(el, "StoreType"),
            )
        )
    return stores


def parse_prices(root: ET.Element) -> PriceFile:
    result = PriceFile(
        chain_id=_first_text(root, "ChainId", "ChainID"),
        store_id=_strip_zeros(_first_text(root, "StoreId", "StoreID")),
    )
    for el in _iter(root, "item"):
        code = _child_text(el, "ItemCode")
        price = _decimal(_child_text(el, "ItemPrice"))
        if code is None or price is None:
            continue
        result.items[code] = Price(
            item_code=code,
            name=_child_text(el, "ItemName", "ItemNm") or "",
            manufacturer=_child_text(el, "ManufacturerName", "ManufactureName"),
            price=price,
            unit_price=_decimal(_child_text(el, "UnitOfMeasurePrice")),
            unit_of_measure=_child_text(el, "UnitQty", "UnitOfMeasure"),
            quantity=_decimal(_child_text(el, "Quantity")),
            is_weighted=_child_text(el, "bIsWeighted", "BisWeighted") == "1",
            updated_at=_datetime(_child_text(el, "PriceUpdateDate")),
        )
    return result


def parse_promotions(root: ET.Element) -> list[Promotion]:
    promos = []
    for el in _iter(root, "promotion"):
        promo_id = _child_text(el, "PromotionId", "PromotionID")
        if promo_id is None:
            continue
        items, gifts = set(), set()
        for item in _iter(el, "item"):
            code = _child_text(item, "ItemCode")
            if code:
                (gifts if _child_text(item, "IsGiftItem") == "1" else items).add(code)
        clubs = {(c.text or "").strip() for c in _iter(el, "clubid") if (c.text or "").strip()}
        promos.append(
            Promotion(
                promotion_id=promo_id,
                description=_child_text(el, "PromotionDescription") or "",
                starts_at=_join_date_hour(_child_text(el, "PromotionStartDate"), _child_text(el, "PromotionStartHour")),
                ends_at=_join_date_hour(_child_text(el, "PromotionEndDate"), _child_text(el, "PromotionEndHour")),
                reward_type=_child_text(el, "RewardType"),
                min_qty=_decimal(_child_text(el, "MinQty")),
                max_qty=_decimal(_child_text(el, "MaxQty")),
                discounted_price=_decimal(_child_text(el, "DiscountedPrice")),
                discount_rate=_decimal(_child_text(el, "DiscountRate")),
                min_purchase_amount=_decimal(_child_text(el, "MinPurchaseAmnt", "MinPurchaseAmount")),
                club_ids=frozenset(clubs or {CLUB_EVERYONE}),
                is_coupon=_child_text(el, "AdditionalIsCoupon") == "1",
                item_codes=frozenset(items),
                gift_codes=frozenset(gifts),
            )
        )
    return promos
