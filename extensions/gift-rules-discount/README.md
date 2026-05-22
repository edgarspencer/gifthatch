# gift-rules-discount

Shopify Function (product discount target) that zeroes out gift lines added by the gifthatch theme extension.

## How it identifies a gift

Lines are marked with two cart line attributes when the theme extension adds them via `/cart/add.js`:

- `_gh_rule_id` — the rule id from the admin app (presence = "this is a gift line")
- `_gh_threshold_cents` — the cart threshold in shop-currency cents

The function recomputes the non-gift subtotal at checkout (so it can't be bypassed by removing eligible products after the theme JS adds the gift) and applies 100% off only when the threshold is still met.

## Testing

```bash
npm test
```

Tests cover the eligibility branches: no gifts, missing discount class, threshold met / not met, gift-value exclusion, multiple rules, malformed attributes, presentment currency conversion.

## Build & deploy

```bash
npm run build      # compiles to dist/function.wasm via shopify-function
shopify app deploy # ship to the dev store
```
