import { useState } from "react";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server.js";
import { getDashboardMetrics } from "../models/review.server.js";
import { StoreReviews } from "../models/review.model.js";
import { connectDB } from "../db.server.js";
import { MetricCard } from "../components/MetricCard.jsx";
import { StarRating } from "../components/StarRating.jsx";
import { Star, MessageSquare, Clock, Send } from "lucide-react";

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
  const loaderData = useLoaderData();
  const metrics = loaderData?.metrics || {
    averageRating: 0,
    totalReviews: 0,
    publishedReviews: 0,
    pendingReviews: 0,
    totalRequests: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };
  const recentReviews = loaderData?.recentReviews || [];

  // Feature request and contact support state
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDetails, setFeatureDetails] = useState("");
  const [featureSubmitted, setFeatureSubmitted] = useState(false);

  const handleOpenFeatureModal = () => {
    if (window.shopify?.modal) {
      window.shopify.modal.show("dashboard-feature-modal");
    } else {
      document.getElementById("dashboard-feature-modal")?.showOverlay();
    }
  };

  const handleCloseFeatureModal = () => {
    if (window.shopify?.modal) {
      window.shopify.modal.hide("dashboard-feature-modal");
    } else {
      document.getElementById("dashboard-feature-modal")?.hideOverlay();
    }
  };

  const handleSendFeatureRequest = () => {
    if (!featureTitle.trim()) return;
    const mailto = `mailto:support@reviora.com?subject=${encodeURIComponent("Feature Request: " + featureTitle)}&body=${encodeURIComponent(featureDetails || featureTitle)}`;
    window.open(mailto, "_blank");
    handleCloseFeatureModal();
    setFeatureSubmitted(true);
    setFeatureTitle("");
    setFeatureDetails("");
    setTimeout(() => setFeatureSubmitted(false), 5000);
  };

  const handleContactSupport = () => {
    if (window.$zoho?.salesiq?.floatwindow) {
      window.$zoho.salesiq.floatwindow.visible("show");
    } else {
      window.open("mailto:support@reviora.com?subject=Support%20Inquiry%20-%20Reviora", "_blank");
    }
  };

  return (
    <s-page heading="Dashboard">
      <s-stack gap="base">
        {featureSubmitted && (
          <s-banner tone="success" heading="Feature Request Submitted">
            <s-paragraph>
              Thank you for helping make Reviora better! Our product team reviews every merchant suggestion.
            </s-paragraph>
          </s-banner>
        )}

        {/* KPI Cards Grid */}
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap="base">
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
        </s-grid>

        {/* Recent Reviews Activity Section */}
        <s-section>
          <s-stack gap="base">
            <s-stack direction="inline" justifyContent="space-between" alignItems="center">
              <s-heading>Recent Reviews Activity</s-heading>
              {recentReviews.length > 0 && (
                <Link to="/app/reviews" style={{ textDecoration: "none" }}>
                  <s-button variant="primary">
                    View all in Moderation Inbox →
                  </s-button>
                </Link>
              )}
            </s-stack>

            {recentReviews.length === 0 ? (
              <s-box padding="large">
                <s-stack gap="extra-tight" alignItems="center">
                  <s-text color="subdued" type="strong">No reviews collected yet</s-text>
                  <s-paragraph color="subdued">
                    Customer reviews will appear here once submitted on your store or imported.
                  </s-paragraph>
                </s-stack>
              </s-box>
            ) : (
              <s-stack gap="small">
                {recentReviews.map((r) => (
                  <s-box key={r.id} padding="base" background="subdued" border="base" borderRadius="base">
                    <s-stack gap="extra-tight">
                      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                        <s-stack direction="inline" gap="extra-tight" alignItems="center">
                          <StarRating rating={r.rating} size={14} />
                          <s-text type="strong">{r.title || "Customer Review"}</s-text>
                        </s-stack>
                        <s-badge tone={r.status === "PUBLISHED" ? "success" : "warning"}>
                          {r.status}
                        </s-badge>
                      </s-stack>

                      <s-paragraph>{r.body}</s-paragraph>

                      <s-text color="subdued">
                        By {r.authorName} on {new Date(r.createdAt).toLocaleDateString()}
                        {Boolean(r.verified && r.authorEmail) && " • Verified Buyer"}
                      </s-text>
                    </s-stack>
                  </s-box>
                ))}
              </s-stack>
            )}
          </s-stack>
        </s-section>

        <s-divider></s-divider>

        {/* 2 App Bridge Callout Cards: Request a Feature & Contact Us */}
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap="base">
          {/* Callout Card 1: Request a Feature */}
          <s-section>
            <s-stack gap="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <span style={{ fontSize: "22px", lineHeight: 1 }}>💡</span>
                <s-heading size="small">Request a Feature</s-heading>
              </s-stack>
              <s-paragraph color="subdued">
                Have an idea for a new widget, custom review style, or specific integration? Let us know what you need and our team will build it.
              </s-paragraph>
              <div style={{ marginTop: "4px" }}>
                <s-button variant="secondary" onClick={handleOpenFeatureModal}>
                  Request a Feature ↗
                </s-button>
              </div>
            </s-stack>
          </s-section>

          {/* Callout Card 2: Contact Us */}
          <s-section>
            <s-stack gap="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <span style={{ fontSize: "22px", lineHeight: 1 }}>💬</span>
                <s-heading size="small">Contact Us</s-heading>
              </s-stack>
              <s-paragraph color="subdued">
                Need help installing widgets or have questions about your store? Our dedicated support team is available 24/7 to assist you.
              </s-paragraph>
              <div style={{ marginTop: "4px" }}>
                <s-button variant="primary" onClick={handleContactSupport}>
                  Contact Support ↗
                </s-button>
              </div>
            </s-stack>
          </s-section>
        </s-grid>
      </s-stack>

      {/* Feature Request Modal */}
      <s-modal id="dashboard-feature-modal" heading="Request a Feature">
        <s-stack gap="base">
          <s-paragraph>
            Tell us about the feature, widget, or integration you would like to see in Reviora:
          </s-paragraph>
          <s-text-field
            label="Feature Title / Summary"
            placeholder="e.g. TikTok video reviews, custom form questions, loyalty points"
            value={featureTitle}
            onInput={(e) => setFeatureTitle(e.target.value)}
          />
          <s-text-field
            label="Details &amp; Use Case"
            placeholder="Describe how this feature will help your store..."
            value={featureDetails}
            onInput={(e) => setFeatureDetails(e.target.value)}
            multiline="4"
          />
        </s-stack>
        <s-button
          slot="primary-action"
          variant="primary"
          onClick={handleSendFeatureRequest}
        >
          Submit Request
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="dashboard-feature-modal"
          command="--hide"
          onClick={handleCloseFeatureModal}
        >
          Cancel
        </s-button>
      </s-modal>
    </s-page>
  );
}


