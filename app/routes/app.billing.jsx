// Reviora Subscription & Billing Page - Clean Native Polaris Layout
import { useState, useEffect } from "react";
import process from "process";
import { useLoaderData, useNavigation, useSubmit, useActionData, redirect } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  InlineGrid,
  InlineStack,
  Badge,
  Button,
  Divider,
  Text,
  Box,
  Modal,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";
import { getShopSettings, updateShopSettings } from "../models/review.server.js";
import { Check } from "lucide-react";

const PLAN_FREE = "Free";
const PLAN_PRO = "Pro";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const shop = session.shop;

  let hasActivePayment = false;
  let current = null;

  try {
    const billingCheck = await billing.check({
      plans: [PLAN_PRO],
      isTest: process.env.NODE_ENV !== "production",
    });

    hasActivePayment = billingCheck.hasActivePayment;
    current = billingCheck.appSubscriptions[0]?.name ?? null;

    // Sync database plan state with live Shopify billing
    const planInDb = hasActivePayment ? "PRO" : "FREE";
    await updateShopSettings(shop, { plan: planInDb });
  } catch (err) {
    console.error("Billing check error:", err?.message || err);
    try {
      const settings = await getShopSettings(shop);
      hasActivePayment = settings?.plan === "PRO";
      current = hasActivePayment ? PLAN_PRO : null;
    } catch (e) {
      // ignore
    }
  }

  return {
    shop,
    hasActivePayment,
    current,
    currentPlan: hasActivePayment ? "PRO" : "FREE",
  };
};

export const action = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const form = await request.formData();
  const plan = form.get("plan");
  const intent = form.get("intent");

  // Handle cancellation / downgrade to Free
  if (intent === "cancel" || plan === "FREE" || plan === PLAN_FREE) {
    try {
      const { appSubscriptions } = await billing.check({
        plans: [PLAN_PRO],
        isTest: process.env.NODE_ENV !== "production",
      });

      if (appSubscriptions && appSubscriptions.length > 0) {
        await billing.cancel({
          subscriptionId: appSubscriptions[0].id,
          isTest: process.env.NODE_ENV !== "production",
          prorate: true,
        });
      }
    } catch (err) {
      console.error("Failed to cancel subscription via billing API:", err?.message || err);
    }

    try {
      await updateShopSettings(session.shop, { plan: "FREE" });
    } catch (err) {
      console.error("Failed to update shop setting plan to FREE:", err?.message || err);
    }

    return redirect("/app/billing");
  }

  // Requesting Pro Plan: Create subscription charge via GraphQL & return confirmationUrl for top-level redirect
  if (plan === PLAN_PRO || plan === "PRO") {
    try {
      const isTest = process.env.NODE_ENV !== "production";
      const cleanShop = session.shop.replace(".myshopify.com", "");
      const apiKey = process.env.SHOPIFY_API_KEY || "";
      const returnUrl = `https://admin.shopify.com/store/${cleanShop}/apps/${apiKey}/app/billing`;

      const response = await admin.graphql(
        `#graphql
        mutation AppSubscriptionCreate(
          $name: String!
          $returnUrl: URL!
          $test: Boolean
          $trialDays: Int
          $lineItems: [AppSubscriptionLineItemInput!]!
        ) {
          appSubscriptionCreate(
            name: $name
            returnUrl: $returnUrl
            test: $test
            trialDays: $trialDays
            lineItems: $lineItems
          ) {
            appSubscription {
              id
            }
            confirmationUrl
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            name: "Pro",
            returnUrl,
            test: isTest,
            trialDays: 14,
            lineItems: [
              {
                plan: {
                  appRecurringPricingDetails: {
                    price: { amount: 4.99, currencyCode: "USD" },
                    interval: "EVERY_30_DAYS",
                  },
                },
              },
            ],
          },
        }
      );

      const json = await response.json();
      const userErrors = json?.data?.appSubscriptionCreate?.userErrors;
      if (userErrors && userErrors.length > 0) {
        console.error("Shopify billing userErrors:", userErrors);
        return { error: userErrors.map((e) => e.message).join(", ") };
      }

      const confirmationUrl = json?.data?.appSubscriptionCreate?.confirmationUrl;
      if (confirmationUrl) {
        return { confirmationUrl };
      }

      return { error: "No confirmation URL returned by Shopify." };
    } catch (err) {
      console.error("Billing request error:", err?.message || err);
      return { error: err?.message || "Failed to initiate billing request with Shopify." };
    }
  }

  return redirect("/app/billing");
};

export default function BillingPage() {
  const { currentPlan, hasActivePayment } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();

  const isSubmitting = navigation.state === "submitting" || Boolean(actionData?.confirmationUrl);
  const activePlanKey = hasActivePayment ? "PRO" : currentPlan;

  const [selectedPlanForModal, setSelectedPlanForModal] = useState(null);

  // Directly navigate the top parent window out of the iframe to Shopify's confirmation page
  useEffect(() => {
    if (actionData?.confirmationUrl) {
      if (window.shopify?.open) {
        window.shopify.open(actionData.confirmationUrl, "_top");
      } else {
        window.open(actionData.confirmationUrl, "_top");
      }
    }
  }, [actionData?.confirmationUrl]);

  const handlePlanSelect = (planKey) => {
    if (planKey === activePlanKey) return;
    setSelectedPlanForModal(planKey);
  };

  const handleConfirmPlanChange = () => {
    if (!selectedPlanForModal) return;
    const formData = new FormData();
    if (selectedPlanForModal === "FREE") {
      formData.append("intent", "cancel");
      formData.append("plan", "FREE");
    } else {
      formData.append("plan", "PRO");
    }
    submit(formData, { method: "post" });
    setSelectedPlanForModal(null);
  };

  const freeFeatures = [
    "50 review request emails per month",
    "Standard star rating badge on product pages",
    "Review list storefront widget",
    "Basic automated spam filter",
    "Standard CSV review import",
    "Community & documentation support",
  ];

  const proFeatures = [
    "Unlimited automated email review requests",
    "Customer photo uploads & CDN hosting",
    "Google Shopping & Rich Snippets (Schema.org JSON-LD)",
    "1-click Judge.me, Loox, Yotpo & Okendo import",
    "Verified Buyer trust badges",
    "All widget layouts (Grid, Carousel, Tab)",
    "Priority 24/7 Email & Chat Support",
  ];

  return (
    <Page narrowWidth>
      <ui-title-bar title="Subscription & Plans" />

      <BlockStack gap="400">
        {actionData?.error && (
          <Banner tone="critical" title="Billing Error">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {/* Current Active Plan Status Bar */}
        <Card padding="400">
          <InlineStack align="space-between" blockAlign="center" wrap gap="200">
            <InlineStack gap="200" blockAlign="center">
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                Current Plan:
              </Text>
              <Badge tone={activePlanKey === "PRO" ? "success" : "info"}>
                {activePlanKey === "PRO" ? "Pro Plan ($4.99/mo)" : "Free Plan ($0/mo)"}
              </Badge>
            </InlineStack>

            <Text as="span" variant="bodySm" tone="subdued">
              Billed directly through your Shopify invoice
            </Text>
          </InlineStack>
        </Card>

        {/* 2-Column Plan Grid */}
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          {/* Free Plan Card */}
          <Card padding="500">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingLg">
                  Free
                </Text>
                {activePlanKey === "FREE" && <Badge tone="info">Active</Badge>}
              </InlineStack>

              <Text as="p" variant="bodySm" tone="subdued">
                Essential review collection and star rating widgets for stores getting started.
              </Text>

              <InlineStack gap="100" blockAlign="baseline">
                <Text as="span" variant="heading2xl" fontWeight="bold">
                  $0
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  / forever
                </Text>
              </InlineStack>

              <Button
                size="large"
                variant="secondary"
                disabled={activePlanKey === "FREE" || isSubmitting}
                loading={isSubmitting && selectedPlanForModal === "FREE"}
                onClick={() => handlePlanSelect("FREE")}
                fullWidth
              >
                {activePlanKey === "FREE" ? "Current Plan" : "Downgrade to Free"}
              </Button>

              <Divider />

              <BlockStack gap="200">
                <Text as="h3" variant="headingXs">
                  What&apos;s included:
                </Text>

                <BlockStack gap="150">
                  {freeFeatures.map((feat, idx) => (
                    <InlineStack key={idx} gap="150" blockAlign="start" wrap={false}>
                      <Box minWidth="16px" paddingTop="050">
                        <Check size={16} color="#10b981" strokeWidth={2.5} />
                      </Box>
                      <Text as="span" variant="bodySm">
                        {feat}
                      </Text>
                    </InlineStack>
                  ))}
                </BlockStack>
              </BlockStack>
            </BlockStack>
          </Card>

          {/* Pro Plan Card */}
          <div className={activePlanKey !== "PRO" ? "reviora-plan-card-featured" : ""}>
            <Card padding="500">
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingLg">
                    Pro
                  </Text>
                  {activePlanKey === "PRO" ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Badge tone="magic">Recommended</Badge>
                  )}
                </InlineStack>

                <Text as="p" variant="bodySm" tone="subdued">
                  Unlimited review requests, photo uploads, and priority support.
                </Text>

                <InlineStack gap="100" blockAlign="baseline">
                  <Text as="span" variant="heading2xl" fontWeight="bold">
                    $4.99
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    / month
                  </Text>
                </InlineStack>

                <Button
                  size="large"
                  variant={activePlanKey === "PRO" ? "secondary" : "primary"}
                  disabled={activePlanKey === "PRO" || isSubmitting}
                  loading={isSubmitting && selectedPlanForModal === "PRO"}
                  onClick={() => handlePlanSelect("PRO")}
                  fullWidth
                >
                  {activePlanKey === "PRO" ? "Current Plan" : "Upgrade to Pro"}
                </Button>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingXs">
                    Everything in Free, plus:
                  </Text>

                  <BlockStack gap="150">
                    {proFeatures.map((feat, idx) => (
                      <InlineStack key={idx} gap="150" blockAlign="start" wrap={false}>
                        <Box minWidth="16px" paddingTop="050">
                          <Check size={16} color="#10b981" strokeWidth={2.5} />
                        </Box>
                        <Text as="span" variant="bodySm">
                          {feat}
                        </Text>
                      </InlineStack>
                    ))}
                  </BlockStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </div>
        </InlineGrid>

        {/* Subtle Footer Note */}
        <Box paddingBlockStart="100">
          <Text as="p" variant="bodyXs" tone="subdued" alignment="center">
            All plans include a 14-day free trial on upgrade · Billed directly through Shopify · Cancel anytime
          </Text>
        </Box>
      </BlockStack>

      {/* Confirmation Modal */}
      {selectedPlanForModal && (
        <Modal
          open={Boolean(selectedPlanForModal)}
          onClose={() => setSelectedPlanForModal(null)}
          title={selectedPlanForModal === "PRO" ? "Upgrade to Pro Plan?" : "Downgrade to Free Plan?"}
          primaryAction={{
            content: selectedPlanForModal === "PRO" ? "Confirm & Continue to Shopify" : "Confirm Downgrade",
            onAction: handleConfirmPlanChange,
            loading: isSubmitting,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setSelectedPlanForModal(null),
              disabled: isSubmitting,
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="300">
              <Banner tone="info">
                <p>
                  {selectedPlanForModal === "PRO"
                    ? "Upgrading to Pro starts with a 14-day free trial. You will be redirected to Shopify to approve the $4.99/month charge."
                    : "Downgrading to Free will cancel your paid recurring charge. Any reviews previously collected remain safe on your store."}
                </p>
              </Banner>
              <Text as="p" variant="bodySm" tone="subdued">
                Subscription changes take effect immediately on your Shopify billing account.
              </Text>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
