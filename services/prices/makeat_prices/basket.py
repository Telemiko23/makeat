"""Price a basket at one store from its PriceFull and PromoFull files.

Promotions are applied conservatively: a quote may miss a discount, but it never
promises one the shopper will not get at checkout.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from .feeds import CLUB_EVERYONE, CLUB_MEMBERS, PriceFile, Promotion, PromoTerms

CENT = Decimal("0.01")


@dataclass(frozen=True)
class Line:
    item_code: str
    quantity: Decimal  # units, or kilograms for weighted items


@dataclass(frozen=True)
class DeliveryTerms:
    fee: Decimal
    min_order: Decimal | None = None
    free_over: Decimal | None = None
    checked_on: str | None = None  # when a person last confirmed these terms


@dataclass(frozen=True)
class QuotedLine:
    item_code: str
    name: str
    quantity: Decimal
    shelf_price: Decimal
    total: Decimal
    promotion_id: str | None = None
    promotion_text: str | None = None


@dataclass
class Quote:
    chain_id: str | None
    store_id: str | None
    lines: list[QuotedLine] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    items_total: Decimal = Decimal("0")
    delivery_fee: Decimal | None = None
    below_min_order: bool = False
    total: Decimal = Decimal("0")
    data_as_of: datetime | None = None  # file publication time, else newest price change


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def promotion_applies(promo: Promotion, at: datetime, club_member: bool) -> bool:
    """Whether a promotion can be offered to this shopper at this time.

    Anything that also needs a specific credit card (ClubId 2) or another
    condition (3) is never assumed, since we do not know how the shopper pays.
    Coupon promotions, and those that need a minimum spend, are skipped too.
    """
    if promo.is_coupon or promo.min_purchase_amount or not promo.active_at(at):
        return False
    allowed = {CLUB_EVERYONE} | ({CLUB_MEMBERS} if club_member else set())
    return promo.club_codes <= allowed


# RewardType values whose DiscountedPrice / DiscountRate we have checked against
# shelf prices in real files. Others (e.g. buy X get Y) are not credited yet.
KNOWN_REWARD_TYPES = {None, "1", "3"}


def promo_line_total(terms: PromoTerms, shelf_price: Decimal, quantity: Decimal) -> Decimal | None:
    """Line total under a promotion, or None when it does not lower this line.

    Only quantities of this one item count toward MinQty; mixing different items
    of the same promotion is not credited yet. Units beyond MaxQty pay shelf price.
    """
    if terms.reward_type not in KNOWN_REWARD_TYPES:
        return None
    min_qty = terms.min_qty or Decimal("1")
    if quantity < min_qty:
        return None
    eligible = min(quantity, terms.max_qty) if terms.max_qty else quantity
    if terms.discounted_price is not None and terms.discounted_price > 0:
        bundles = int(eligible // min_qty)
        total = bundles * terms.discounted_price + (quantity - bundles * min_qty) * shelf_price
    elif terms.discount_rate is not None and 0 < terms.discount_rate < 100:
        total = eligible * shelf_price * (1 - terms.discount_rate / 100) + (quantity - eligible) * shelf_price
    else:
        return None
    return total if total < quantity * shelf_price else None


def quote(
    prices: PriceFile,
    promotions: list[Promotion],
    lines: list[Line],
    *,
    at: datetime,
    club_member: bool = False,
    delivery: DeliveryTerms | None = None,
) -> Quote:
    by_item: dict[str, list[Promotion]] = {}
    for promo in promotions:
        if promotion_applies(promo, at, club_member):
            for code in promo.items:
                by_item.setdefault(code, []).append(promo)

    result = Quote(chain_id=prices.chain_id, store_id=prices.store_id, data_as_of=prices.published_at or prices.latest_update)
    for line in lines:
        item = prices.items.get(line.item_code)
        if item is None:
            result.missing.append(line.item_code)
            continue
        best_total, best_promo = line.quantity * item.price, None
        for promo in by_item.get(line.item_code, []):
            total = promo_line_total(promo.items[line.item_code], item.price, line.quantity)
            if total is not None and total < best_total:
                best_total, best_promo = total, promo
        result.lines.append(
            QuotedLine(
                item_code=item.item_code,
                name=item.name,
                quantity=line.quantity,
                shelf_price=item.price,
                total=_money(best_total),
                promotion_id=best_promo.promotion_id if best_promo else None,
                promotion_text=best_promo.description if best_promo else None,
            )
        )

    result.items_total = sum((ln.total for ln in result.lines), Decimal("0"))
    result.total = result.items_total
    if delivery is not None:
        free = delivery.free_over is not None and result.items_total >= delivery.free_over
        result.delivery_fee = Decimal("0") if free else delivery.fee
        result.below_min_order = delivery.min_order is not None and result.items_total < delivery.min_order
        result.total += result.delivery_fee
    return result
