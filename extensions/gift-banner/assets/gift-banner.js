/*
 * gifthatch — gift banner + auto-add.
 *
 * Each .gifthatch-banner element on the page represents one rule. We watch
 * the cart, compute the non-gift subtotal, and:
 *   - show the banner when there's any progress toward the threshold
 *   - update the progress bar / message
 *   - call /cart/add.js with the gift variant + the line attributes the
 *     discount function expects, when the threshold is crossed
 *   - call /cart/change.js to remove the gift if the cart drops back below
 *
 * Plain JS, no framework, no build step — keeps storefront footprint tiny.
 */
(function () {
  "use strict";

  if (window.__gifthatchInit) return;
  window.__gifthatchInit = true;

  var GIFT_RULE_ATTR = "_gh_rule_id";
  var GIFT_THRESHOLD_ATTR = "_gh_threshold_cents";
  var POLL_INTERVAL_MS = 2000;
  var inflight = Object.create(null);

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function fetchCart() {
    return fetch("/cart.js", { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("cart fetch failed: " + r.status);
      return r.json();
    });
  }

  function formatMoney(cents, currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "GBP",
      }).format(cents / 100);
    } catch (e) {
      return (cents / 100).toFixed(2) + " " + (currency || "");
    }
  }

  function nonGiftSubtotalCents(cart) {
    var total = 0;
    for (var i = 0; i < cart.items.length; i++) {
      var item = cart.items[i];
      var props = item.properties || {};
      if (props[GIFT_RULE_ATTR]) continue;
      total += item.line_price;
    }
    return total;
  }

  function findGiftLineKey(cart, ruleId) {
    for (var i = 0; i < cart.items.length; i++) {
      var item = cart.items[i];
      var props = item.properties || {};
      if (props[GIFT_RULE_ATTR] === ruleId) return item.key;
    }
    return null;
  }

  function addGift(banner) {
    var ruleId = banner.dataset.ruleId;
    var variantId = banner.dataset.giftVariantId;
    var thresholdCents = banner.dataset.thresholdCents;
    var properties = {};
    properties[GIFT_RULE_ATTR] = ruleId;
    properties[GIFT_THRESHOLD_ATTR] = thresholdCents;

    return fetch("/cart/add.js", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        items: [{ id: Number(variantId), quantity: 1, properties: properties }],
      }),
    });
  }

  function removeGift(lineKey) {
    return fetch("/cart/change.js", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ id: lineKey, quantity: 0 }),
    });
  }

  function render(banner, cart) {
    var thresholdCents = Number(banner.dataset.thresholdCents);
    if (!thresholdCents) return;

    var ruleId = banner.dataset.ruleId;
    var subtotal = nonGiftSubtotalCents(cart);
    var unlocked = subtotal >= thresholdCents;
    var giftLineKey = findGiftLineKey(cart, ruleId);

    var pct = Math.min(100, Math.max(0, (subtotal / thresholdCents) * 100));
    var bar = banner.querySelector("[data-gifthatch-progress-bar]");
    var message = banner.querySelector("[data-gifthatch-message]");

    if (subtotal > 0 || unlocked) {
      banner.style.display = "";
    }

    if (bar) bar.style.width = pct + "%";

    if (message) {
      if (unlocked) {
        message.textContent = banner.dataset.bannerText || "🎁 Free gift unlocked";
      } else {
        var remaining = thresholdCents - subtotal;
        var template =
          banner.dataset.progressText || "Add {amount_left} more to unlock a free gift";
        message.textContent = template.replace(
          "{amount_left}",
          formatMoney(remaining, cart.currency),
        );
      }
    }

    if (inflight[ruleId]) return;

    if (unlocked && !giftLineKey) {
      inflight[ruleId] = true;
      addGift(banner)
        .catch(function () {})
        .then(function () {
          inflight[ruleId] = false;
          document.dispatchEvent(new CustomEvent("gifthatch:cart-changed"));
        });
    } else if (!unlocked && giftLineKey) {
      inflight[ruleId] = true;
      removeGift(giftLineKey)
        .catch(function () {})
        .then(function () {
          inflight[ruleId] = false;
          document.dispatchEvent(new CustomEvent("gifthatch:cart-changed"));
        });
    }
  }

  function sync() {
    var banners = $$("[data-gifthatch-rule]");
    if (banners.length === 0) return;
    fetchCart()
      .then(function (cart) {
        for (var i = 0; i < banners.length; i++) render(banners[i], cart);
      })
      .catch(function () {});
  }

  document.addEventListener("DOMContentLoaded", sync);
  document.addEventListener("gifthatch:cart-changed", sync);
  document.addEventListener("cart:updated", sync);
  document.addEventListener("cart:refresh", sync);
  setInterval(sync, POLL_INTERVAL_MS);
})();
