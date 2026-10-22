import { useLoaderData, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server.js";
import { getDashboardMetrics } from "../models/review.server.js";
import { StoreReviews } from "../models/review.model.js";
import { connectDB } from "../db.server.js";
import { MetricCard } from "../components/MetricCard.jsx";
import { RatingBreakdown } from "../components/RatingBreakdown.jsx";
import { StarRating } from "../components/StarRating.jsx";
import { Star, MessageSquare, Clock, Send, CheckCircle2, ArrowRight } from "lucide-react";

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
  const { metrics, recentReviews } = useLoaderData();

  return (
    <div className="reviora-page-wrapper">
      <TitleBar title="Dashboard" />

      {/* KPI Cards Grid with Lucide Icons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
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
      </div>

      {/* 2-Column Section: Breakdown + Onboarding */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        <RatingBreakdown
          distribution={metrics.distribution}
          total={metrics.publishedReviews}
          averageRating={metrics.averageRating}
        />

        <div className="reviora-card" style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 16px 0", color: "#202223" }}>
            Setup &amp; Next Steps
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
              <span className="reviora-badge-pill reviora-badge-success" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle2 size={12} />
                Ready
              </span>
              <span>Theme App Extension block installed</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
              <span className="reviora-badge-pill reviora-badge-info">Config</span>
              <Link to="/app/settings" style={{ color: "#005BD3", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                Customize Star Colors &amp; Auto-Publish Rules
                <ArrowRight size={12} />
              </Link>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
              <span className="reviora-badge-pill reviora-badge-info">Import</span>
              <Link to="/app/import" style={{ color: "#005BD3", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                Import Existing Reviews from Judge.me / CSV
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Recent Reviews Activity */}
      <div className="reviora-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "600", margin: 0, color: "#202223" }}>
            Recent Reviews Activity
          </h2>
          <Link to="/app/reviews" className="reviora-btn reviora-btn-plain" style={{ fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            View Moderation Inbox
            <ArrowRight size={13} />
          </Link>
        </div>

        {recentReviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "#6D7175" }}>
            <p style={{ fontSize: "14px", margin: "0 0 6px 0", fontWeight: "500" }}>No reviews collected yet</p>
            <p style={{ fontSize: "13px", margin: 0 }}>
              Customer reviews will appear here once submitted on your store or imported.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {recentReviews.map((r) => (
              <div
                key={r.id}
                style={{
                  border: "1px solid #E1E3E5",
                  borderRadius: "6px",
                  padding: "14px 16px",
                  backgroundColor: "#FAFAFA",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <StarRating rating={r.rating} size={14} />
                    <strong style={{ fontSize: "14px", color: "#202223" }}>{r.title || "Customer Review"}</strong>
                  </div>
                  <span
                    className={`reviora-badge-pill ${r.status === "PUBLISHED" ? "reviora-badge-success" : "reviora-badge-warning"
                      }`}
                  >
                    {r.status}
                  </span>
                </div>

                <p style={{ fontSize: "13px", color: "#4B5563", margin: "0 0 8px 0", lineHeight: "1.5" }}>
                  {r.body}
                </p>

                <div style={{ fontSize: "12px", color: "#6D7175" }}>
                  By <strong>{r.authorName}</strong> on {new Date(r.createdAt).toLocaleDateString()}
                  {r.verified && (
                    <span style={{ marginLeft: "8px", color: "#108043", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                      <CheckCircle2 size={11} /> Verified Buyer
                    </span>
                  )}
                </div>
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
