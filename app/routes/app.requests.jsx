import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useSubmit } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server.js";
import { ReviewRequest } from "../models/reviewRequest.model.js";
import { connectDB } from "../db.server.js";
import { sendReviewRequestEmail } from "../utils/email.server.js";
import {
  Mail,
  Send,
  User,
  Package,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import { GET_RECENT_ORDERS_QUERY } from "../graphql/index.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  await connectDB();

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";

  let orders = [];
  try {
    const variables = { first: 50 };
    if (q) {
      variables.query = q;
    }

    const response = await admin.graphql(GET_RECENT_ORDERS_QUERY, {
      variables,
    });

    const json = await response.json();
    const rawNodes = json.data?.orders?.nodes || [];

    // Strictly keep only delivered & fulfilled orders
    const fulfilledNodes = rawNodes.filter(
      (o) => o.displayFulfillmentStatus === "FULFILLED"
    );

    orders = fulfilledNodes.map((o) => {
      const customerName =
        o.customer?.displayName ||
        [o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(" ") ||
        "Valued Customer";

      const customerEmail = o.customer?.email || o.email || "";

      const items = (o.lineItems?.nodes || []).map((li) => ({
        id: li.id,
        title: li.title,
        productId: li.product?.id ? li.product.id.replace("gid://shopify/Product/", "") : "",
        productHandle: li.product?.handle || "",
      }));

      return {
        id: o.id,
        orderNumber: o.name,
        createdAt: o.createdAt,
        fulfillmentStatus: o.displayFulfillmentStatus || "FULFILLED",
        financialStatus: o.displayFinancialStatus || "PAID",
        customerName,
        customerEmail,
        items,
      };
    });
  } catch (err) {
    console.error("⚠️ Failed to fetch Shopify orders:", err);
  }

  const rawRequests = await ReviewRequest.find({ shop: session.shop })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean({ virtuals: true });

  const requests = rawRequests.map((r) => ({
    ...r,
    id: r.id || r._id.toString(),
  }));

  return { requests, orders, searchQuery: q };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "send_manual") {
    const orderId = formData.get("orderId") || `MANUAL-${Date.now()}`;
    const customerEmail = formData.get("customerEmail")?.trim();
    const customerName = formData.get("customerName")?.trim() || "Valued Customer";
    const productTitle = formData.get("productTitle")?.trim() || "Item";
    const productId = formData.get("productId")?.trim() || "general-product";
    const productHandle = formData.get("productHandle")?.trim() || "";

    if (!customerEmail) return { error: "Customer email is required" };

    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Send real email via Resend
    const emailResult = await sendReviewRequestEmail({
      to: customerEmail,
      customerName,
      productTitle,
      productHandle,
      shop: session.shop,
      token,
    });

    const status = emailResult.success ? "SENT" : "FAILED";

    await connectDB();
    await ReviewRequest.create({
      shop: session.shop,
      orderId,
      customerEmail,
      customerName,
      productId,
      productTitle,
      channel: "EMAIL",
      status,
      errorMessage: emailResult.error || undefined,
      scheduledAt: new Date(),
      sentAt: emailResult.success ? new Date() : undefined,
      token,
    });

    if (!emailResult.success) {
      return {
        warning: `Recorded in history, but email dispatch failed: ${emailResult.error}`,
      };
    }

    return {
      success: true,
      message: `Review invitation sent to ${customerEmail} for "${productTitle}"!`,
    };
  }

  return null;
};

export default function RequestsPage() {
  const { requests, orders = [], searchQuery = "" } = useLoaderData();
  const fetcher = useFetcher();
  const submit = useSubmit();
  const isSending = fetcher.state === "submitting";

  // Search input state
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Selection states
  const [selectedOrderId, setSelectedOrderId] = useState(
    orders.length > 0 ? orders[0].id : "manual"
  );
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);

  // Manual fallback inputs
  const [manualProductTitle, setManualProductTitle] = useState("");

  const currentOrder = orders.find((o) => o.id === selectedOrderId);

  // Update selection if orders change
  useEffect(() => {
    if (orders.length > 0 && !orders.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  // Auto-fill customer and products whenever the selected order changes
  useEffect(() => {
    if (currentOrder) {
      setCustomerName(currentOrder.customerName || "");
      setCustomerEmail(currentOrder.customerEmail || "");
      setOrderNumber(currentOrder.orderNumber || "");
      setSelectedProductIndex(0);
    } else if (selectedOrderId === "manual") {
      setCustomerName("");
      setCustomerEmail("");
      setOrderNumber("");
    }
  }, [selectedOrderId, currentOrder]);

  const currentProduct =
    currentOrder && currentOrder.items && currentOrder.items.length > 0
      ? currentOrder.items[selectedProductIndex]
      : null;

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    submit({ q: searchInput }, { method: "GET" });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    submit({}, { method: "GET" });
  };

  const handleSend = (e) => {
    e.preventDefault();
    const form = e.target;
    fetcher.submit(new FormData(form), { method: "POST" });
  };

  return (
    <div className="reviora-page-wrapper">
      <TitleBar title="Review Requests" />

      {/* Direct Review Invitation Card */}
      <div className="reviora-card">
        <h2 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 4px 0", color: "#202223" }}>
          Send Review Invitation by Order
        </h2>
        <p style={{ fontSize: "13px", color: "#6D7175", margin: "0 0 20px 0" }}>
          Select or search delivered and fulfilled orders from your store to auto-fill customer and product info.
        </p>

        {fetcher.data?.message && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#E4F8F0",
              color: "#007A5C",
              borderRadius: "6px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            <CheckCircle2 size={16} />
            {fetcher.data.message}
          </div>
        )}

        {(fetcher.data?.warning || fetcher.data?.error) && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#FFF4E5",
              color: "#9C4221",
              borderRadius: "6px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            <AlertCircle size={16} />
            {fetcher.data.warning || fetcher.data.error}
          </div>
        )}

        {/* Search Controls for Fulfilled Orders */}
        <div style={{ marginBottom: "16px" }}>
          <form onSubmit={handleSearchSubmit}>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  id="orderSearch"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search delivered order #, customer name, or email..."
                  className="reviora-input"
                  style={{ paddingLeft: "32px" }}
                />
                <Search
                  size={15}
                  color="#8C9196"
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              </div>
              <button type="submit" className="reviora-btn reviora-btn-secondary">
                Search
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="reviora-btn reviora-btn-secondary"
                  title="Clear search"
                >
                  <X size={14} /> Clear
                </button>
              )}
            </div>
          </form>
        </div>

        <form onSubmit={handleSend}>
          <input type="hidden" name="intent" value="send_manual" />
          <input
            type="hidden"
            name="orderId"
            value={orderNumber || `MANUAL-${Date.now()}`}
          />
          <input
            type="hidden"
            name="productTitle"
            value={currentProduct ? currentProduct.title : manualProductTitle}
          />
          <input
            type="hidden"
            name="productId"
            value={currentProduct ? currentProduct.productId : "custom-product"}
          />
          <input
            type="hidden"
            name="productHandle"
            value={currentProduct ? currentProduct.productHandle : ""}
          />

          {/* Step 1: Select Order Dropdown */}
          <div style={{ marginBottom: "18px" }}>
            <label
              htmlFor="orderSelect"
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                marginBottom: "6px",
                color: "#202223",
              }}
            >
              Select Order
            </label>
            <div style={{ position: "relative" }}>
              <select
                id="orderSelect"
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="reviora-select"
                style={{
                  paddingLeft: "34px",
                  fontWeight: "500",
                  backgroundColor: "#FAFAFA",
                }}
              >
                {orders.length === 0 ? (
                  <option value="manual">
                    {searchQuery
                      ? `No orders matching "${searchQuery}" (Enter Manually)`
                      : "No delivered orders found (Enter Manually)"}
                  </option>
                ) : (
                  <>
                    <optgroup label={`Delivered & Fulfilled Orders (${orders.length})`}>
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.orderNumber} — {o.customerName} ({o.customerEmail || "No email"}) •{" "}
                          [{o.fulfillmentStatus}] • {o.items.length} item
                          {o.items.length !== 1 ? "s" : ""}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other">
                      <option value="manual">✍️ Custom / Enter Manually</option>
                    </optgroup>
                  </>
                )}
              </select>
              <ShoppingBag
                size={16}
                color="#008060"
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
          </div>

          {/* Step 2: Auto-filled Customer Details & Product */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {/* Customer Name */}
            <div>
              <label
                htmlFor="customerName"
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  marginBottom: "6px",
                }}
              >
                Customer Name
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="customerName"
                  type="text"
                  name="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Liam Walker"
                  required
                  className="reviora-input"
                  style={{ paddingLeft: "32px" }}
                />
                <User
                  size={15}
                  color="#8C9196"
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              </div>
            </div>

            {/* Customer Email */}
            <div>
              <label
                htmlFor="customerEmail"
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  marginBottom: "6px",
                }}
              >
                Customer Email *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="customerEmail"
                  type="email"
                  name="customerEmail"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="liam.w@example.com"
                  required
                  className="reviora-input"
                  style={{ paddingLeft: "32px" }}
                />
                <Mail
                  size={15}
                  color="#8C9196"
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              </div>
            </div>

            {/* Purchased Product Selector */}
            <div>
              <label
                htmlFor="productSelect"
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  marginBottom: "6px",
                }}
              >
                Purchased Product
              </label>
              <div style={{ position: "relative" }}>
                {currentOrder && currentOrder.items.length > 0 ? (
                  <select
                    id="productSelect"
                    value={selectedProductIndex}
                    onChange={(e) => setSelectedProductIndex(Number(e.target.value))}
                    className="reviora-select"
                    style={{ paddingLeft: "32px" }}
                  >
                    {currentOrder.items.map((item, idx) => (
                      <option key={item.id} value={idx}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="productSelect"
                    type="text"
                    value={manualProductTitle}
                    onChange={(e) => setManualProductTitle(e.target.value)}
                    placeholder="e.g. The Complete Snowboard"
                    required
                    className="reviora-input"
                    style={{ paddingLeft: "32px" }}
                  />
                )}
                <Package
                  size={15}
                  color="#8C9196"
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="reviora-btn reviora-btn-primary"
            disabled={isSending}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Send size={14} />
            {isSending ? "Dispatching Email..." : "Send Review Invitation"}
          </button>
        </form>
      </div>

      {/* Requests History Log */}
      <div className="reviora-card">
        <h2 style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0", color: "#202223" }}>
          Delivery &amp; Activity Log
        </h2>

        {requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "#6D7175" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "500" }}>
              No invitations sent yet
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Use the form above to send your first test invitation.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {requests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "6px",
                  border: "1px solid #E1E3E5",
                  backgroundColor: "#FAFAFA",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223" }}>
                    {req.customerName || req.customerEmail}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6D7175", marginTop: "2px" }}>
                    Order: <strong>{req.orderId}</strong> • Product:{" "}
                    <strong>{req.productTitle || req.productId}</strong> • Channel: {req.channel} •{" "}
                    {new Date(req.createdAt).toLocaleString()}
                  </div>
                </div>

                <span
                  className={`reviora-badge-pill ${req.status === "SENT"
                      ? "reviora-badge-success"
                      : req.status === "FAILED"
                        ? "reviora-badge-critical"
                        : "reviora-badge-warning"
                    }`}
                >
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="reviora-page-wrapper">
      <div className="reviora-card" style={{ borderColor: "#D72C0D", padding: "24px" }}>
        <h2 style={{ color: "#D72C0D", fontSize: "16px", margin: "0 0 8px 0" }}>
          Unable to load Review Requests
        </h2>
        <p style={{ color: "#6D7175", fontSize: "13px", margin: "0 0 16px 0" }}>
          An error occurred while loading this page. Please refresh or try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="reviora-btn reviora-btn-secondary"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
