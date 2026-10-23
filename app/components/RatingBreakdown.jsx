import { Card, BlockStack, InlineStack, InlineGrid, ProgressBar, Badge, Text } from "@shopify/polaris";

/**
 * RatingBreakdown component built using native Shopify Polaris React components
 */
export function RatingBreakdown({ distribution, total = 0, averageRating = 0 }) {
  const safeTotal = total > 0 ? total : 1;

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">Rating Distribution</Text>
          <InlineStack gap="150" blockAlign="center">
            {averageRating > 0 && (
              <Badge tone="success">{`★ ${averageRating}`}</Badge>
            )}
            <Badge tone="info">{`${total} Total Reviews`}</Badge>
          </InlineStack>
        </InlineStack>

        <BlockStack gap="200">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = distribution[stars] || 0;
            const pct = Math.round((count / safeTotal) * 100);

            return (
              <InlineGrid key={stars} columns="65px 1fr 35px" alignItems="center" gap="200">
                <Text as="span" variant="bodySm" fontWeight="medium">
                  {`${stars} ${stars === 1 ? "Star" : "Stars"}`}
                </Text>
                <ProgressBar progress={pct} size="small" tone="primary" />
                <Text as="span" variant="bodySm" tone="subdued" alignment="end">
                  {count}
                </Text>
              </InlineGrid>
            );
          })}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
