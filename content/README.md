# Content

Owned by the `recipes` role. The format and its safety rules are in [decision 0011](../docs/decisions/0011-recipe-content-model.md).

- `ingredients.json`: the ingredient catalog. Every safety fact lives here: kashrut class, animal sources, allergens, kosher species.
- `recipes/<id>.json`: one recipe per file, named after its `id`. Recipes never state allergens or kashrut; both are derived.

## Writing a recipe
1. Research how the dish is commonly made, then write our own version in our own words. Never copy text or photos.
2. Use only catalog ingredients. Add a missing one to the catalog first, with all its facts.
3. Prefer grams and millilitres. Use pieces only for ingredients with `gramsPerPiece`, and spoons only for small amounts.
4. Keep `status: "draft"`. The `nutrition` role reviews it and sets `reviewed`.
5. Run `npm test` in `packages/shared`. It validates every file here.
