# Demo script

Five-minute walkthrough for showing the app on a dev store.

## Setup (one-time)

```bash
npm install
npm run setup
shopify app dev
```

When prompted, link to a development store. The CLI tunnels traffic via Cloudflare and writes `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` into `.env`.

Visit the store admin → Apps → gifthatch.

## Merchant flow

1. **Dashboard** — should be empty on first run.
2. Click **New rule**.
3. Fill in:
   - Name: `Spend £50 → Tote`
   - Threshold: `50`
   - Currency: `GBP`
   - Gift: pick any product with at least one variant via the resource picker
   - Banner text: leave default
4. **Create rule**. You should be redirected to the rules list with the new rule showing as **Active**.
5. Go to the storefront → cart page. The cart should be empty so the banner is hidden.

## Customer flow

1. Add £40 of products to cart. The banner appears with `"Add £10.00 more to unlock a free gift"` and the progress bar partly filled.
2. Add another £15 of product. Threshold crosses; banner switches to `"🎁 Free gift unlocked"` and the gift line is added.
3. Proceed to checkout. The gift line shows at full price but a 100% discount is applied — final price for the gift is £0.00. Total reflects only the regular products.
4. Go back to cart, reduce the regular products to £30. The gift line is auto-removed.

## What the function is doing

Open the checkout receipt → discounts section. You should see "Free gift" listed with the gift line as the target. That entry is the product discount function returning the candidate. If you remove the cart line attributes via the storefront API, the function returns no operations and the gift would be charged in full — that's the intended fail-safe.

## Troubleshooting

- **Gift doesn't auto-add**: check the theme editor — the Gift banner block must be added to the cart section and configured with the rule ID, threshold, and gift variant ID from the admin app.
- **Gift charges full price at checkout**: the function isn't deployed. Run `shopify app deploy` and ensure the function shows in the Discounts admin.
- **Resource picker doesn't open**: App Bridge must be initialised — confirm `SHOPIFY_API_KEY` is set in `.env` and the page loaded via the embedded admin.
