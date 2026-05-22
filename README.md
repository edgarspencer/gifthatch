# gifthatch

Free-gift-with-purchase rules engine for Shopify. Lets a merchant configure rules like "spend over £50 → add the Tote Bag for free", and runs that logic at the cart + checkout layer so customers can't game it.

Built on the Shopify Remix template. Three moving parts:

- **Remix admin app** — Polaris UI for creating / editing / archiving gift rules. Embedded via App Bridge, GraphQL Admin for product picker.
- **Product discount function** — Shopify Function (JS, compiled to Wasm) that applies a 100% discount to the qualifying gift variant when threshold conditions are met. Runs server-side at checkout so the rule is enforced even if the customer messes with the cart.
- **Theme app extension** — small cart-page block that watches the cart total, auto-adds the gift line item via `/cart/add.js` when the threshold is crossed, and shows a "🎁 Free gift unlocked" banner.

## Why this architecture

The naive approach is "auto-add gift from a script tag and call it a day." That breaks the moment a customer edits the cart or skips the cart page and goes straight to checkout — the gift ends up in their order at full price. By pairing the theme extension with a discount function, the gift is always free at the point of payment regardless of client-side state. The admin UI is the merchant-facing surface for both.

## Stack

- Remix v2 + Vite
- Polaris + App Bridge (embedded admin)
- Prisma + SQLite (dev) — Postgres in prod
- Shopify Functions (JS target, `product_discounts`)
- Theme App Extension (Liquid + vanilla JS, no framework — keeps storefront footprint tiny)

## Local setup

```bash
npm install
npm run setup            # prisma generate + migrate
shopify app dev          # tunnels + installs to your dev store
```

The first run prompts for a Partner org and dev store. Subsequent runs reuse the linked config in `shopify.app.toml`.

### Required scopes

`write_products`, `read_products`, `write_discounts`. The discount function needs `write_discounts`; product picker needs `read_products`.

### Environment

Copy `env.example` to `.env` and fill in `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` from the Partner dashboard (or let `shopify app dev` write them for you).

## Project layout

```
app/                              # Remix admin
  routes/
    app._index.tsx                # dashboard: active rules + recent unlocks
    app.rules._index.tsx          # rule list
    app.rules.new.tsx             # create
    app.rules.$id.tsx             # edit / archive
  models/
    giftRule.server.ts            # all rule queries + actions live here
extensions/
  gift-rules-discount/            # Shopify Function (product_discounts)
    src/run.ts
    src/run.test.ts
  gift-banner/                    # theme app extension
    blocks/gift-banner.liquid
    assets/gift-banner.js
prisma/
  schema.prisma                   # GiftRule alongside Session
```

## Testing

```bash
npm test                          # unit tests for the discount function
npm run typecheck                 # tsc --noEmit across the workspace
npm run lint
```

The discount function has unit tests that mock the Shopify function input — these cover the rule-eligibility branches (threshold met / not met, multiple rules, archived rules, gift-already-in-cart).

I don't have integration tests against a real store wired up in CI yet — for now the workflow is: `shopify app dev`, install on the linked dev store, run through the manual demo script in `docs/demo.md`.

## Roadmap

- Multiple rule conditions (cart total + contains product X)
- Per-customer eligibility (tags, first-order-only)
- Analytics: unlock rate, attach rate, AOV lift
- Migrate session storage to Postgres for production

## License

UNLICENSED — proprietary, all rights reserved.
