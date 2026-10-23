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
  List,
} from "@shopify/polaris";

export default function BillingPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Essential review collection for new stores starting out.",
      features: [
        "Up to 50 review requests/month",
        "Star rating & review widget",
        "Basic auto-moderation rules",
        "Community support",
      ],
      current: true,
      buttonText: "Current Plan",
    },
    {
      name: "Growth",
      price: "$4.99",
      period: "per month",
      description: "For growing brands wanting unlimited collection and photo reviews.",
      features: [
        "Unlimited email review requests",
        "Customer photo uploads",
        "Google Shopping rich snippet feed",
        "1-click Judge.me & Okendo import",
        "Priority email support",
      ],
      current: false,
      popular: true,
      buttonText: "Upgrade to Growth",
    },
  ];

  return (
    <Page>
      <ui-title-bar title="Subscription & Plans" />
      <BlockStack gap="500">
        <Text as="p" variant="bodyMd" tone="subdued">
          Choose the right plan for your business. Transparent pricing designed to scale with your store without caps on organic reviews.
        </Text>

        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          {plans.map((p) => (
            <Card key={p.name}>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingLg">{p.name}</Text>
                  {p.popular && <Badge tone="success">Most Popular</Badge>}
                  {p.current && <Badge tone="info">Current Plan</Badge>}
                </InlineStack>

                <Text as="p" variant="bodySm" tone="subdued">
                  {p.description}
                </Text>

                <InlineStack gap="100" blockAlign="baseline">
                  <Text as="span" variant="heading2xl" fontWeight="bold">
                    {p.price}
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    / {p.period}
                  </Text>
                </InlineStack>

                <Divider />

                <Text as="h3" variant="headingSm">Included Features</Text>
                <List type="bullet">
                  {p.features.map((f, idx) => (
                    <List.Item key={idx}>{f}</List.Item>
                  ))}
                </List>

                <Divider />

                <Button
                  variant={p.popular ? "primary" : "secondary"}
                  disabled={p.current}
                  fullWidth
                >
                  {p.buttonText}
                </Button>
              </BlockStack>
            </Card>
          ))}
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}


