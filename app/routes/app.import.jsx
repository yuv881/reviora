import { useState, useEffect } from "react";
import { useActionData, useNavigation, useSubmit, useFetcher } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  DropZone,
  Banner,
  Button,
  TextField,
  Text,
  Badge,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";
import { createReview, exportReviewsToCsv } from "../models/review.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  if (url.searchParams.get("export") === "true") {
    const csvData = await exportReviewsToCsv(session.shop);
    return new Response(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reviora_reviews_${session.shop}_export.csv"`,
      },
    });
  }

  return null;
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "export") {
    try {
      const csvData = await exportReviewsToCsv(session.shop);
      const safeShop = (session.shop || "store").replace(/[^a-z0-9]/gi, "_");
      return {
        exportSuccess: true,
        csvData,
        filename: `reviora_reviews_${safeShop}_export.csv`,
      };
    } catch (err) {
      console.error("Export reviews error:", err);
      return { exportError: "Failed to generate CSV export. Please try again." };
    }
  }

  const rawCsv = formData.get("rawCsv");

  if (!rawCsv || !rawCsv.trim()) {
    return { error: "Please drop or select a CSV file, or paste CSV data." };
  }

  const lines = rawCsv.trim().split("\n");
  if (lines.length < 2) {
    return { error: "CSV must contain a header row and at least one data row." };
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
  let importedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));

    let rating = 5;
    let title = "";
    let body = "";
    let authorName = "Customer";
    let authorEmail = "customer@example.com";
    let productHandle = "the-complete-snowboard";

    headers.forEach((h, idx) => {
      const val = cols[idx] || "";
      if (h.includes("rating") || h.includes("stars") || h.includes("score")) {
        rating = parseInt(val) || 5;
      } else if (h.includes("title") || h.includes("headline") || h.includes("subject")) {
        title = val;
      } else if (
        h.includes("body") ||
        h.includes("review") ||
        h.includes("content") ||
        h.includes("feedback") ||
        h.includes("text")
      ) {
        body = val;
      } else if (
        h.includes("name") ||
        h.includes("author") ||
        h.includes("reviewer") ||
        h.includes("user")
      ) {
        authorName = val;
      } else if (h.includes("email")) {
        authorEmail = val;
      } else if (
        h.includes("product") ||
        h.includes("handle") ||
        h.includes("item") ||
        h.includes("sku")
      ) {
        productHandle = val;
      }
    });

    if (body) {
      await createReview({
        shop: session.shop,
        productId: productHandle,
        productHandle,
        productTitle: productHandle,
        rating,
        title,
        body,
        authorName,
        authorEmail,
        verified: true,
      });
      importedCount++;
    }
  }

  return { success: true, count: importedCount };
};

// Available review apps matching Judge.me list
const REVIEW_APPS_LIST = [
  {
    id: "loox",
    name: "Loox",
    bgColor: "#000000",
    color: "#FFFFFF",
    logoText: "LOOX",
  },
  {
    id: "yotpo",
    name: "Yotpo",
    bgColor: "#0D57F8",
    color: "#FFFFFF",
    logoText: "yotpo.",
  },
  {
    id: "air_reviews",
    name: "Air Reviews",
    bgColor: "#192248",
    color: "#60A5FA",
    logoText: "A",
  },
  {
    id: "klaviyo",
    name: "Klaviyo Reviews",
    bgColor: "#1F2937",
    color: "#F43F5E",
    logoText: "⚑",
  },
  {
    id: "areviews",
    name: "Areviews",
    bgColor: "#CBD5E1",
    color: "#334155",
    logoText: "🐳",
  },
  {
    id: "trustoo",
    name: "Trustoo.io",
    bgColor: "#E02B20",
    color: "#FFFFFF",
    logoText: "T.",
  },
  {
    id: "doran",
    name: "Doran",
    bgColor: "#00966B",
    color: "#FDE047",
    logoText: "★",
  },
  {
    id: "vitals",
    name: "Vitals",
    bgColor: "#4C1D95",
    color: "#FFFFFF",
    logoText: "vitals",
  },
  {
    id: "judge_me",
    name: "Judge.me",
    bgColor: "#0D3349",
    color: "#38BDF8",
    logoText: "J.me",
  },
  {
    id: "okendo",
    name: "Okendo",
    bgColor: "#000000",
    color: "#FFFFFF",
    logoText: "OKENDO",
  },
  {
    id: "shopify",
    name: "Shopify Product Reviews",
    bgColor: "#1C2024",
    color: "#95BF47",
    logoText: "🛍️",
  },
];

// Available platforms matching Judge.me list
const PLATFORMS_LIST = [
  { id: "aliexpress", name: "AliExpress", bgColor: "#FF3838", color: "#FFFFFF", logoText: "Ali" },
  { id: "amazon", name: "Amazon", bgColor: "#FFFFFF", color: "#111827", isAmazon: true },
  { id: "etsy", name: "Etsy", bgColor: "#FFFFFF", color: "#F1641E", logoText: "Etsy", isEtsy: true },
  { id: "google", name: "Google Customer Reviews", isGoogle: true },
  { id: "meta", name: "Meta / Facebook Reviews", isMeta: true },
];

export default function ImportPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const exportFetcher = useFetcher();

  const isImporting = navigation.state === "submitting";
  const isExporting = exportFetcher.state !== "idle";

  // Navigation view: null (main 4 choices) | "apps" | "spreadsheet" | "platforms" | "store"
  const [currentView, setCurrentView] = useState(null);

  // App/platform search query
  const [searchAppQuery, setSearchAppQuery] = useState("");

  // Currently selected item for upload in subview
  const [selectedItem, setSelectedItem] = useState(null);

  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [showRawEditor, setShowRawEditor] = useState(false);

  // Auto-clear when import completes
  useEffect(() => {
    if (actionData?.success) {
      setSelectedItem(null);
      setCsvContent("");
      setFileName("");
      setRowCount(0);
    }
  }, [actionData]);

  // Trigger client-side file download when export completes
  useEffect(() => {
    if (exportFetcher.data?.exportSuccess && exportFetcher.data?.csvData) {
      const blob = new Blob([exportFetcher.data.csvData], {
        type: "text/csv;charset=utf-8;",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", exportFetcher.data.filename || "reviews_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }
  }, [exportFetcher.data]);

  const handleExport = () => {
    exportFetcher.submit({ intent: "export" }, { method: "POST" });
  };

  const handleNavigateTo = (view) => {
    setCurrentView(view);
    setSearchAppQuery("");
    setSelectedItem(null);
    setCsvContent("");
    setFileName("");
    setRowCount(0);
    setShowRawEditor(false);
  };

  const handleBackToMain = () => {
    setCurrentView(null);
    setSearchAppQuery("");
    setSelectedItem(null);
    setCsvContent("");
    setFileName("");
    setRowCount(0);
  };

  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result || "";
      setCsvContent(text);
      setFileName(file.name);
      const rows = text.trim().split("\n").filter(Boolean);
      const dataRows = Math.max(0, rows.length - 1);
      setRowCount(dataRows);
    };
    reader.readAsText(file);
  };

  const handleDrop = (_droppedFiles, acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  };

  const handleClearFile = () => {
    setCsvContent("");
    setFileName("");
    setRowCount(0);
  };

  const loadSampleData = (item) => {
    let sample = "";
    if (currentView === "platforms") {
      sample =
        `feedback,score,author,product_handle\n` +
        `"Fast international shipping, exactly as described! A+++",5,"David K.","the-complete-snowboard"\n` +
        `"Very nice material, bought for my brother and he loves it",5,"Elena R.","the-complete-snowboard"`;
      setFileName(`${item?.id || "platform"}_reviews.csv`);
    } else if (currentView === "spreadsheet") {
      sample =
        `title,body,rating,reviewer_name,reviewer_email,product_handle\n` +
        `"Top tier performance","Solid construction, works great everyday.",5,"Sarah Jenkins","sarah.j@example.com","the-complete-snowboard"\n` +
        `"Great customer support","Had a question about sizing and they helped immediately.",5,"Michael Brown","m.brown@example.com","the-complete-snowboard"`;
      setFileName("spreadsheet_reviews.csv");
    } else if (currentView === "store") {
      sample =
        `title,body,rating,review_date,reviewer_name,reviewer_email,product_handle,status,verified\n` +
        `"Transferred review","Imported seamlessly across our Shopify stores.",5,"2026-10-22","Alex Reed","alex.r@example.com","the-complete-snowboard","PUBLISHED","true"`;
      setFileName("store_reviews_backup.csv");
    } else {
      sample =
        `title,body,rating,review_date,reviewer_name,reviewer_email,product_handle\n` +
        `"Outstanding build quality!","Fits like a glove and the color matches the photos perfectly.",5,"2026-10-15","Liam Walker","liam.w@example.com","the-complete-snowboard"\n` +
        `"Very impressed","Shipped promptly and packaged with care. Would purchase again.",5,"2026-10-18","Emma Davis","emma.d@example.com","the-complete-snowboard"\n` +
        `"Pretty good, as advertised","Minor seam flaw, but overall good value for the price.",4,"2026-10-19","Noah Taylor","noah.t@example.com","the-complete-snowboard"`;
      setFileName(`${item?.id || "app"}_export.csv`);
    }

    setCsvContent(sample);
    const rows = sample.trim().split("\n").filter(Boolean);
    setRowCount(Math.max(0, rows.length - 1));
  };

  const handleDownloadTemplate = () => {
    const templateCsv = `title,body,rating,reviewer_name,reviewer_email,product_handle\n"Great product!","Loved everything about it.",5,"John Doe","john@example.com","the-complete-snowboard"\n"Satisfied customer","Good delivery time and nice quality.",4,"Jane Smith","jane@example.com","the-complete-snowboard"`;
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", "reviora_reviews_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleStartImport = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!csvContent.trim()) return;
    submit({ rawCsv: csvContent, source: selectedItem?.id || currentView }, { method: "POST" });
  };

  // Filtered review apps based on search
  const filteredApps = REVIEW_APPS_LIST.filter((app) =>
    app.name.toLowerCase().includes(searchAppQuery.toLowerCase())
  );

  // Filtered platforms
  const filteredPlatforms = PLATFORMS_LIST.filter((plat) =>
    plat.name.toLowerCase().includes(searchAppQuery.toLowerCase())
  );

  return (
    <Page>
      <ui-title-bar title="Import reviews" />

      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Banner feedback */}
        <div style={{ marginBottom: "16px" }}>
          {actionData?.success && (
            <Banner tone="success" title="Import Complete" onDismiss={() => { }}>
              <p>
                Successfully imported <strong>{actionData.count}</strong> reviews!{" "}
                <Button variant="plain" url="/app/reviews">
                  View in Moderation Inbox →
                </Button>
              </p>
            </Banner>
          )}

          {actionData?.error && (
            <Banner tone="critical" title="Import Error" onDismiss={() => { }}>
              <p>{actionData.error}</p>
            </Banner>
          )}

          {exportFetcher.data?.exportSuccess && (
            <Banner tone="success" title="Export Ready" onDismiss={() => { }}>
              <p>
                Your CSV reviews backup (<strong>{exportFetcher.data.filename}</strong>) has been downloaded successfully.
              </p>
            </Banner>
          )}

          {exportFetcher.data?.exportError && (
            <Banner tone="critical" title="Export Failed" onDismiss={() => { }}>
              <p>{exportFetcher.data.exportError}</p>
            </Banner>
          )}
        </div>

        {/* =========================================================================
            VIEW 1: "From review apps" (Judge.me layout with app search & app list)
        ========================================================================== */}
        {currentView === "apps" && (
          <BlockStack gap="400">
            {/* Top header with Back arrow button */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={handleBackToMain}
                style={{
                  border: "1px solid #D2D5D8",
                  borderRadius: "6px",
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
                }}
                title="Back to import options"
                aria-label="Back to import options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#202223" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <span style={{ fontSize: "20px", fontWeight: "600", color: "#202223" }}>
                From review apps
              </span>
            </div>

            <Card padding="500">
              <BlockStack gap="400">
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#202223", margin: "0 0 4px 0" }}>
                    Import reviews from a CSV file
                  </h2>
                  <p style={{ fontSize: "13px", color: "#6D7175", margin: 0 }}>
                    Export reviews from your current reviews app and import them here easily. Need help exporting the reviews?
                  </p>
                </div>

                {/* Search app input */}
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#6D7175",
                      pointerEvents: "none",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={searchAppQuery}
                    onChange={(e) => setSearchAppQuery(e.target.value)}
                    placeholder="Search app"
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 36px",
                      borderRadius: "6px",
                      border: "1px solid #C9CCCF",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                </div>

                {/* App Rows List */}
                <div style={{ borderTop: "1px solid #E1E3E5" }}>
                  {filteredApps.map((app) => {
                    const isSelected = selectedItem?.id === app.id;

                    return (
                      <div key={app.id} style={{ borderBottom: "1px solid #E1E3E5" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 8px",
                            backgroundColor: isSelected ? "#F4F6F8" : "transparent",
                            transition: "background-color 0.15s ease",
                          }}
                        >
                          {/* Left: App Logo & Blue Link Title */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedItem(null);
                                handleClearFile();
                              } else {
                                setSelectedItem(app);
                                handleClearFile();
                              }
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "14px",
                              cursor: "pointer",
                              flex: 1,
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              textAlign: "left",
                              font: "inherit",
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 6,
                                backgroundColor: app.bgColor,
                                color: app.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "800",
                                fontSize: app.logoText.length > 4 ? "8px" : "11px",
                                letterSpacing: "0.4px",
                                flexShrink: 0,
                              }}
                            >
                              {app.logoText}
                            </div>
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: "500",
                                color: "#005BD3",
                              }}
                            >
                              {app.name}
                            </span>
                          </button>

                          {/* Right: Import Action */}
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItem(app);
                                handleClearFile();
                              }}
                              style={{
                                border: "none",
                                background: "none",
                                color: "#005BD3",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                padding: "6px 12px",
                                borderRadius: "4px",
                              }}
                            >
                              Import
                            </button>
                          </div>
                        </div>

                        {/* Inline Upload Form when this app is selected */}
                        {isSelected && (
                          <div
                            style={{
                              padding: "16px",
                              backgroundColor: "#F9FAFB",
                              borderTop: "1px solid #E1E3E5",
                            }}
                          >
                            <BlockStack gap="300">
                              <Text as="p" variant="bodySm" tone="subdued">
                                Drop your <strong>{app.name}</strong> reviews export CSV file below.
                              </Text>

                              <DropZone onDrop={handleDrop} allowMultiple={false} accept=".csv,text/csv,text/plain">
                                {fileName ? (
                                  <Box padding="300">
                                    <InlineStack align="space-between" blockAlign="center">
                                      <InlineStack gap="200" blockAlign="center">
                                        <Badge tone="success">File Loaded</Badge>
                                        <Text as="span" fontWeight="semibold">{fileName}</Text>
                                        <Text as="span" tone="subdued">({rowCount} review{rowCount === 1 ? "" : "s"} detected)</Text>
                                      </InlineStack>
                                      <Button variant="plain" tone="critical" onClick={handleClearFile}>Remove</Button>
                                    </InlineStack>
                                  </Box>
                                ) : (
                                  <DropZone.FileUpload actionHint={`or click to upload CSV from ${app.name}`} />
                                )}
                              </DropZone>

                              <InlineStack align="space-between" blockAlign="center">
                                <Button variant="plain" onClick={() => loadSampleData(app)}>
                                  Load sample {app.name} CSV
                                </Button>
                                <Button variant="plain" onClick={() => setShowRawEditor(!showRawEditor)}>
                                  {showRawEditor ? "Hide CSV text" : "View/edit CSV text"}
                                </Button>
                              </InlineStack>

                              {showRawEditor && (
                                <TextField
                                  label="Raw CSV Data"
                                  multiline={4}
                                  value={csvContent}
                                  onChange={(val) => {
                                    setCsvContent(val);
                                    const rows = val.trim().split("\n").filter(Boolean);
                                    setRowCount(Math.max(0, rows.length - 1));
                                  }}
                                  autoComplete="off"
                                />
                              )}

                              <InlineStack gap="200">
                                <Button
                                  variant="primary"
                                  loading={isImporting}
                                  disabled={!csvContent.trim()}
                                  onClick={handleStartImport}
                                >
                                  Start Import
                                </Button>
                                <Button onClick={() => { setSelectedItem(null); handleClearFile(); }}>
                                  Cancel
                                </Button>
                              </InlineStack>
                            </BlockStack>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </BlockStack>
            </Card>
          </BlockStack>
        )}

        {/* =========================================================================
            VIEW 2: "From a spreadsheet" (Google Sheets / Excel CSV format)
        ========================================================================== */}
        {currentView === "spreadsheet" && (
          <BlockStack gap="400">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={handleBackToMain}
                style={{
                  border: "1px solid #D2D5D8",
                  borderRadius: "6px",
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
                }}
                title="Back to import options"
                aria-label="Back to import options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#202223" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <span style={{ fontSize: "20px", fontWeight: "600", color: "#202223" }}>
                From a spreadsheet
              </span>
            </div>

            <Card padding="500">
              <BlockStack gap="400">
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#202223", margin: "0 0 4px 0" }}>
                    Import reviews from a spreadsheet
                  </h2>
                  <p style={{ fontSize: "13px", color: "#6D7175", margin: 0 }}>
                    Upload any CSV spreadsheet with columns for title, body, rating, reviewer_name, reviewer_email, and product_handle.
                  </p>
                </div>

                <InlineStack gap="200">
                  <Button variant="secondary" onClick={handleDownloadTemplate}>
                    Download CSV Template
                  </Button>
                  <Button variant="plain" onClick={() => loadSampleData({ id: "spreadsheet" })}>
                    Load Sample Data
                  </Button>
                </InlineStack>

                <DropZone onDrop={handleDrop} allowMultiple={false} accept=".csv,text/csv,text/plain">
                  {fileName ? (
                    <Box padding="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="200" blockAlign="center">
                          <Badge tone="success">File Loaded</Badge>
                          <Text as="span" fontWeight="semibold">{fileName}</Text>
                          <Text as="span" tone="subdued">({rowCount} reviews detected)</Text>
                        </InlineStack>
                        <Button variant="plain" tone="critical" onClick={handleClearFile}>Remove</Button>
                      </InlineStack>
                    </Box>
                  ) : (
                    <DropZone.FileUpload actionHint="or click to browse your CSV spreadsheet" />
                  )}
                </DropZone>

                {showRawEditor && (
                  <TextField
                    label="Raw CSV Data"
                    multiline={4}
                    value={csvContent}
                    onChange={(val) => {
                      setCsvContent(val);
                      const rows = val.trim().split("\n").filter(Boolean);
                      setRowCount(Math.max(0, rows.length - 1));
                    }}
                    autoComplete="off"
                  />
                )}

                <InlineStack align="space-between" blockAlign="center">
                  <Button variant="plain" onClick={() => setShowRawEditor(!showRawEditor)}>
                    {showRawEditor ? "Hide CSV text" : "View / edit CSV text"}
                  </Button>

                  <Button
                    variant="primary"
                    loading={isImporting}
                    disabled={!csvContent.trim()}
                    onClick={handleStartImport}
                  >
                    Start Import
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        )}

        {/* =========================================================================
            VIEW 3: "From other platforms" (AliExpress, Amazon, Etsy, etc.)
        ========================================================================== */}
        {currentView === "platforms" && (
          <BlockStack gap="400">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={handleBackToMain}
                style={{
                  border: "1px solid #D2D5D8",
                  borderRadius: "6px",
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
                }}
                title="Back to import options"
                aria-label="Back to import options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#202223" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <span style={{ fontSize: "20px", fontWeight: "600", color: "#202223" }}>
                From other platforms
              </span>
            </div>

            <Card padding="500">
              <BlockStack gap="400">
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#202223", margin: "0 0 4px 0" }}>
                    Import reviews from marketplaces &amp; platforms
                  </h2>
                  <p style={{ fontSize: "13px", color: "#6D7175", margin: 0 }}>
                    Select your source platform below to import exported reviews.
                  </p>
                </div>

                {/* Platforms List */}
                <div style={{ borderTop: "1px solid #E1E3E5" }}>
                  {filteredPlatforms.map((plat) => {
                    const isSelected = selectedItem?.id === plat.id;

                    return (
                      <div key={plat.id} style={{ borderBottom: "1px solid #E1E3E5" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 8px",
                            backgroundColor: isSelected ? "#F4F6F8" : "transparent",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedItem(null);
                                handleClearFile();
                              } else {
                                setSelectedItem(plat);
                                handleClearFile();
                              }
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "14px",
                              cursor: "pointer",
                              flex: 1,
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              textAlign: "left",
                              font: "inherit",
                            }}
                          >
                            {/* Platform logo rendering */}
                            {plat.isGoogle ? (
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 6,
                                  background: "#FFFFFF",
                                  border: "1px solid #E5E7EB",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                              </div>
                            ) : plat.isMeta ? (
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 6,
                                  background: "#FFFFFF",
                                  border: "1px solid #E5E7EB",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#0081FB">
                                  <path d="M16.9 7C14.7 7 12.8 8.4 12 10.3 11.2 8.4 9.3 7 7.1 7 4.3 7 2 9.2 2 12s2.3 5 5.1 5c2.2 0 4.1-1.4 4.9-3.3.8 1.9 2.7 3.3 4.9 3.3 2.8 0 5.1-2.2 5.1-5s-2.3-5-5.1-5zm-9.8 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm9.8 0c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" />
                                </svg>
                              </div>
                            ) : plat.isAmazon ? (
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 6,
                                  background: "#FFFFFF",
                                  border: "1px solid #E5E7EB",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <span style={{ fontSize: "16px", fontWeight: "900", color: "#111", lineHeight: 1 }}>a</span>
                                <div style={{ width: 14, height: 2, background: "#FF9900", borderRadius: 1, marginTop: 1 }}></div>
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 6,
                                  background: plat.bgColor,
                                  color: plat.color,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: "bold",
                                  fontSize: "11px",
                                }}
                              >
                                {plat.logoText}
                              </div>
                            )}

                            <span style={{ fontSize: "14px", fontWeight: "500", color: "#005BD3" }}>
                              {plat.name}
                            </span>
                          </button>

                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItem(plat);
                                handleClearFile();
                              }}
                              style={{
                                border: "none",
                                background: "none",
                                color: "#005BD3",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                padding: "6px 12px",
                              }}
                            >
                              Import
                            </button>
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            style={{
                              padding: "16px",
                              backgroundColor: "#F9FAFB",
                              borderTop: "1px solid #E1E3E5",
                            }}
                          >
                            <BlockStack gap="300">
                              <Text as="p" variant="bodySm" tone="subdued">
                                Drop your <strong>{plat.name}</strong> review export CSV file below.
                              </Text>

                              <DropZone onDrop={handleDrop} allowMultiple={false} accept=".csv,text/csv,text/plain">
                                {fileName ? (
                                  <Box padding="300">
                                    <InlineStack align="space-between" blockAlign="center">
                                      <InlineStack gap="200" blockAlign="center">
                                        <Badge tone="success">File Loaded</Badge>
                                        <Text as="span" fontWeight="semibold">{fileName}</Text>
                                        <Text as="span" tone="subdued">({rowCount} review{rowCount === 1 ? "" : "s"} detected)</Text>
                                      </InlineStack>
                                      <Button variant="plain" tone="critical" onClick={handleClearFile}>Remove</Button>
                                    </InlineStack>
                                  </Box>
                                ) : (
                                  <DropZone.FileUpload actionHint={`or click to upload CSV from ${plat.name}`} />
                                )}
                              </DropZone>

                              <InlineStack align="space-between" blockAlign="center">
                                <Button variant="plain" onClick={() => loadSampleData(plat)}>
                                  Load sample {plat.name} CSV
                                </Button>
                              </InlineStack>

                              <InlineStack gap="200">
                                <Button
                                  variant="primary"
                                  loading={isImporting}
                                  disabled={!csvContent.trim()}
                                  onClick={handleStartImport}
                                >
                                  Start Import
                                </Button>
                                <Button onClick={() => { setSelectedItem(null); handleClearFile(); }}>
                                  Cancel
                                </Button>
                              </InlineStack>
                            </BlockStack>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </BlockStack>
            </Card>
          </BlockStack>
        )}

        {/* =========================================================================
            VIEW 4: "From another store you own that uses Judge.me"
        ========================================================================== */}
        {currentView === "store" && (
          <BlockStack gap="400">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={handleBackToMain}
                style={{
                  border: "1px solid #D2D5D8",
                  borderRadius: "6px",
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
                }}
                title="Back to import options"
                aria-label="Back to import options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#202223" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <span style={{ fontSize: "20px", fontWeight: "600", color: "#202223" }}>
                From another store you own that uses Judge.me
              </span>
            </div>

            <Card padding="500">
              <BlockStack gap="400">
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#202223", margin: "0 0 4px 0" }}>
                    Transfer reviews from another Shopify store
                  </h2>
                  <p style={{ fontSize: "13px", color: "#6D7175", margin: 0 }}>
                    Export a CSV backup from your other store using Judge.me or Reviora, and upload it below to sync reviews.
                  </p>
                </div>

                <DropZone onDrop={handleDrop} allowMultiple={false} accept=".csv,text/csv,text/plain">
                  {fileName ? (
                    <Box padding="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="200" blockAlign="center">
                          <Badge tone="success">File Loaded</Badge>
                          <Text as="span" fontWeight="semibold">{fileName}</Text>
                          <Text as="span" tone="subdued">({rowCount} reviews detected)</Text>
                        </InlineStack>
                        <Button variant="plain" tone="critical" onClick={handleClearFile}>Remove</Button>
                      </InlineStack>
                    </Box>
                  ) : (
                    <DropZone.FileUpload actionHint="or click to browse your backup CSV" />
                  )}
                </DropZone>

                <InlineStack align="space-between" blockAlign="center">
                  <Button variant="plain" onClick={() => loadSampleData({ id: "store" })}>
                    Load sample store backup
                  </Button>

                  <Button
                    variant="primary"
                    loading={isImporting}
                    disabled={!csvContent.trim()}
                    onClick={handleStartImport}
                  >
                    Start Import
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        )}

        {/* =========================================================================
            MAIN VIEW: The 4 distinct category blocks (matching screenshot 2)
        ========================================================================== */}
        {currentView === null && (
          <BlockStack gap="400">

            <Card padding="500">
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd" fontWeight="semibold">
                  Import reviews
                </Text>

                <BlockStack gap="300">
                  {/* Option 1: From review apps */}
                  <div
                    style={{
                      border: "1px solid #D2D5D8",
                      borderRadius: "8px",
                      padding: "18px 24px",
                      backgroundColor: "#FFFFFF",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "24px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Logos row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: "#000000",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "800",
                            fontSize: 9,
                            letterSpacing: "0.5px",
                          }}
                        >
                          LOOX
                        </div>

                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: "#0D57F8",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "800",
                            fontSize: 9,
                          }}
                        >
                          yotpo.
                        </div>

                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: "#192248",
                            color: "#60A5FA",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "900",
                            fontSize: 14,
                          }}
                        >
                          A
                        </div>

                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: "#1C2024",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M19.5 5.5L16.5 2.5H7.5L4.5 5.5V21.5H19.5V5.5Z" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M16 10C16 12.21 14.21 14 12 14C9.79 14 8 12.21 8 10" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>

                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: "#CBD5E1",
                            color: "#334155",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                          }}
                        >
                          🐳
                        </div>
                      </div>

                      <div>
                        <Text as="h3" variant="headingSm" fontWeight="semibold">
                          From review apps
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Bring your reviews from Loox, Yotpo, Air Reviews, Shopify, Klaviyo, Arereviews and others.
                        </Text>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <Button onClick={() => handleNavigateTo("apps")}>
                        Import from apps
                      </Button>
                    </div>
                  </div>

                  {/* Option 2: From a spreadsheet */}
                  <div
                    style={{
                      border: "1px solid #D2D5D8",
                      borderRadius: "8px",
                      padding: "18px 24px",
                      backgroundColor: "#FFFFFF",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "24px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                        <rect width="36" height="36" rx="6" fill="#0F9D58" />
                        <path d="M11 9H19L25 15V27H11V9Z" fill="#E8F5E9" />
                        <path d="M19 9V15H25L19 9Z" fill="#A5D6A7" />
                        <rect x="13" y="17" width="10" height="2" fill="#0F9D58" />
                        <rect x="13" y="20" width="10" height="2" fill="#0F9D58" />
                        <rect x="13" y="23" width="6" height="2" fill="#0F9D58" />
                      </svg>

                      <div>
                        <Text as="h3" variant="headingSm" fontWeight="semibold">
                          From a spreadsheet
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Import your own reviews from a spreadsheet format.
                        </Text>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <Button onClick={() => handleNavigateTo("spreadsheet")}>
                        Import from a spreadsheet
                      </Button>
                    </div>
                  </div>

                  {/* Option 3: From other platforms */}
                  <div
                    style={{
                      border: "1px solid #D2D5D8",
                      borderRadius: "8px",
                      padding: "18px 24px",
                      backgroundColor: "#FFFFFF",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "24px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: "#FF3838",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            fontSize: 9,
                          }}
                        >
                          Ali
                        </div>

                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: "#FFFFFF",
                            border: "1px solid #E5E7EB",
                            color: "#F1641E",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            fontSize: 10,
                            fontFamily: "serif",
                          }}
                        >
                          Etsy
                        </div>

                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: "#FFFFFF",
                            border: "1px solid #E5E7EB",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span style={{ fontSize: "15px", fontWeight: "900", color: "#111", lineHeight: 1 }}>a</span>
                          <div style={{ width: 13, height: 2, background: "#FF9900", borderRadius: 1, marginTop: 1 }}></div>
                        </div>

                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: "#FFFFFF",
                            border: "1px solid #E5E7EB",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                        </div>

                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: "#FFFFFF",
                            border: "1px solid #E5E7EB",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="#0081FB">
                            <path d="M16.9 7C14.7 7 12.8 8.4 12 10.3 11.2 8.4 9.3 7 7.1 7 4.3 7 2 9.2 2 12s2.3 5 5.1 5c2.2 0 4.1-1.4 4.9-3.3.8 1.9 2.7 3.3 4.9 3.3 2.8 0 5.1-2.2 5.1-5s-2.3-5-5.1-5zm-9.8 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm9.8 0c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" />
                          </svg>
                        </div>
                      </div>

                      <div>
                        <Text as="h3" variant="headingSm" fontWeight="semibold">
                          From other platforms
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Import reviews from other e-commerce platforms or sync reviews from your other Shopify stores.
                        </Text>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <Button onClick={() => handleNavigateTo("platforms")}>
                        Import from platforms
                      </Button>
                    </div>
                  </div>

                  {/* Option 4: From another store you own */}
                  <div
                    style={{
                      border: "1px solid #D2D5D8",
                      borderRadius: "8px",
                      padding: "18px 24px",
                      backgroundColor: "#FFFFFF",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "24px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 6,
                          background: "#FFFFFF",
                          border: "1px solid #E5E7EB",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
                          <path d="M22.5 13.5C22.4 13.5 22.3 13.5 22.2 13.5L20.8 10.2C20.5 9.5 19.8 9 19.1 9H16.9C16.2 9 15.5 9.5 15.2 10.2L13.8 13.5C13.7 13.5 13.6 13.5 13.5 13.5C12.7 13.5 12 14.2 12 15L13.2 25.5C13.3 26.3 14 27 14.8 27H21.2C22 27 22.7 26.3 22.8 25.5L24 15C24 14.2 23.3 13.5 22.5 13.5ZM16.5 10.8C16.6 10.5 16.8 10.4 17 10.4H19C19.2 10.4 19.4 10.5 19.5 10.8L20.6 13.5H15.4L16.5 10.8Z" fill="#95BF47" />
                        </svg>
                      </div>

                      <div>
                        <Text as="h3" variant="headingSm" fontWeight="semibold">
                          From another store you own that uses Judge.me
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Transfer your Judge.me reviews or sync between stores.
                        </Text>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <Button onClick={() => handleNavigateTo("store")}>
                        Import from another store
                      </Button>
                    </div>
                  </div>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Export Reviews Backup Section */}
            <Card padding="400">
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingSm" fontWeight="semibold">Download Reviews Backup</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Download all customer reviews currently stored in your Reviora database as a CSV file.
                    </Text>
                  </BlockStack>
                  <Button
                    variant="primary"
                    loading={isExporting}
                    onClick={handleExport}
                  >
                    Export All Reviews (CSV)
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        )}
      </div>
    </Page>
  );
}
