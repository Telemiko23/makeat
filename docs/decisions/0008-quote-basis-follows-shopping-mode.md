# 0008. Quote basis follows how the household shops

- Status: accepted
- Date: 2026-10-22
- Owner: tech-lead
- Approved by: Liran, 2026-10-22 (decision card in the price-data thread; he shops in store, never online)

## Context
0002 and CLAUDE.md made online delivery, fee included, the default quote. Liran, a target user, never orders online: he buys in store. For in-store shoppers a delivery-based quote is wrong twice over: it adds a fee they never pay, and it leaves out chains with no delivery service.

## Decision
- Onboarding asks how the household shops: online, in store, or both. The answer is required.
- Online: quote the full basket for delivery, delivery fee included (unchanged from 0002).
- In store: quote shelf prices with no delivery fee, including chains that do not deliver.
- Both: show both quotes.
- 0002's data source, freshness and re-pricing rules are unchanged; only the quote basis changes.

## Alternatives rejected
- Keep online delivery as the only basis: wrong for in-store shoppers and hides chains without delivery.
- Infer the mode from chain choice: guesswork; one question is clearer.

## Consequences
- The price engine takes delivery terms as optional per quote (PR #8 already does).
- Shelf prices differ by branch, so the in-store quote needs a branch or area. How the household picks it is open for the price-data and ux roles, and goes in its own record.
