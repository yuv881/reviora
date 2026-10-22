import { useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server.js";
import { ReviewRequest } from "../models/reviewRequest.model.js";
import { connectDB } from "../db.server.js";
import { Mail, Send, User, Package } from "lucide-react";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  await connectDB();
  const rawRequests = await ReviewRequest.find({ shop: session.shop })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean({ virtuals: true });

  const requests = rawRequests.map((r) => ({
    ...r,
    id: r.id || r._id.toString(),
  }));

  return { requests };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "send_manual") {
    const customerEmail = formData.get("customerEmail");
    const customerName = formData.get("customerName");
    const productTitle = formData.get("productTitle") || "The Complete Snowboard";
    const productId = formData.get("productId") || "demo-snowboard";

    if (!customerEmail) return { error: "Customer email is required" };

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    await connectDB();
    await ReviewRequest.create({
      shop: session.shop,
      orderId: `MANUAL-${Date.now()}`,
      customerEmail,
      customerName,
      productId,
      productTitle,
      channel: "EMAIL",
      status: "SENT",
      scheduledAt: new Date(),
      sentAt: new Date(),
      token,
    });

    return { success: true };
  }

  return null;
};

export default function RequestsPage() {
  const { requests } = useLoaderData();
  const fetcher = useFetcher();
  const isSending = fetcher.state === "submitting";

  const handleSendManual = (e) => {
    e.preventDefault();
    const form = e.target;
    fetcher.submit(new FormData(form), { method: "POST" });
    form.reset();
  };

  return (
    <div className="reviora-page-wrapper">
      <TitleBar title="Review Requests" />

      {/* Manual Request Form */}
      <div className="reviora-card">
        <h2 style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 4px 0", color: "#202223" }}>
          Send Direct Review Invitation
        </h2>
        <p style={{ fontSize: "13px", color: "#6D7175", margin: "0 0 16px 0" }}>
          Send a personalized email invitation to a customer with an instant review link.
        </p>

        <form onSubmit={handleSendManual}>
          <input type="hidden" name="intent" value="send_manual" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label htmlFor="customerName" style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                Customer Name
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="customerName"
                  type="text"
                  name="customerName"
                  placeholder="e.g. Liam Walker"
                  className="reviora-input"
                  style={{ paddingLeft: "32px" }}
                />
                <User size={15} color="#8C9196" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
              </div>
            </div>

            <div>
              <label htmlFor="customerEmail" style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                Customer Email *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="customerEmail"
                  type="email"
                  name="customerEmail"
                  placeholder="liam.w@example.com"
                  required
                  className="reviora-input"
                  style={{ paddingLeft: "32px" }}
                />
                <Mail size={15} color="#8C9196" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
              </div>
            </div>

            <div>
              <label htmlFor="productTitle" style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                Product Name
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="productTitle"
                  type="text"
                  name="productTitle"
                  defaultValue="The Complete Snowboard"
                  className="reviora-input"
                  style={{ paddingLeft: "32px" }}
                />
                <Package size={15} color="#8C9196" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
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
            {isSending ? "Sending..." : "Send Review Invitation"}
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
            <p style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "500" }}>No invitations sent yet</p>
            <p style={{ margin: 0, fontSize: "13px" }}>Use the form above to send your first test invitation.</p>
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
                    Product: <strong>{req.productTitle || req.productId}</strong> • Channel: {req.channel} • {new Date(req.createdAt).toLocaleString()}
                  </div>
                </div>

                <span
                  className={`reviora-badge-pill ${req.status === "SENT" ? "reviora-badge-success" : "reviora-badge-warning"
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
  return boundary.error();
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
