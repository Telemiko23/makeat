# Recipe ratings and favorites (draft)

- Status: idea, planned for v0.2 (closed beta)
- Owner: product, with ux and planner
- Requested by Liran, 2026-10-22

## Problem
Users cook a recipe and have no way to say whether it worked for their household, or to find it again later. The planner also has no signal about what this household likes.

## Proposed experience
1. **At the end of cooking mode**, one light screen: "How was it?" with 1-5 stars and two quick chips: "Cook again" (saves to favorites) and "Not for us". One tap is enough; it can be skipped.
2. **Who liked it** (optional, one extra tap): per household member, so "the kids loved it" counts separately from the adults. Useful for families where tastes differ.
3. **My recipes** tab: favorites and history ("cooked 3 times, last on ..."), searchable, with "Add to next plan".
4. **In the planner**: favorites are suggested more often (without breaking variety rules); "Not for us" and 1-2 star recipes are not suggested again unless the user asks.
5. **Small notes** on a cooked recipe ("less salt next time") shown the next time it is cooked.

## Open questions
- Ask right after cooking, or the next time the app opens (the cook may be busy serving)?
- Stars, or a simpler three-way choice (loved / OK / no)?
- Should ratings feed shared recommendations for other users later (needs a privacy decision)?

## Data
Per household: recipe id, rating, cook-again flag, per-member reactions, note, cooked-at dates. Household-only data; not used across users without a separate decision.

## Measures
Share of cooked recipes rated; share of plans that include a favorite; repeat-cook rate.
