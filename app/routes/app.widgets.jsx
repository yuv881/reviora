import { useState } from "react";
import { useLoaderData } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Badge,
  Button,
  Text,
  Box,
  Banner,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";
import { StarRating } from "../components/StarRating.jsx";
import { RatingBreakdown } from "../components/RatingBreakdown.jsx";
import { CheckCircle2, Sparkles, Layers, Star, MessageSquare } from "lucide-react";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const themeEditorUrl = `https://${shop}/admin/themes/current/editor?context=apps`;
  const productThemeEditorUrl = `https://${shop}/admin/themes/current/editor?template=product`;

  return {
    shop,
    themeEditorUrl,
    productThemeEditorUrl,
  };
};

export default function WidgetsPage() {
  const { productThemeEditorUrl } = useLoaderData();
  const [activePreview, setActivePreview] = useState("review_widget");

  const sampleDistribution = { 5: 18, 4: 5, 3: 1, 2: 0, 1: 0 };

  return (
    <Page
      title="Storefront Widgets"
      subtitle="Enable, customize, and preview customer review widgets on your online store theme."
      primaryAction={{
        content: "Open Theme Editor",
        url: productThemeEditorUrl,
        external: true,
      }}
    >
      <BlockStack gap="500">
        {/* Quick Setup Guide Banner */}
        <Banner
          title="How to display Reviora widgets on your theme"
          tone="info"
          action={{
            content: "Customize in Theme Editor",
            url: productThemeEditorUrl,
            external: true,
          }}
        >
          <p>
            Reviora uses Shopify&apos;s native <strong>Online Store 2.0 Theme App Extensions</strong>. You can drag and drop widgets anywhere on your product pages without modifying your theme code.
          </p>
        </Banner>

        {/* Widgets Grid */}
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          {/* Widget 1: Main Reviews Section */}
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Box
                    background="bg-surface-secondary"
                    padding="200"
                    borderRadius="200"
                  >
                    <MessageSquare size={20} color="#2563eb" />
                  </Box>
                  <Text as="h2" variant="headingMd">
                    Product Reviews Widget
                  </Text>
                </InlineStack>
                <Badge tone="success">Theme Block</Badge>
              </InlineStack>

              <Text as="p" variant="bodyMd" tone="subdued">
                The primary review section for your product pages. Features aggregate rating, star breakdown, photo reviews, helpful voting, merchant replies, and review submission modal.
              </Text>

              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" fontWeight="semibold">Recommended Placement:</Text>
                  <Text as="p" variant="bodySm" tone="subdued">Product template → Add block → Reviora Reviews Widget</Text>
                </BlockStack>
              </Box>

              <InlineStack align="space-between" blockAlign="center">
                <Button
                  variant={activePreview === "review_widget" ? "primary" : "secondary"}
                  size="slim"
                  onClick={() => setActivePreview("review_widget")}
                >
                  {activePreview === "review_widget" ? "Viewing Preview" : "Preview Widget"}
                </Button>

                <Button
                  variant="plain"
                  url={productThemeEditorUrl}
                  external
                >
                  Add in Theme Editor →
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>

          {/* Widget 2: Star Rating Badge */}
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Box
                    background="bg-surface-secondary"
                    padding="200"
                    borderRadius="200"
                  >
                    <Star size={20} color="#f59e0b" />
                  </Box>
                  <Text as="h2" variant="headingMd">
                    Star Rating Badge
                  </Text>
                </InlineStack>
                <Badge tone="info">Compact Block</Badge>
              </InlineStack>

              <Text as="p" variant="bodyMd" tone="subdued">
                A lightweight star rating and review count badge designed to be placed directly beneath product titles and prices. Automatically smooth-scrolls to the full review section on click.
              </Text>

              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" fontWeight="semibold">Recommended Placement:</Text>
                  <Text as="p" variant="bodySm" tone="subdued">Product template → Under Product Title or Price</Text>
                </BlockStack>
              </Box>

              <InlineStack align="space-between" blockAlign="center">
                <Button
                  variant={activePreview === "star_rating" ? "primary" : "secondary"}
                  size="slim"
                  onClick={() => setActivePreview("star_rating")}
                >
                  {activePreview === "star_rating" ? "Viewing Preview" : "Preview Badge"}
                </Button>

                <Button
                  variant="plain"
                  url={productThemeEditorUrl}
                  external
                >
                  Add in Theme Editor →
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* Live Preview Container */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <Sparkles size={18} color="#7c3aed" />
                <Text as="h2" variant="headingMd">
                  Storefront Live Preview
                </Text>
              </InlineStack>
              <Badge tone="subdued">
                {activePreview === "review_widget" ? "Full Reviews Widget" : "Star Rating Badge"}
              </Badge>
            </InlineStack>

            <Divider />

            {/* Preview Canvas */}
            <Box
              padding="600"
              background="bg-surface-secondary"
              borderRadius="300"
              borderColor="border"
              borderWidth="025"
            >
              {activePreview === "star_rating" ? (
                /* Star Rating Badge Preview */
                <Box padding="400" background="bg-surface" borderRadius="200" shadow="100">
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">Preview beneath product title:</Text>
                    <Text as="h3" variant="headingLg">The Complete Snowboard</Text>
                    <InlineStack gap="200" blockAlign="center">
                      <StarRating rating={4.8} size={18} />
                      <Text as="span" variant="bodyMd" fontWeight="semibold">4.8</Text>
                      <Text as="span" variant="bodySm" tone="subdued">(24 reviews)</Text>
                    </InlineStack>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">$685.00</Text>
                  </BlockStack>
                </Box>
              ) : (
                /* Full Reviews Widget Preview */
                <Box padding="500" background="bg-surface" borderRadius="200" shadow="100">
                  <BlockStack gap="500">
                    {/* Header Breakdown */}
                    <InlineStack align="space-between" blockAlign="center" wrap>
                      <BlockStack gap="100">
                        <Text as="h3" variant="headingLg">Customer Reviews</Text>
                        <InlineStack gap="200" blockAlign="center">
                          <StarRating rating={4.8} size={20} />
                          <Text as="span" variant="bodyMd" fontWeight="bold">4.8 out of 5</Text>
                          <Text as="span" variant="bodySm" tone="subdued">Based on 24 reviews</Text>
                        </InlineStack>
                      </BlockStack>

                      <Button variant="primary">Write a Review</Button>
                    </InlineStack>

                    <Divider />

                    {/* Breakdown */}
                    <RatingBreakdown
                      distribution={sampleDistribution}
                      totalReviews={24}
                      averageRating={4.8}
                    />

                    <Divider />

                    {/* Sample Review Card */}
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <InlineStack gap="200" blockAlign="center">
                            <StarRating rating={5} size={16} />
                            <Text as="span" fontWeight="bold">Alex M.</Text>
                            <Badge tone="success">Verified Buyer</Badge>
                          </InlineStack>
                          <Text as="span" variant="bodySm" tone="subdued">2 days ago</Text>
                        </InlineStack>
                        <Text as="p" fontWeight="semibold">Incredible board quality and ride feel!</Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Took this out on the mountain this weekend. It carved powder effortlessly and felt super responsive. Highly recommended!
                        </Text>
                      </BlockStack>
                    </Box>
                  </BlockStack>
                </Box>
              )}
            </Box>
          </BlockStack>
        </Card>

        {/* 3-Step Setup Instructions Card */}
        <Card>
          <BlockStack gap="400">
            <InlineStack gap="200" blockAlign="center">
              <Layers size={18} color="#059669" />
              <Text as="h2" variant="headingMd">3-Step Theme Setup</Text>
            </InlineStack>

            <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <CheckCircle2 size={16} color="#059669" />
                    <Text as="span" fontWeight="semibold">1. Open Theme</Text>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Click &quot;Open Theme Editor&quot; above to open Shopify&apos;s live customizer on your current theme.
                  </Text>
                </BlockStack>
              </Box>

              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <CheckCircle2 size={16} color="#059669" />
                    <Text as="span" fontWeight="semibold">2. Add App Block</Text>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Navigate to your Product template and click <strong>Add block</strong> or <strong>Add section</strong>.
                  </Text>
                </BlockStack>
              </Box>

              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <CheckCircle2 size={16} color="#059669" />
                    <Text as="span" fontWeight="semibold">3. Position &amp; Save</Text>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Drag the block to your desired position on the page and click <strong>Save</strong> in the top right.
                  </Text>
                </BlockStack>
              </Box>
            </InlineGrid>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
