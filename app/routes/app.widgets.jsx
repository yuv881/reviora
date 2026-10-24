import { useState, useMemo, useEffect } from "react";
import { useLoaderData, useSearchParams, useNavigation, useSubmit, useActionData } from "react-router";
import { authenticate } from "../shopify.server.js";
import { widgetsConfig } from "../config/widgets.config.jsx";
import { getShopSettings, updateWidgetSettings } from "../models/review.server.js";
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

      themes.sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0));
      defaultThemeId = themes[0]?.id || "current";
    }
  } catch (error) {
    console.error("Failed to query real-time themes:", error?.message || error);
  }

  if (themes.length === 0) {
    themes = [{ label: "Current Live Theme", value: "current", id: "current", isLive: true }];
  }

  const shopSettings = await getShopSettings(shop);

  // eslint-disable-next-line no-undef
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  return {
    shop,
    themes,
    defaultThemeId,
    apiKey,
    shopSettings,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const widgetId = formData.get("widgetId");

  if (!widgetId) {
    return { error: "Widget ID is required" };
  }

  const entries = Object.fromEntries(formData.entries());
  delete entries.widgetId;

  const formattedData = {};
  for (const [key, val] of Object.entries(entries)) {
    if (val === "true") formattedData[key] = true;
    else if (val === "false") formattedData[key] = false;
    else if (!isNaN(val) && typeof val === "string" && val.trim() !== "" && !val.startsWith("#")) {
      formattedData[key] = Number(val);
    } else {
      formattedData[key] = val;
    }
  }

  await updateWidgetSettings(session.shop, widgetId, formattedData);

  return { success: true, timestamp: Date.now() };
};

export default function WidgetsPage() {
  const { shop, themes, defaultThemeId, apiKey, shopSettings } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [selectedThemeId, setSelectedThemeId] = useState(defaultThemeId);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Studio customizer state
  const customizeWidgetId = searchParams.get("customize");
  const activeWidget = useMemo(
    () => widgetsConfig.find((w) => w.id === customizeWidgetId) || null,
    [customizeWidgetId]
  );

  const [settings, setSettings] = useState({});
  const isSaving = navigation.state === "submitting";

  useEffect(() => {
    if (activeWidget) {
      const saved = shopSettings?.widgetSettings?.[activeWidget.id] || {};
      setSettings({
        ...activeWidget.defaultSettings,
        ...saved,
      });
    }
  }, [activeWidget, shopSettings]);

  useEffect(() => {
    if (actionData?.success) {
      setShowSavedToast(true);
      const timer = setTimeout(() => setShowSavedToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionData]);

  const themeOptions = useMemo(
    () => themes.map((t) => ({ label: t.label, value: t.value })),
    [themes]
  );

  const getThemeEditorUrl = (template = "product", blockHandle) => {
    const base = `https://${shop}/admin/themes/${selectedThemeId}/editor?template=${template}`;
    if (apiKey && blockHandle) {
      return `${base}&addAppBlockId=${apiKey}/${blockHandle}&target=newAppsSection`;
    }
    return base;
  };

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeWidget) return;

    const payload = { widgetId: activeWidget.id };
    for (const [k, v] of Object.entries(settings)) {
      payload[k] = typeof v === "boolean" ? String(v) : v;
    }
    submit(payload, { method: "POST" });
  };

  const handleCopySnippet = (snippet) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // =========================================================================
  // VIEW 1: CUSTOMIZE WIDGET PAGE (App Bridge Native Layout)
  // =========================================================================
  if (activeWidget) {
    const editorDeepLink = getThemeEditorUrl(activeWidget.template || "product", activeWidget.blockHandle);
    const snippetCode =
      typeof activeWidget.snippet === "function" ? activeWidget.snippet(shop) : activeWidget.snippet || "";

    return (
      <s-page heading={`Customize ${activeWidget.title}`}>
        {/* Action Buttons */}
        <s-button
          slot="primary-action"
          variant="primary"
          onClick={handleSave}
          loading={isSaving ? true : undefined}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </s-button>

        <s-button
          slot="secondary-actions"
          variant="secondary"
          onClick={() => setSearchParams({})}
        >
          ← Back to Widgets
        </s-button>

        <s-button
          slot="secondary-actions"
          variant="secondary"
          onClick={() => window.open(editorDeepLink, "_blank", "noopener,noreferrer")}
        >
          Open in Theme Editor ↗
        </s-button>

        <s-stack gap="base">
          {showSavedToast && (
            <s-banner tone="success" heading="Settings saved">
              <s-paragraph>Your widget configuration has been saved successfully.</s-paragraph>
            </s-banner>
          )}

          <s-grid gridTemplateColumns="1fr 1fr" gap="base">
            {/* Left Column: Settings Configuration */}
            <s-stack gap="base">
              <s-section heading="Widget Details">
                <s-stack gap="small">
                  <s-text tone="subdued" size="small">
                    {activeWidget.description}
                  </s-text>
                  <s-box padding="base" background="subdued" borderRadius="base">
                    <s-stack gap="extra-tight">
                      <s-text size="small" weight="semibold">
                        Theme App Block Name:
                      </s-text>
                      <s-text size="small" tone="subdued">
                        {activeWidget.blockName}
                      </s-text>
                    </s-stack>
                  </s-box>
                </s-stack>
              </s-section>

              {/* Design & Colors */}
              <s-section heading="Design & Colors">
                <s-stack gap="base">
                  {settings.starColor !== undefined && (
                    <s-stack gap="extra-tight">
                      <label htmlFor="starColorInput" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                        Star & Rating Color
                      </label>
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <input
                          type="color"
                          id="starColorInput"
                          value={settings.starColor || "#FFB800"}
                          onChange={(e) => handleSettingChange("starColor", e.target.value)}
                          style={{
                            width: "44px",
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: "pointer",
                            padding: "2px",
                            background: "#fff",
                          }}
                        />
                        <input
                          type="text"
                          aria-label="Star Color Hex"
                          value={settings.starColor || "#FFB800"}
                          onChange={(e) => handleSettingChange("starColor", e.target.value)}
                          style={{
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "0 10px",
                            fontSize: "13px",
                            width: "120px",
                          }}
                        />
                      </s-stack>
                    </s-stack>
                  )}

                  {settings.badgeColor !== undefined && (
                    <s-stack gap="extra-tight">
                      <label htmlFor="badgeColorInput" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                        Verified Badge Color
                      </label>
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <input
                          type="color"
                          id="badgeColorInput"
                          value={settings.badgeColor || "#059669"}
                          onChange={(e) => handleSettingChange("badgeColor", e.target.value)}
                          style={{
                            width: "44px",
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: "pointer",
                            padding: "2px",
                            background: "#fff",
                          }}
                        />
                        <input
                          type="text"
                          aria-label="Badge Color Hex"
                          value={settings.badgeColor || "#059669"}
                          onChange={(e) => handleSettingChange("badgeColor", e.target.value)}
                          style={{
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "0 10px",
                            fontSize: "13px",
                            width: "120px",
                          }}
                        />
                      </s-stack>
                    </s-stack>
                  )}

                  {settings.accentColor !== undefined && (
                    <s-stack gap="extra-tight">
                      <label htmlFor="accentColorInput" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                        Accent Color
                      </label>
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <input
                          type="color"
                          id="accentColorInput"
                          value={settings.accentColor || "#10B981"}
                          onChange={(e) => handleSettingChange("accentColor", e.target.value)}
                          style={{
                            width: "44px",
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: "pointer",
                            padding: "2px",
                            background: "#fff",
                          }}
                        />
                        <input
                          type="text"
                          aria-label="Accent Color Hex"
                          value={settings.accentColor || "#10B981"}
                          onChange={(e) => handleSettingChange("accentColor", e.target.value)}
                          style={{
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "0 10px",
                            fontSize: "13px",
                            width: "120px",
                          }}
                        />
                      </s-stack>
                    </s-stack>
                  )}

                  {settings.textColor !== undefined && (
                    <s-stack gap="extra-tight">
                      <label htmlFor="textColorInput" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                        Text Color
                      </label>
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <input
                          type="color"
                          id="textColorInput"
                          value={settings.textColor || "#0F172A"}
                          onChange={(e) => handleSettingChange("textColor", e.target.value)}
                          style={{
                            width: "44px",
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: "pointer",
                            padding: "2px",
                            background: "#fff",
                          }}
                        />
                        <input
                          type="text"
                          aria-label="Text Color Hex"
                          value={settings.textColor || "#0F172A"}
                          onChange={(e) => handleSettingChange("textColor", e.target.value)}
                          style={{
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "0 10px",
                            fontSize: "13px",
                            width: "120px",
                          }}
                        />
                      </s-stack>
                    </s-stack>
                  )}

                  {settings.buttonColor !== undefined && (
                    <s-stack gap="extra-tight">
                      <label htmlFor="buttonColorInput" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                        Button Background Color
                      </label>
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <input
                          type="color"
                          id="buttonColorInput"
                          value={settings.buttonColor || "#10B981"}
                          onChange={(e) => handleSettingChange("buttonColor", e.target.value)}
                          style={{
                            width: "44px",
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: "pointer",
                            padding: "2px",
                            background: "#fff",
                          }}
                        />
                        <input
                          type="text"
                          aria-label="Button Color Hex"
                          value={settings.buttonColor || "#10B981"}
                          onChange={(e) => handleSettingChange("buttonColor", e.target.value)}
                          style={{
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "0 10px",
                            fontSize: "13px",
                            width: "120px",
                          }}
                        />
                      </s-stack>
                    </s-stack>
                  )}

                  {settings.layout !== undefined && (
                    <s-select
                      label="Layout Style"
                      value={settings.layout || "standard"}
                      onChange={(e) => handleSettingChange("layout", e.target.value)}
                    >
                      <s-option value="standard">Standard</s-option>
                      <s-option value="compact">Compact</s-option>
                      <s-option value="grid">Grid (Cards)</s-option>
                    </s-select>
                  )}
                </s-stack>
              </s-section>

              {/* Content & Options */}
              <s-section heading="Content & Options">
                <s-stack gap="base">
                  {(settings.headerTitle !== undefined || settings.heading !== undefined) && (
                    <s-text-field
                      label="Widget Title / Heading"
                      value={settings.headerTitle || settings.heading || ""}
                      onInput={(e) =>
                        handleSettingChange(
                          settings.headerTitle !== undefined ? "headerTitle" : "heading",
                          e.target.value
                        )
                      }
                    />
                  )}

                  {settings.subheading !== undefined && (
                    <s-text-field
                      label="Subheading"
                      value={settings.subheading || ""}
                      onInput={(e) => handleSettingChange("subheading", e.target.value)}
                    />
                  )}

                  {settings.buttonText !== undefined && (
                    <s-text-field
                      label="Button Text"
                      value={settings.buttonText || ""}
                      onInput={(e) => handleSettingChange("buttonText", e.target.value)}
                    />
                  )}

                  {settings.showVerifiedBadge !== undefined && (
                    <s-checkbox
                      label="Show 'Verified Buyer' badge"
                      checked={Boolean(settings.showVerifiedBadge)}
                      onChange={(e) => handleSettingChange("showVerifiedBadge", e.target.checked)}
                    />
                  )}

                  {settings.showBreakdown !== undefined && (
                    <s-checkbox
                      label="Show Rating Breakdown summary bar"
                      checked={Boolean(settings.showBreakdown)}
                      onChange={(e) => handleSettingChange("showBreakdown", e.target.checked)}
                    />
                  )}

                  {settings.showRatingFilter !== undefined && (
                    <s-checkbox
                      label="Enable 1-5 Star filter buttons"
                      checked={Boolean(settings.showRatingFilter)}
                      onChange={(e) => handleSettingChange("showRatingFilter", e.target.checked)}
                    />
                  )}

                  {settings.showMediaUpload !== undefined && (
                    <s-checkbox
                      label="Allow customer photo & video uploads"
                      checked={Boolean(settings.showMediaUpload)}
                      onChange={(e) => handleSettingChange("showMediaUpload", e.target.checked)}
                    />
                  )}

                  {settings.showNumericRating !== undefined && (
                    <s-checkbox
                      label="Display numeric score (e.g. 4.9)"
                      checked={Boolean(settings.showNumericRating)}
                      onChange={(e) => handleSettingChange("showNumericRating", e.target.checked)}
                    />
                  )}

                  {settings.showReviewCount !== undefined && (
                    <s-checkbox
                      label="Display total review count"
                      checked={Boolean(settings.showReviewCount)}
                      onChange={(e) => handleSettingChange("showReviewCount", e.target.checked)}
                    />
                  )}

                  {settings.autoplay !== undefined && (
                    <s-checkbox
                      label="Autoplay carousel slides"
                      checked={Boolean(settings.autoplay)}
                      onChange={(e) => handleSettingChange("autoplay", e.target.checked)}
                    />
                  )}

                  {settings.reviewsPerPage !== undefined && (
                    <s-select
                      label="Reviews per page"
                      value={String(settings.reviewsPerPage || 5)}
                      onChange={(e) => handleSettingChange("reviewsPerPage", Number(e.target.value))}
                    >
                      <s-option value="3">3 reviews</s-option>
                      <s-option value="5">5 reviews</s-option>
                      <s-option value="10">10 reviews</s-option>
                    </s-select>
                  )}

                  {settings.limit !== undefined && (
                    <s-select
                      label="Max reviews to display"
                      value={String(settings.limit || 6)}
                      onChange={(e) => handleSettingChange("limit", Number(e.target.value))}
                    >
                      <s-option value="4">4 reviews</s-option>
                      <s-option value="6">6 reviews</s-option>
                      <s-option value="8">8 reviews</s-option>
                      <s-option value="12">12 reviews</s-option>
                    </s-select>
                  )}
                </s-stack>
              </s-section>
            </s-stack>

            {/* Right Column: Preview & Installation */}
            <s-stack gap="base">
              <s-section heading="Widget Preview">
                <s-stack gap="base">
                  <s-box padding="base" background="subdued" borderRadius="base">
                    <div
                      style={{
                        height: "240px",
                        background:
                          activeWidget.preview?.gradient ||
                          "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "8px",
                        padding: "16px",
                        boxSizing: "border-box",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {activeWidget.preview?.render ? (
                        activeWidget.preview.render()
                      ) : (
                        <div
                          style={{
                            background: "#ffffff",
                            borderRadius: "8px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            padding: "20px",
                            textAlign: "center",
                            maxWidth: "280px",
                          }}
                        >
                          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
                            {activeWidget.preview?.icon || "✨"}
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>
                            {settings.headerTitle || settings.heading || activeWidget.title}
                          </div>
                          <div
                            style={{
                              fontSize: "14px",
                              color: settings.starColor || "#FFB800",
                              marginTop: "6px",
                              letterSpacing: "2px",
                            }}
                          >
                            ★ ★ ★ ★ ★
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
                            {activeWidget.blockName}
                          </div>
                        </div>
                      )}
                    </div>
                  </s-box>

                  <s-text tone="subdued" size="small">
                    Colors and titles configured on the left will automatically apply to this block on your live store.
                  </s-text>
                </s-stack>
              </s-section>

              <s-section heading="Installation & Theme Editor">
                <s-stack gap="base">
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
                        3. Select <strong>{activeWidget.blockName}</strong>, position it, and click <strong>Save</strong>.
                      </s-text>
                    </s-stack>
                  </s-stack>

                  <s-button
                    variant="primary"
                    onClick={() => window.open(editorDeepLink, "_blank", "noopener,noreferrer")}
                  >
                    Open in Theme Editor ↗
                  </s-button>

                  <s-divider></s-divider>

                  <s-stack gap="small">
                    <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                      <s-text size="small" weight="semibold">
                        Liquid / HTML Snippet:
                      </s-text>
                      <s-button
                        variant="tertiary"
                        onClick={() => handleCopySnippet(snippetCode)}
                      >
                        {copiedSnippet ? "Copied!" : "Copy Snippet"}
                      </s-button>
                    </s-stack>
                    <s-box padding="base" background="subdued" borderRadius="base">
                      <pre
                        style={{
                          margin: 0,
                          fontSize: "11px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          fontFamily: "monospace",
                        }}
                      >
                        {snippetCode}
                      </pre>
                    </s-box>
                  </s-stack>
                </s-stack>
              </s-section>
            </s-stack>
          </s-grid>
        </s-stack>
      </s-page>
    );
  }

  // =========================================================================
  // VIEW 2: ALL WIDGETS LIST (Standard App Bridge Page)
  // =========================================================================
  return (
    <s-page heading="Widgets">
      <s-stack gap="base">
        {/* Theme Selector Section */}
        <s-section>
          <s-stack
            direction="inline"
            justifyContent="space-between"
            alignItems="center"
            wrap="wrap"
            gap="base"
          >
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

        {/* Dynamic Widgets Grid */}
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap="base">
          {widgetsConfig.map((widget) => {
            const editorUrl = getThemeEditorUrl(widget.template || "product", widget.blockHandle);

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
                        onClick={() => setSearchParams({ customize: widget.id })}
                      >
                        Customize
                      </s-button>

                      <s-button
                        size="slim"
                        variant="tertiary"
                        onClick={() => window.open(`/app/widgets?customize=${widget.id}`, "_blank")}
                      >
                        ↗
                      </s-button>
                    </s-stack>
                  </s-stack>
                </s-stack>
              </s-section>
            );
          })}
        </s-grid>
      </s-stack>
    </s-page>
  );
}
