import { useState, useEffect } from "react";
import { useActionData, useNavigation, useSubmit, useFetcher } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Select,
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
      if (h.includes("rating") || h.includes("stars")) rating = parseInt(val) || 5;
      else if (h.includes("title")) title = val;
      else if (h.includes("body") || h.includes("review") || h.includes("content")) body = val;
      else if (h.includes("name") || h.includes("author")) authorName = val;
      else if (h.includes("email")) authorEmail = val;
      else if (h.includes("product") || h.includes("handle")) productHandle = val;
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

export default function ImportPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const exportFetcher = useFetcher();

  const isImporting = navigation.state === "submitting";
  const isExporting = exportFetcher.state !== "idle";

  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [sourceFormat, setSourceFormat] = useState("judge_me");
  const [showRawEditor, setShowRawEditor] = useState(false);

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

  const loadSampleJudgeMe = () => {
    const sample =
      `title,body,rating,review_date,reviewer_name,reviewer_email,product_handle\n` +
      `"Outstanding build quality!","Fits like a glove and the color matches the photos perfectly.",5,"2026-10-15","Liam Walker","liam.w@example.com","the-complete-snowboard"\n` +
      `"Very impressed","Shipped promptly and packaged with care. Would purchase again.",5,"2026-10-18","Emma Davis","emma.d@example.com","the-complete-snowboard"\n` +
      `"Pretty good, as advertised","Minor seam flaw, but overall good value for the price.",4,"2026-10-19","Noah Taylor","noah.t@example.com","the-complete-snowboard"`;
    setCsvContent(sample);
    setFileName("judge_me_sample.csv");
    setRowCount(3);
  };

  const handleStartImport = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!csvContent.trim()) return;
    submit({ rawCsv: csvContent, source: sourceFormat }, { method: "POST" });
  };

  const sourceOptions = [
    { label: "Judge.me (CSV export)", value: "judge_me" },
    { label: "Loox (CSV export)", value: "loox" },
    { label: "Okendo (CSV export)", value: "okendo" },
    { label: "Universal CSV format", value: "generic" },
  ];

  return (
    <Page>
      <ui-title-bar title="Import & Export" />
      <BlockStack gap="500">
        {actionData?.success && (
          <Banner tone="success" title="Import Complete" onDismiss={() => { }}>
            <p>
              Successfully imported {actionData.count} reviews!{" "}
              <Button variant="plain" url="/app/reviews">
                View in Inbox
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
          <Banner tone="success" title="Export Downloaded">
            <p>
              Your CSV reviews backup (<strong>{exportFetcher.data.filename}</strong>) has been downloaded successfully.
            </p>
          </Banner>
        )}

        {exportFetcher.data?.exportError && (
          <Banner tone="critical" title="Export Failed">
            <p>{exportFetcher.data.exportError}</p>
          </Banner>
        )}

        {/* Import Reviews Section */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">Import Reviews</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Drag and drop your exported CSV file from Judge.me, Loox, Okendo, or any standard review platform.
                </Text>
              </BlockStack>
              <Button variant="plain" onClick={loadSampleJudgeMe}>
                Load Sample CSV
              </Button>
            </InlineStack>

            <Select
              label="Source Format"
              options={sourceOptions}
              value={sourceFormat}
              onChange={setSourceFormat}
            />

            <DropZone onDrop={handleDrop} allowMultiple={false} accept=".csv,text/csv,text/plain">
              {fileName ? (
                <Box padding="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <Badge tone="success">File Loaded</Badge>
                      <Text as="span" fontWeight="semibold">{fileName}</Text>
                      <Text as="span" tone="subdued">
                        ({rowCount} review{rowCount === 1 ? "" : "s"} detected)
                      </Text>
                    </InlineStack>
                    <Button variant="plain" tone="critical" onClick={handleClearFile}>
                      Remove
                    </Button>
                  </InlineStack>
                </Box>
              ) : (
                <DropZone.FileUpload />
              )}
            </DropZone>

            <InlineStack>
              <Button
                variant="plain"
                onClick={() => setShowRawEditor(!showRawEditor)}
              >
                {showRawEditor ? "Hide Raw CSV Editor" : "View / Edit Raw CSV Text"}
              </Button>
            </InlineStack>

            {showRawEditor && (
              <TextField
                label="Raw CSV Data"
                multiline={6}
                value={csvContent}
                onChange={(val) => {
                  setCsvContent(val);
                  const rows = val.trim().split("\n").filter(Boolean);
                  setRowCount(Math.max(0, rows.length - 1));
                }}
                autoComplete="off"
                placeholder={`title,body,rating,reviewer_name,reviewer_email,product_handle\n"Great product!","Loved everything about it",5,"John Doe","john@example.com","the-complete-snowboard"`}
              />
            )}

            <InlineStack>
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

        {/* Export Reviews Section */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">Download Reviews Backup</Text>
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
    </Page>
  );
}


