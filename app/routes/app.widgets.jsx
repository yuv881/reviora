import { useState, useMemo } from "react";
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
  Select,
  Modal,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";
import { widgetsConfig } from "../config/widgets.config.jsx";
import { CheckCircle2 } from "lucide-react";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Real-time theme fetching via Admin GraphQL
  let themes = [];
  let defaultThemeId = "current";

  try {
    const response = await admin.graphql(
      `#graphql
      query getStoreThemes {
        themes(first: 25) {
          nodes {
            id
            name
            role
          }
        }
      }`
    );

    const json = await response.json();
    const nodes = json?.data?.themes?.nodes || [];

    if (nodes.length > 0) {
      themes = nodes.map((t) => {
        const numericId = t.id ? t.id.split("/").pop() : "current";
        const isLive = t.role === "MAIN";
        return {
          id: numericId,
          name: t.name,
          role: t.role,
          isLive,
          label: isLive ? `${t.name} (live)` : `${t.name} (${t.role ? t.role.toLowerCase() : "unpublished"})`,
          value: numericId,
        };
      });

      // Sort live theme to the top
      themes.sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0));
      defaultThemeId = themes[0]?.id || "current";
    }
  } catch (error) {
    console.error("Failed to query real-time themes:", error?.message || error);
  }

  if (themes.length === 0) {
    themes = [{ label: "Current Live Theme", value: "current", id: "current", isLive: true }];
  }

  return {
    shop,
    themes,
    defaultThemeId,
  };
};

export default function WidgetsPage() {
  const { shop, themes, defaultThemeId } = useLoaderData();
  const [selectedThemeId, setSelectedThemeId] = useState(defaultThemeId);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const themeOptions = useMemo(
    () => themes.map((t) => ({ label: t.label, value: t.value })),
    [themes]
  );

  const getThemeEditorUrl = (template = "product") => {
    return `https://${shop}/admin/themes/${selectedThemeId}/editor?template=${template}`;
  };

  const handleCopySnippet = (snippet) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <Page>
      <ui-title-bar title="Widgets" />
      <BlockStack gap="500">
        {/* Top Control Bar: Real-time Theme Selector */}
        <Card>
          <InlineStack align="space-between" blockAlign="center" wrap gap="400">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                Storefront Widgets
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Manage, install, and customize review widgets across your store themes.
              </Text>
            </BlockStack>

            <Box minWidth="260px">
              <Select
                label="Select Theme to Customize"
                options={themeOptions}
                value={selectedThemeId}
                onChange={setSelectedThemeId}
              />
            </Box>
          </InlineStack>
        </Card>

        {/* Dynamic Widgets Grid from config/widgets.config.jsx */}
        <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
          {widgetsConfig.map((widget) => {
            const editorUrl = getThemeEditorUrl(widget.template || "product");
            const snippetCode =
              typeof widget.snippet === "function" ? widget.snippet(shop) : widget.snippet || "";

            return (
              <Card key={widget.id} padding="0">
                <BlockStack>
                  {/* Top Graphic Header */}
                  <div
                    style={{
                      height: "175px",
                      background:
                        widget.preview?.gradient ||
                        "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderTopLeftRadius: "var(--p-border-radius-300, 12px)",
                      borderTopRightRadius: "var(--p-border-radius-300, 12px)",
                      padding: "12px",
                      boxSizing: "border-box",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {widget.preview?.render ? (
                      widget.preview.render()
                    ) : (
                      /* Default Fallback Preview if no custom render was provided */
                      <div
                        style={{
                          width: "86%",
                          background: "#ffffff",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          padding: "16px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: "24px", marginBottom: "6px" }}>
                          {widget.preview?.icon || "✨"}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b" }}>
                          {widget.title}
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                          {widget.blockName || "Theme App Block"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <Box padding="400">
                    <BlockStack gap="300">
                      {/* Title + Badge */}
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h2" variant="headingMd">
                          {widget.title}
                        </Text>
                        {widget.badge && (
                          <Badge tone={widget.badgeTone || "success"}>{widget.badge}</Badge>
                        )}
                      </InlineStack>

                      {/* Description */}
                      <div style={{ minHeight: "44px" }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {widget.description}
                        </Text>
                      </div>

                      {/* Action Buttons */}
                      <InlineStack gap="200" blockAlign="center">
                        {widget.hasInstall && (
                          <Button size="slim" url={editorUrl} external>
                            Install ↗
                          </Button>
                        )}

                        <Button
                          size="slim"
                          variant="secondary"
                          onClick={() =>
                            setSelectedWidget({
                              ...widget,
                              editorUrl,
                              snippetCode,
                            })
                          }
                        >
                          Customize
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>
            );
          })}
        </InlineGrid>
      </BlockStack>

      {/* Customize & Setup Modal */}
      {selectedWidget && (
        <Modal
          open={Boolean(selectedWidget)}
          onClose={() => setSelectedWidget(null)}
          title={`Customize ${selectedWidget.title}`}
          primaryAction={{
            content: "Open in Theme Editor",
            url: selectedWidget.editorUrl,
            external: true,
          }}
          secondaryActions={[
            {
              content: "Done",
              onAction: () => setSelectedWidget(null),
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd">
                {selectedWidget.description}
              </Text>

              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Shopify Theme Block Name:
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {selectedWidget.blockName}
                  </Text>
                </BlockStack>
              </Box>

              <Divider />

              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  How to add to your theme:
                </Text>
                <InlineStack gap="200" blockAlign="center">
                  <CheckCircle2 size={16} color="#059669" />
                  <Text as="p" variant="bodySm">
                    1. Click <strong>Open in Theme Editor</strong> below.
                  </Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="center">
                  <CheckCircle2 size={16} color="#059669" />
                  <Text as="p" variant="bodySm">
                    2. In the template sections panel, click <strong>Add block</strong> or <strong>Add section</strong>.
                  </Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="center">
                  <CheckCircle2 size={16} color="#059669" />
                  <Text as="p" variant="bodySm">
                    3. Select <strong>{selectedWidget.blockName}</strong>, position it, and click <strong>Save</strong>.
                  </Text>
                </InlineStack>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Liquid / HTML Snippet:
                  </Text>
                  <Button
                    size="slim"
                    variant="plain"
                    onClick={() => handleCopySnippet(selectedWidget.snippetCode)}
                  >
                    {copiedSnippet ? "Copied!" : "Copy Snippet"}
                  </Button>
                </InlineStack>
                <Box
                  padding="300"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <pre style={{ margin: 0, fontSize: "11px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {selectedWidget.snippetCode}
                  </pre>
                </Box>
              </BlockStack>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
