import { useLoaderData, Link } from "react-router";
import { Page, Layout, Card, InlineGrid, BlockStack, InlineStack, Badge, Text, Box, Button } from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";
import { getDashboardMetrics } from "../models/review.server.js";
import { StoreReviews } from "../models/review.model.js";
import { connectDB } from "../db.server.js";
import { MetricCard } from "../components/MetricCard.jsx";
import { RatingBreakdown } from "../components/RatingBreakdown.jsx";
import { StarRating } from "../components/StarRating.jsx";
import { Star, MessageSquare, Clock, Send } from "lucide-react";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const metrics = await getDashboardMetrics(session.shop);
  await connectDB();
  const storeDoc = await StoreReviews.findOne({ shop: session.shop }).lean({ virtuals: true });

  const allReviews = (storeDoc?.reviews || []).map((r) => ({
    ...r,
    id: r.id || r._id?.toString(),
  }));

  // Sort latest first and take 5
  allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentReviews = allReviews.slice(0, 5);

  return { metrics, recentReviews };
};

export default function DashboardPage() {
  const loaderData = useLoaderData();
  const metrics = loaderData?.metrics || {
    averageRating: 0,
    totalReviews: 0,
    publishedReviews: 0,
    pendingReviews: 0,
    totalRequests: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };
  const recentReviews = loaderData?.recentReviews || [];

  return (
    <Page>
      <ui-title-bar title="Dashboard"></ui-title-bar>
      <BlockStack gap="500">
        {/* KPI Cards Grid */}
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <MetricCard
            label="Overall Rating"
            value={`★ ${metrics.averageRating}`}
            subtext="Across all published reviews"
            icon={Star}
            tone="success"
          />

          <MetricCard
            label="Total Reviews"
            value={metrics.totalReviews}
            subtext={`${metrics.publishedReviews} active on storefront`}
            icon={MessageSquare}
            tone="default"
          />

          <MetricCard
            label="Pending Moderation"
            value={metrics.pendingReviews}
            subtext={
              metrics.pendingReviews > 0
                ? `${metrics.pendingReviews} waiting for approval`
                : "All reviews moderated"
            }
            icon={Clock}
            tone={metrics.pendingReviews > 0 ? "warning" : "success"}
          />

          <MetricCard
            label="Review Requests Sent"
            value={metrics.totalRequests}
            subtext="Automated fulfillment notifications"
            icon={Send}
            tone="default"
          />
        </InlineGrid>

        {/* 2-Column Section: Rating Breakdown + Next Steps */}
        <Layout>
          <Layout.Section variant="oneHalf">
            <RatingBreakdown
              distribution={metrics.distribution}
              total={metrics.publishedReviews}
              averageRating={metrics.averageRating}
            />
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Setup &amp; Next Steps</Text>

                <BlockStack gap="300">
                  <InlineStack gap="300" blockAlign="center">
                    <Badge tone="success">Ready</Badge>
                    <Text as="span" variant="bodyMd">
                      Theme App Extension block installed
                    </Text>
                  </InlineStack>

                  <InlineStack gap="300" blockAlign="center">
                    <Badge tone="info">Config</Badge>
                    <Link to="/app/settings" style={{ textDecoration: "none" }}>
                      <Button variant="plain">
                        Customize Star Colors &amp; Auto-Publish Rules →
                      </Button>
                    </Link>
                  </InlineStack>

                  <InlineStack gap="300" blockAlign="center">
                    <Badge tone="info">Import</Badge>
                    <Link to="/app/import" style={{ textDecoration: "none" }}>
                      <Button variant="plain">
                        Import Existing Reviews from Judge.me / CSV →
                      </Button>
                    </Link>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Recent Reviews Activity Section */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">Recent Reviews Activity</Text>
                  {recentReviews.length > 0 && (
                    <Link to="/app/reviews" style={{ textDecoration: "none" }}>
                      <Button variant="plain">
                        View all in Moderation Inbox →
                      </Button>
                    </Link>
                  )}
                </InlineStack>

                {recentReviews.length === 0 ? (
                  <Box padding="600">
                    <BlockStack gap="200" inlineAlign="center">
                      <Text as="p" variant="headingSm" tone="subdued">
                        No reviews collected yet
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Customer reviews will appear here once submitted on your store or imported.
                      </Text>
                    </BlockStack>
                  </Box>
                ) : (
                  <BlockStack gap="300">
                    {recentReviews.map((r) => (
                      <Box key={r.id} background="bg-surface-secondary" padding="300" borderRadius="200">
                        <BlockStack gap="200">
                          <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="200" blockAlign="center">
                              <StarRating rating={r.rating} size={14} />
                              <Text as="span" variant="bodyMd" fontWeight="semibold">
                                {r.title || "Customer Review"}
                              </Text>
                            </InlineStack>
                            <Badge tone={r.status === "PUBLISHED" ? "success" : "warning"}>
                              {r.status}
                            </Badge>
                          </InlineStack>

                          <Text as="p" variant="bodyMd">{r.body}</Text>

                          <Text as="p" variant="bodySm" tone="subdued">
                            By <Text as="span" fontWeight="medium">{r.authorName}</Text> on{" "}
                            {new Date(r.createdAt).toLocaleDateString()}
                            {r.verified && " • Verified Buyer"}
                          </Text>
                        </BlockStack>
                      </Box>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}


