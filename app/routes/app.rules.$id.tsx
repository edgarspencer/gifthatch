import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  FormLayout,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import {
  archiveGiftRule,
  deleteGiftRule,
  getGiftRule,
  updateGiftRule,
  validateGiftRuleInput,
} from "../models/giftRule.server";
import { parseMoneyInput } from "../utils/money";

const SUPPORTED_CURRENCIES = ["GBP", "EUR", "USD", "AUD", "CAD"];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const id = params.id;
  if (!id) throw new Response("Not found", { status: 404 });
  const rule = await getGiftRule(session.shop, id);
  if (!rule) throw new Response("Not found", { status: 404 });
  return { rule };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const id = params.id;
  if (!id) throw new Response("Not found", { status: 404 });

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "save");

  if (intent === "delete") {
    await deleteGiftRule(session.shop, id);
    return redirect("/app/rules");
  }
  if (intent === "archive") {
    await archiveGiftRule(session.shop, id);
    return redirect("/app/rules");
  }

  const currencyCode = String(form.get("currencyCode") ?? "GBP");
  const thresholdCents = parseMoneyInput(
    String(form.get("threshold") ?? ""),
    currencyCode,
  );

  const input = {
    name: String(form.get("name") ?? "").trim(),
    thresholdCents: thresholdCents ?? Number.NaN,
    currencyCode,
    giftVariantId: String(form.get("giftVariantId") ?? ""),
    giftProductId: String(form.get("giftProductId") ?? ""),
    giftTitle: String(form.get("giftTitle") ?? ""),
    bannerText: String(form.get("bannerText") ?? "").trim() || undefined,
  };

  const errors = validateGiftRuleInput(input);
  if (Object.keys(errors).length > 0) {
    return { errors, values: input };
  }

  await updateGiftRule(session.shop, id, {
    ...input,
    thresholdCents: input.thresholdCents as number,
  });

  return redirect("/app/rules");
};

export default function EditRule() {
  const { rule } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const submitting = navigation.state === "submitting";

  const [name, setName] = useState(actionData?.values.name ?? rule.name);
  const [threshold, setThreshold] = useState(
    actionData?.values.thresholdCents
      ? String(actionData.values.thresholdCents / 100)
      : String(rule.thresholdCents / 100),
  );
  const [currencyCode, setCurrencyCode] = useState(
    actionData?.values.currencyCode ?? rule.currencyCode,
  );
  const [bannerText, setBannerText] = useState(
    actionData?.values.bannerText ?? rule.bannerText,
  );
  const [giftVariantId, setGiftVariantId] = useState(
    actionData?.values.giftVariantId ?? rule.giftVariantId,
  );
  const [giftProductId, setGiftProductId] = useState(
    actionData?.values.giftProductId ?? rule.giftProductId,
  );
  const [giftTitle, setGiftTitle] = useState(
    actionData?.values.giftTitle ?? rule.giftTitle,
  );

  async function pickGift() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: false,
      action: "select",
    });
    const product = selection?.[0];
    if (!product) return;
    const variant = product.variants?.[0];
    if (!variant) {
      shopify.toast.show("That product has no variants — pick another.", {
        isError: true,
      });
      return;
    }
    setGiftProductId(String(product.id));
    setGiftVariantId(String(variant.id));
    setGiftTitle(product.title ?? "");
  }

  function archive() {
    if (!confirm("Archive this rule? It won't be applied to new carts.")) return;
    submit({ intent: "archive" }, { method: "POST" });
  }

  function destroy() {
    if (!confirm("Delete this rule? This can't be undone.")) return;
    submit({ intent: "delete" }, { method: "POST" });
  }

  return (
    <Page
      backAction={{ content: "Rules", url: "/app/rules" }}
      titleMetadata={
        rule.active ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="attention">Archived</Badge>
        )
      }
    >
      <TitleBar title={rule.name} />

      <Form method="POST">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                {actionData?.errors && Object.keys(actionData.errors).length > 0 && (
                  <Banner tone="critical" title="Fix the highlighted fields">
                    <ul>
                      {Object.values(actionData.errors).map((msg) => (
                        <li key={msg}>{msg}</li>
                      ))}
                    </ul>
                  </Banner>
                )}

                <FormLayout>
                  <TextField
                    name="name"
                    label="Rule name"
                    autoComplete="off"
                    value={name}
                    onChange={setName}
                    error={actionData?.errors?.name}
                    requiredIndicator
                  />

                  <FormLayout.Group>
                    <TextField
                      name="threshold"
                      label="Cart threshold"
                      type="number"
                      autoComplete="off"
                      min={0}
                      step={0.01}
                      value={threshold}
                      onChange={setThreshold}
                      error={actionData?.errors?.thresholdCents}
                      requiredIndicator
                    />
                    <Select
                      name="currencyCode"
                      label="Currency"
                      options={SUPPORTED_CURRENCIES}
                      value={currencyCode}
                      onChange={setCurrencyCode}
                    />
                  </FormLayout.Group>

                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      Gift
                    </Text>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {giftTitle}
                      </Text>
                      <Button variant="plain" onClick={pickGift}>
                        Change
                      </Button>
                    </InlineStack>
                    {actionData?.errors?.giftVariantId && (
                      <Text as="span" tone="critical" variant="bodySm">
                        {actionData.errors.giftVariantId}
                      </Text>
                    )}
                    <input type="hidden" name="giftVariantId" value={giftVariantId} />
                    <input type="hidden" name="giftProductId" value={giftProductId} />
                    <input type="hidden" name="giftTitle" value={giftTitle} />
                  </BlockStack>

                  <TextField
                    name="bannerText"
                    label="Banner text"
                    autoComplete="off"
                    value={bannerText}
                    onChange={setBannerText}
                  />
                </FormLayout>

                <InlineStack align="space-between">
                  <InlineStack gap="200">
                    {rule.active && (
                      <Button tone="critical" variant="plain" onClick={archive}>
                        Archive
                      </Button>
                    )}
                    <Button tone="critical" variant="plain" onClick={destroy}>
                      Delete
                    </Button>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Button url="/app/rules">Cancel</Button>
                    <Button submit variant="primary" loading={submitting}>
                      Save changes
                    </Button>
                  </InlineStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Form>
    </Page>
  );
}
