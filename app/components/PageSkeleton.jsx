import {
  SkeletonPage,
  Layout,
  Card,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonThumbnail,
  BlockStack,
  InlineStack,
  InlineGrid,
  Box,
} from "@shopify/polaris";

/**
 * Modern, responsive skeleton displayed during page-to-page navigation
 */
export function PageSkeleton() {
  return (
    <SkeletonPage primaryAction title=" ">
      <BlockStack gap="500">
        {/* Top KPI Cards Skeleton */}
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <BlockStack gap="200">
                <SkeletonDisplayText size="small" />
                <SkeletonDisplayText size="medium" />
                <SkeletonBodyText lines={1} />
              </BlockStack>
            </Card>
          ))}
        </InlineGrid>

        {/* Main Content Layout Skeleton */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <SkeletonDisplayText size="small" />
                <SkeletonBodyText lines={3} />
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <SkeletonThumbnail size="small" />
                      <BlockStack gap="100">
                        <SkeletonDisplayText size="small" />
                        <SkeletonBodyText lines={1} />
                      </BlockStack>
                    </InlineStack>
                  </InlineStack>
                </Box>
                <SkeletonBodyText lines={2} />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <SkeletonDisplayText size="small" />
                <SkeletonBodyText lines={4} />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </SkeletonPage>
  );
}
