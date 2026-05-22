import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Box,
  Button,
  Card,
  EmptyState,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { listGiftRules } from "../models/giftRule.server";
import { formatMoney } from "../utils/money";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const rules = await listGiftRules(session.shop);
  return {
    rules: rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      giftTitle: rule.giftTitle,
      thresholdCents: rule.thresholdCents,
      currencyCode: rule.currencyCode,
      active: rule.active,
    })),
  };
};

export default function Dashboard() {
  const { rules } = useLoaderData<typeof loader>();
  const activeRules = rules.filter((r) => r.active);

  return (
    <Page>
      <TitleBar title="gifthatch">
        <button variant="primary" onClick={() => (window.location.href = "/app/rules/new")}>
          New rule
        </button>
      </TitleBar>

      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            {rules.length === 0 ? (
              <Card>
                <EmptyState
                  heading="No gift rules yet"
                  action={{ content: "Create your first rule", url: "/app/rules/new" }}
                  image=""
                >
                  <p>
                    Set a cart-total threshold, pick a gift, and gifthatch will auto-add
                    it on the cart page and zero it out at checkout.
                  </p>
                </EmptyState>
              </Card>
            ) : (
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      Active rules
                    </Text>
                    <Button url="/app/rules" variant="plain">
                      View all
                    </Button>
                  </InlineStack>
                  <BlockStack gap="300">
                    {activeRules.slice(0, 5).map((rule) => (
                      <Box
                        key={rule.id}
                        padding="300"
                        background="bg-surface-secondary"
                        borderRadius="200"
                      >
                        <InlineStack align="space-between" blockAlign="center">
                          <BlockStack gap="100">
                            <Link to={`/app/rules/${rule.id}`}>
                              <Text as="span" variant="bodyMd" fontWeight="semibold">
                                {rule.name}
                              </Text>
                            </Link>
                            <Text as="span" variant="bodySm" tone="subdued">
                              Spend {formatMoney(rule.thresholdCents, rule.currencyCode)} →{" "}
                              {rule.giftTitle}
                            </Text>
                          </BlockStack>
                          <Button url={`/app/rules/${rule.id}`} variant="plain">
                            Edit
                          </Button>
                        </InlineStack>
                      </Box>
                    ))}
                    {activeRules.length === 0 && (
                      <Text as="p" tone="subdued">
                        All rules are currently archived.
                      </Text>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            )}
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  How it works
                </Text>
                <Text as="p" variant="bodyMd">
                  1. Pick a threshold and a gift product.
                </Text>
                <Text as="p" variant="bodyMd">
                  2. The theme block auto-adds the gift when the cart crosses the threshold.
                </Text>
                <Text as="p" variant="bodyMd">
                  3. The discount function applies 100% off at checkout, so the gift is always
                  free at the point of payment — even if the cart is tampered with.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
