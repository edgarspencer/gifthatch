import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  EmptyState,
  IndexTable,
  Page,
  Text,
  useIndexResourceState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import {
  archiveGiftRule,
  deleteGiftRule,
  listGiftRules,
  updateGiftRule,
} from "../models/giftRule.server";
import { formatMoney } from "../utils/money";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const rules = await listGiftRules(session.shop);
  return { rules };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = String(form.get("id") ?? "");

  if (!id) {
    return { ok: false, error: "Missing rule id" };
  }

  switch (intent) {
    case "archive":
      await archiveGiftRule(session.shop, id);
      return { ok: true };
    case "activate":
      await updateGiftRule(session.shop, id, { active: true });
      return { ok: true };
    case "delete":
      await deleteGiftRule(session.shop, id);
      return { ok: true };
    default:
      return { ok: false, error: `Unknown intent: ${intent}` };
  }
};

export default function RulesIndex() {
  const { rules } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const resourceName = { singular: "rule", plural: "rules" };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(rules.map((r) => ({ id: r.id })));

  if (rules.length === 0) {
    return (
      <Page>
        <TitleBar title="Gift rules">
          <button variant="primary" onClick={() => (window.location.href = "/app/rules/new")}>
            New rule
          </button>
        </TitleBar>
        <Card>
          <EmptyState
            heading="No gift rules yet"
            action={{ content: "Create your first rule", url: "/app/rules/new" }}
            image=""
          >
            <p>Rules tell gifthatch when to award a free gift.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const rowMarkup = rules.map((rule, index) => (
    <IndexTable.Row
      id={rule.id}
      key={rule.id}
      selected={selectedResources.includes(rule.id)}
      position={index}
    >
      <IndexTable.Cell>
        <Link to={`/app/rules/${rule.id}`}>
          <Text as="span" fontWeight="semibold">
            {rule.name}
          </Text>
        </Link>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {formatMoney(rule.thresholdCents, rule.currencyCode)}
      </IndexTable.Cell>
      <IndexTable.Cell>{rule.giftTitle}</IndexTable.Cell>
      <IndexTable.Cell>
        {rule.active ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="attention">Archived</Badge>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button
          variant="plain"
          tone={rule.active ? "critical" : undefined}
          onClick={() =>
            fetcher.submit(
              { intent: rule.active ? "archive" : "activate", id: rule.id },
              { method: "POST" },
            )
          }
        >
          {rule.active ? "Archive" : "Activate"}
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <TitleBar title="Gift rules">
        <button variant="primary" onClick={() => (window.location.href = "/app/rules/new")}>
          New rule
        </button>
      </TitleBar>

      <BlockStack gap="400">
        <Card padding="0">
          <IndexTable
            resourceName={resourceName}
            itemCount={rules.length}
            selectedItemsCount={
              allResourcesSelected ? "All" : selectedResources.length
            }
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: "Name" },
              { title: "Threshold" },
              { title: "Gift" },
              { title: "Status" },
              { title: "" },
            ]}
          >
            {rowMarkup}
          </IndexTable>
        </Card>
      </BlockStack>
    </Page>
  );
}
