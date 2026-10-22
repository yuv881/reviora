import { useState, useRef } from "react";
import { Form, useActionData, useNavigation, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server.js";
import { createReview, exportReviewsToCsv } from "../models/review.server.js";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, ClipboardCopy, Download, FileUp, Loader2, FileText, X, ChevronDown, ChevronUp } from "lucide-react";

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
  const isImporting = navigation.state === "submitting";

  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showRawEditor, setShowRawEditor] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleClearFile = (e) => {
    e.stopPropagation();
    setCsvContent("");
    setFileName("");
    setRowCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  return (
    <div className="reviora-page-wrapper">
      <TitleBar title="Import & Export" />

      {actionData?.success && (
        <div
          className="reviora-card"
          style={{
            borderLeft: "4px solid #108043",
            backgroundColor: "#E3F1DF",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#108043", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={16} />
              Successfully imported {actionData.count} reviews!
            </span>
            <Link to="/app/reviews" className="reviora-btn reviora-btn-primary" style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              View in Inbox <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}

      {actionData?.error && (
        <div
          className="reviora-card"
          style={{
            borderLeft: "4px solid #D72C0D",
            backgroundColor: "#FDE7E7",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#D72C0D", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={16} />
            {actionData.error}
          </span>
        </div>
      )}

      {/* Import Reviews Section */}
      <div className="reviora-card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 4px 0", color: "#202223" }}>
              Import Reviews
            </h2>
            <p style={{ fontSize: "13px", color: "#6D7175", margin: 0 }}>
              Drag and drop your exported CSV file from Judge.me, Loox, Okendo, or any standard review platform.
            </p>
          </div>

          <button
            type="button"
            className="reviora-btn reviora-btn-plain"
            onClick={loadSampleJudgeMe}
            style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <ClipboardCopy size={13} />
            Load Sample CSV
          </button>
        </div>

        <Form method="POST">
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="source" style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
              Source Format
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FileSpreadsheet size={16} color="#6D7175" />
              <select id="source" name="source" className="reviora-select" style={{ maxWidth: "260px" }}>
                <option value="judge_me">Judge.me (CSV export)</option>
                <option value="loox">Loox (CSV export)</option>
                <option value="okendo">Okendo (CSV export)</option>
                <option value="generic">Universal CSV format</option>
              </select>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            id="csv-file-input"
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFileInputChange}
            style={{ display: "none" }}
          />

          {/* Native interactive Drag & Drop Area */}
          {!fileName ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload CSV review file. Drag and drop file or press to browse"
              className={`reviora-admin-dropzone ${isDragging ? "is-dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", backgroundColor: isDragging ? "#E3F1DF" : "#F1F2F3", marginBottom: "12px", color: isDragging ? "#108043" : "#5C5F62" }}>
                <FileUp size={28} />
              </div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
                {isDragging ? "Drop your CSV file here" : "Drag and drop your CSV file here"}
              </div>
              <div style={{ fontSize: "12px", color: "#6D7175" }}>
                or <span style={{ color: "#005BD3", fontWeight: "500", textDecoration: "underline" }}>browse files</span> from your computer
              </div>
              <div style={{ fontSize: "11px", color: "#8C9196", marginTop: "8px" }}>
                Supports .csv files up to 10MB
              </div>
            </button>
          ) : (
            <div
              className="reviora-admin-dropzone has-file"
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="region"
              aria-label="Selected CSV file details"
            >
              <div className="reviora-dropzone-badge">
                <CheckCircle2 size={16} />
                <span>{fileName}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#202223", fontWeight: "500", marginTop: "4px" }}>
                {rowCount} review{rowCount === 1 ? "" : "s"} detected and ready to migrate.
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  className="reviora-btn reviora-btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: "12px", padding: "6px 14px" }}
                >
                  Choose Different File
                </button>
                <button
                  type="button"
                  className="reviora-btn reviora-btn-plain"
                  onClick={handleClearFile}
                  style={{ fontSize: "12px", color: "#D72C0D", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <X size={14} /> Remove File
                </button>
              </div>
            </div>
          )}

          {/* Toggle Raw CSV Text Area */}
          <div style={{ marginBottom: "20px" }}>
            <button
              type="button"
              className="reviora-btn reviora-btn-plain"
              onClick={() => setShowRawEditor(!showRawEditor)}
              style={{ fontSize: "12px", color: "#6D7175", padding: "4px 0", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <FileText size={13} />
              {showRawEditor ? "Hide Raw CSV Editor" : "View / Edit Raw CSV Text"}
              {showRawEditor ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showRawEditor && (
              <div style={{ marginTop: "10px" }}>
                <textarea
                  id="rawCsv"
                  name="rawCsv"
                  rows="6"
                  value={csvContent}
                  onChange={(e) => {
                    setCsvContent(e.target.value);
                    const rows = e.target.value.trim().split("\n").filter(Boolean);
                    setRowCount(Math.max(0, rows.length - 1));
                  }}
                  placeholder={`title,body,rating,reviewer_name,reviewer_email,product_handle\n"Great product!","Loved everything about it",5,"John Doe","john@example.com","the-complete-snowboard"`}
                  className="reviora-textarea"
                  style={{ fontFamily: "monospace", fontSize: "12px" }}
                />
              </div>
            )}

            {/* Hidden field for form submission if editor is collapsed */}
            {!showRawEditor && (
              <input type="hidden" name="rawCsv" value={csvContent} />
            )}
          </div>

          <button
            type="submit"
            className="reviora-btn reviora-btn-primary"
            disabled={isImporting || !csvContent.trim()}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {isImporting ? <Loader2 size={14} className="reviora-spin" /> : <Upload size={14} />}
            {isImporting ? "Importing reviews..." : "Start Import"}
          </button>
        </Form>
      </div>

      {/* Export Reviews Section */}
      <div className="reviora-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 4px 0", color: "#202223" }}>
              Export Reviews
            </h2>
            <p style={{ fontSize: "13px", color: "#6D7175", margin: 0, maxWidth: "560px" }}>
              Download all customer reviews currently stored in your Reviora database as a CSV file. Perfect for backups, Excel analysis, or third-party integrations.
            </p>
          </div>

          <a
            href="/app/import?export=true"
            download
            className="reviora-btn reviora-btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
              padding: "10px 16px",
              fontWeight: "600",
            }}
          >
            <Download size={15} />
            Export All Reviews (CSV)
          </a>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return boundary.error();
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
