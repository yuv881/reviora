import { useState, useMemo } from "react";
import { useLoaderData } from "react-router";

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
    <s-page heading="Widgets">
      <s-stack gap="base">
        {/* Top Control Bar: Real-time Theme Selector */}
        <s-section>
          <s-stack direction="inline" justifyContent="space-between" alignItems="center" wrap="wrap" gap="base">
            <s-stack gap="extra-tight">
              <s-heading size="small">Storefront Widgets</s-heading>
              <s-text tone="subdued" size="small">
                Manage, install, and customize review widgets across your store themes.
              </s-text>
            </s-stack>

            <div style={{ minWidth: "260px" }}>
              <s-select
                label="Select Theme to Customize"
                value={selectedThemeId}
                onChange={(e) => setSelectedThemeId(e.target.value)}
              >
                {themeOptions.map((opt) => (
                  <s-option key={opt.value} value={opt.value}>
                    {opt.label}
                  </s-option>
                ))}
              </s-select>
            </div>
          </s-stack>
        </s-section>

        {/* Dynamic Widgets Grid from config/widgets.config.jsx */}
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap="base">
          {widgetsConfig.map((widget) => {
            const editorUrl = getThemeEditorUrl(widget.template || "product");
            const snippetCode =
              typeof widget.snippet === "function" ? widget.snippet(shop) : widget.snippet || "";

            return (
              <s-section key={widget.id}>
                <s-stack gap="base">
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
                      borderRadius: "8px",
                      padding: "12px",
                      boxSizing: "border-box",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {widget.preview?.render ? (
                      widget.preview.render()
                    ) : (
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
                  <s-stack gap="small">
                    <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                      <s-heading size="small">{widget.title}</s-heading>
                      {widget.badge && (
                        <s-badge tone={widget.badgeTone || "success"}>{widget.badge}</s-badge>
                      )}
                    </s-stack>

                    <div style={{ minHeight: "44px" }}>
                      <s-text tone="subdued" size="small">
                        {widget.description}
                      </s-text>
                    </div>

                    <s-stack direction="inline" gap="small" alignItems="center">
                      {widget.hasInstall && (
                        <s-button
                          size="slim"
                          onClick={() => window.open(editorUrl, "_blank", "noopener,noreferrer")}
                        >
                          Install ↗
                        </s-button>
                      )}

                      <s-button
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
                      </s-button>
                    </s-stack>
                  </s-stack>
                </s-stack>
              </s-section>
            );
          })}
        </s-grid>
      </s-stack>

      {/* Customize & Setup Modal */}
      {selectedWidget && (
        <s-modal
          id="widget-customize-modal"
          heading={`Customize ${selectedWidget.title}`}
          open
          onClose={() => setSelectedWidget(null)}
        >
          <s-stack gap="base">
            <s-paragraph>{selectedWidget.description}</s-paragraph>

            <s-box padding="base" background="subdued" borderRadius="base">
              <s-stack gap="extra-tight">
                <s-text size="small" weight="semibold">
                  Shopify Theme Block Name:
                </s-text>
                <s-text size="small" tone="subdued">
                  {selectedWidget.blockName}
                </s-text>
              </s-stack>
            </s-box>

            <s-divider></s-divider>

            <s-stack gap="small">
              <s-heading size="small">How to add to your theme:</s-heading>
              <s-stack direction="inline" gap="small" alignItems="center">
                <CheckCircle2 size={16} color="#059669" />
                <s-text size="small">
                  1. Click <strong>Open in Theme Editor</strong> below.
                </s-text>
              </s-stack>
              <s-stack direction="inline" gap="small" alignItems="center">
                <CheckCircle2 size={16} color="#059669" />
                <s-text size="small">
                  2. In the template sections panel, click <strong>Add block</strong> or <strong>Add section</strong>.
                </s-text>
              </s-stack>
              <s-stack direction="inline" gap="small" alignItems="center">
                <CheckCircle2 size={16} color="#059669" />
                <s-text size="small">
                  3. Select <strong>{selectedWidget.blockName}</strong>, position it, and click <strong>Save</strong>.
                </s-text>
              </s-stack>
            </s-stack>

            <s-divider></s-divider>

            <s-stack gap="small">
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-text size="small" weight="semibold">Liquid / HTML Snippet:</s-text>
                <s-button
                  variant="tertiary"
                  onClick={() => handleCopySnippet(selectedWidget.snippetCode)}
                >
                  {copiedSnippet ? "Copied!" : "Copy Snippet"}
                </s-button>
              </s-stack>
              <s-box padding="base" background="subdued" borderRadius="base">
                <pre style={{ margin: 0, fontSize: "11px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {selectedWidget.snippetCode}
                </pre>
              </s-box>
            </s-stack>
          </s-stack>

          <s-button
            slot="primary-action"
            variant="primary"
            onClick={() => window.open(selectedWidget.editorUrl, "_blank", "noopener,noreferrer")}
          >
            Open in Theme Editor
          </s-button>
          <s-button
            slot="secondary-actions"
            variant="secondary"
            onClick={() => setSelectedWidget(null)}
          >
            Done
          </s-button>
        </s-modal>
      )}
    </s-page>
  );
}
