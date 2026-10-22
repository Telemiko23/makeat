# Price feeds probe: Rami Levy, Osher Ad, Haviv

- Date: 2026-10-22 (report run 23:21 Israel time)
- Owner: price-data
- Code: [services/prices](../../services/prices/README.md), workflow `Prices` (job `probe`)

Goal: prove the price pipeline on Liran's own chains before building ingestion
(decision [0002](../decisions/0002-price-data-source.md)).

## Summary

| | Rami Levy | Osher Ad | Haviv |
|---|---|---|---|
| Publishes law feeds | Yes (Cerberus FTP, user `RamiLevi`) | Yes (Cerberus FTP, user `osherad`) | **No.** Not on the Ministry of Economy list (page updated 12.08.2026) |
| Reachable outside Israel | Yes (GitHub runner) | Yes (GitHub runner) | n/a |
| Online store in feeds | Yes, store 39 "מרלוג אינטרנט" | **No.** All 24 stores are physical | n/a |
| Full files | Physical stores every 6 h, store 34 twice a day, online store daily 05:16 | Every 3 h (08:00, 11:05, 14:05) | n/a |
| Hourly updates | Yes (`Price`/`Promo` files) | Yes | n/a |
| Delivery fee | 35.90 (since May 2026), no free threshold | No online delivery service found | n/a |
| Minimum order | Not published on the page read | n/a | n/a |
| Club promos in feeds | Yes, 20-24 per store, plus card-only ones | None (all ClubId 0) | n/a |

## Stores mapped

| Chain | Store id | Name | City code |
|---|---|---|---|
| Rami Levy | 34 | פתח תקווה, הסיבים 37 (large store, ~14.5k items) | 7900 |
| Rami Levy | 724, 725, 726 | Petah Tikva neighbourhood stores (Avenat mall, Stampfer, Rothschild; ~4-5k items) | 7900 |
| Rami Levy | 712 | מנחם בגין, Givat Shmuel | 681 |
| Rami Levy | 39 | Online fulfilment centre (StoreType 2) | 6100 |
| Osher Ad | 32 | קרית אונו, שמירה אימבר גדיש 9 | 2620 |
| Osher Ad | 10 | פתח תקווה - סגולה | 7900 |

Store files give the city as a CBS locality code, not a name; we need the CBS
code table to show city names.

## Sample basket

Twelve packaged staples that carry the same barcode in every probed store:
milk 3% 1L x2, cottage 5% x2, butter, Persian rice 1kg, spaghetti 500g x2,
tahini 500g, chickpeas, tuna, sliced bread, Turkish coffee, tomato sauce x2,
instant coffee. Prices after promotions open to everyone; no club promotion
touched this basket.

| Store | Items | Delivery | Total |
|---|---|---|---|
| Osher Ad 10 (Petah Tikva) | 137.50 | no delivery | 137.50 in store |
| Osher Ad 32 (Kiryat Ono) | 137.70 | no delivery | 137.70 in store |
| Rami Levy 34 (Petah Tikva, large) | 138.90 | in store | 138.90 in store |
| **Rami Levy online (39)** | **140.10** | **35.90** | **176.00 delivered** |
| Rami Levy 712/724/725/726 (neighbourhood) | 162.68 | in store | 162.68 in store |

Takeaways:
- Osher Ad and the large Rami Levy are within 1%. Rami Levy online is about 1%
  above its large store before the delivery fee; the fee is a quarter of a
  small basket.
- Rami Levy's neighbourhood stores are about 17% dearer than its large store.
  "Rami Levy" is not one price; quotes must be per store.

## Freshness

- Files carry no timestamp in the body; the publication time is in the file
  name (`...-20261022-140501.gz`). Quotes now carry that time.
- Rebuilding a store = newest full file + every hourly update after it. With
  that, Osher Ad data was 4-6 h old and Rami Levy 2-6 h old at 23:21, i.e. the
  last updates of the trading day.
- "Fresher than everyone" is achievable: pull hourly, apply the updates, and
  show the file time on every quote.

## Promotions

- `DiscountedPrice` is the price of `MinQty` units together ("2 for 20" =
  MinQty 2, DiscountedPrice 20), confirmed against shelf prices in both chains.
- Rami Levy writes `ClubId` as expressions, e.g.
  `((1=מועדון שיווק השקמה|1=מועדון לקוחות אשראי))&(3=תווי זיכוי מימוש)`. We keep
  every law code mentioned: code 1 alone = club members; anything with 2 (credit
  card) or 3 (other) is never assumed, since we do not know how the user pays.
- Rami Levy also publishes coupon promotions (232-333 per store) and promotions
  with a minimum spend (6-109 per store); both are skipped for now.
- Mixed-item deals ("any 2 of these") are credited only when the user buys the
  minimum of one item. Quotes may miss a saving, never invent one.

## Product matching

- Packaged goods match by barcode across chains.
- Fresh produce does not: Osher Ad uses `7290009000122` for tomatoes, Rami
  Levy stores `7290000000100`, Rami Levy online `100`. Rami Levy's internal
  codes are the same number with and without the `7290000000` prefix, so that
  part is a normalisation rule. Across chains, produce needs a small curated
  map (tomatoes, cucumbers, potatoes, onions, ...).
- Eggs and chicken come in several brands and sizes; they need the same
  curated "equivalent product" rule.

## Tooling notes

- `il-supermarket-scraper` 1.0.8: with `limit=1` it returned the *oldest*
  file on the server (a July file for Rami Levy's online store). We now list
  the Cerberus FTP ourselves (FTP-TLS, `NLST`; the server rejects `MLSD`) and
  pick files by name timestamp. The library is still used to read the gov.il
  chain list.
- The Claude cloud sandbox cannot reach the feeds; GitHub-hosted runners can.

## Open questions for Liran

1. Osher Ad has no online delivery that we could find. Does Liran order online
   from Osher Ad, or only shop in store?
2. How should the app treat chains without delivery when the default quote is
   "online delivery incl. fee"?
3. Rami Levy's minimum order is not on the page we read; Liran can check it in
   the app at checkout.

## Next steps

- Ingestion job: hourly pull into Supabase for the chosen stores, with stale-feed
  and price-jump alerts (needs a decision record on where it runs).
- CBS locality code table for city names.
- Curated produce map for the 30 most common fresh items.
- Credit mixed-item deals and minimum-spend promotions.
