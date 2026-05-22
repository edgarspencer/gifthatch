import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhooks can fire after uninstall, when the session is already gone.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
    await db.giftRule.deleteMany({ where: { shop } });
  }

  return new Response();
};
