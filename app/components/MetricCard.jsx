import { Card, BlockStack, InlineStack, Text, Box } from "@shopify/polaris";

/**
 * Metric KPI Card built using native Shopify Polaris React components
 */
export function MetricCard({ label, value, subtext, icon: Icon, tone = "default" }) {
  const toneMap = {
    warning: "caution",
    success: "success",
    critical: "critical",
    default: "subdued",
  };

  return (
    <Card>
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="span" variant="headingXs" tone="subdued">
            {label}
          </Text>
          {Icon && (
            <Box background="bg-surface-secondary" padding="100" borderRadius="100">
              <Icon size={16} />
            </Box>
          )}
        </InlineStack>

        <Text as="p" variant="heading2xl" fontWeight="bold">
          {value}
        </Text>

        {subtext && (
          <Text as="p" variant="bodySm" tone={toneMap[tone] || "subdued"}>
            {subtext}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
