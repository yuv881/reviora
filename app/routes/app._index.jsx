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

  return (
    <s-page heading="Dashboard">
      <s-stack gap="base">
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
      </s-stack>
    </s-page>
  );
}


