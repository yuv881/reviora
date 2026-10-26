import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useSubmit, useNavigation, useNavigate } from "react-router";

import { authenticate } from "../shopify.server.js";
import { getAdminReviews, deleteReview, verifyCustomerByEmail, syncProductReviewMetafields } from "../models/review.server.js";
import { StoreReviews } from "../models/review.model.js";
import { connectDB } from "../db.server.js";
import { ReviewCard } from "../components/ReviewCard.jsx";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "ALL";
  const rating = url.searchParams.get("rating") || "";
  const search = url.searchParams.get("search") || "";
  const page = Number(url.searchParams.get("page") || 1);
  const data = await getAdminReviews(session.shop, { status, rating, search, page });

  // Verify reviewer against existing customer orders by email
  const verifiedReviews = await Promise.all(
    data.reviews.map(async (r) => {
      if (!r.authorEmail) {
        return { ...r, verified: false };
      }
      const isCustomer = await verifyCustomerByEmail(session.shop, r.authorEmail, admin);
      return {
        ...r,
        verified: isCustomer,
      };
    })
  );

  return { ...data, reviews: verifiedReviews, status, rating, search };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const reviewId = formData.get("reviewId");

  if (!reviewId) return { error: "Review ID required" };

  await connectDB();

  // Find target review to get product identifier for metafield sync
  const doc = await StoreReviews.findOne(
    { shop: session.shop, "reviews._id": reviewId },
    { "reviews.$": 1 }
  ).lean();
  const targetReview = doc?.reviews?.[0];

  if (intent === "delete") {
    await deleteReview(session.shop, reviewId, admin);
    return { success: true, deleted: true };
  } else if (intent === "publish") {
    await StoreReviews.updateOne(
      { shop: session.shop, "reviews._id": reviewId },
      { $set: { "reviews.$.status": "Published", "reviews.$.updatedAt": new Date() } }
    );
    if (targetReview?.productId || targetReview?.productHandle) {
      await syncProductReviewMetafields({
        shop: session.shop,
        productId: targetReview.productId,
        productHandle: targetReview.productHandle,
        adminClient: admin,
      });
    }
  } else if (intent === "reject") {
    await StoreReviews.updateOne(
      { shop: session.shop, "reviews._id": reviewId },
      { $set: { "reviews.$.status": "REJECTED", "reviews.$.updatedAt": new Date() } }
    );
    if (targetReview?.productId || targetReview?.productHandle) {
      await syncProductReviewMetafields({
        shop: session.shop,
        productId: targetReview.productId,
        productHandle: targetReview.productHandle,
        adminClient: admin,
      });
    }
  } else if (intent === "reply") {
    const replyBody = formData.get("replyBody");
    if (replyBody) {
      await StoreReviews.updateOne(
        { shop: session.shop, "reviews._id": reviewId },
        {
          $push: {
            "reviews.$.replies": {
              body: replyBody,
              author: "Store Owner",
              isAiGenerated: false,
              createdAt: new Date(),
            },
          },
          $set: { "reviews.$.updatedAt": new Date() },
        }
      );
    }
  }

  return { success: true };
};

export default function ReviewsManagerPage() {
  const loaderData = useLoaderData();
  const reviews = loaderData?.reviews || [];
  const status = loaderData?.status || "ALL";
  const search = loaderData?.search || "";
  const fetcher = useFetcher();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isFiltering = navigation.state === "loading" && navigation.location?.search !== "";

  const [searchQuery, setSearchQuery] = useState(search || "");
  const [statusFilter, setStatusFilter] = useState(status || "ALL");
  const [selectedReviewForReply, setSelectedReviewForReply] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const isSubmitting = fetcher.state !== "idle";
  const submittingIntent = fetcher.formData?.get("intent");
  const submittingReviewId = fetcher.formData?.get("reviewId");
  const navigate = useNavigate();

  // Automatically close modals when fetcher completes successfully
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setReviewToDelete(null);
      setSelectedReviewForReply(null);
      setReplyText("");
    }
  }, [fetcher.state, fetcher.data]);

  const handleApprove = (reviewId) => {
    fetcher.submit({ intent: "publish", reviewId }, { method: "POST" });
  };

  const handleReject = (reviewId) => {
    fetcher.submit({ intent: "reject", reviewId }, { method: "POST" });
  };

  const confirmDelete = () => {
    if (reviewToDelete) {
      fetcher.submit({ intent: "delete", reviewId: reviewToDelete.id }, { method: "POST" });
    }
  };

  const handleApplyFilter = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    submit({ search: searchQuery, status: statusFilter }, { method: "GET" });
  };

  const handleClearFilter = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    submit({ search: "", status: "ALL" }, { method: "GET" });
  };

  const handleOpenReply = (review) => {
    setSelectedReviewForReply(review);
    setReplyText(
      review.sentiment === "POSITIVE"
        ? "Thank you so much for your review! We are thrilled to hear that you had a great experience."
        : "Thank you for sharing your feedback. We apologize for any inconvenience and would love to help make this right!"
    );
  };

  const handleReplySubmit = () => {
    if (selectedReviewForReply && replyText.trim()) {
      fetcher.submit(
        { intent: "reply", reviewId: selectedReviewForReply.id, replyBody: replyText.trim() },
        { method: "POST" }
      );
    }
  };

  const statusOptions = [
    { label: "All Statuses", value: "ALL" },
    { label: "Pending Only", value: "PENDING" },
    { label: "Published Only", value: "Published" },
    { label: "Flagged (Spam Risk)", value: "FLAGGED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  useEffect(() => {
    if (reviewToDelete) {
      window.shopify?.modal?.show("delete-review-modal");
    } else {
      window.shopify?.modal?.hide("delete-review-modal");
    }
  }, [reviewToDelete]);

  return (
    <s-page heading="Moderation Inbox">
      <s-button slot="primary-action" variant="primary" onClick={() => navigate("/app/import")}>
        Import &amp; Export
      </s-button>

      <s-stack gap="base">
        {/* Filters Card */}
        <s-section>
          <s-grid gridTemplateColumns="1fr 200px auto auto" gap="small" alignItems="end">
            <s-text-field
              label="Search Reviews"
              value={searchQuery}
              onInput={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviewer name, email, or keywords..."
            />

            <s-select
              label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map((opt) => (
                <s-option key={opt.value} value={opt.value}>
                  {opt.label}
                </s-option>
              ))}
            </s-select>

            <s-button variant="primary" onClick={handleApplyFilter} loading={isFiltering ? true : undefined}>
              Apply Filters
            </s-button>

            {(searchQuery || statusFilter !== "ALL") && (
              <s-button variant="primary" tone="critical" onClick={handleClearFilter} disabled={isFiltering ? true : undefined}>
                Clear
              </s-button>
            )}
          </s-grid>
        </s-section>

        {/* Interactive Reply Section */}
        {selectedReviewForReply && (
          <s-section>
            <s-stack gap="base">
              <s-heading size="small">
                Reply to {selectedReviewForReply.authorName}
              </s-heading>

              <s-banner tone="info" heading="Customer Review">
                <s-paragraph>&ldquo;{selectedReviewForReply.body}&rdquo;</s-paragraph>
              </s-banner>

              <s-text-field
                label="Your Public Response"
                value={replyText}
                onInput={(e) => setReplyText(e.target.value)}
                multiline="3"
              />

              <s-stack direction="inline" gap="small">
                <s-button
                  variant="primary"
                  loading={isSubmitting && submittingIntent === "reply" ? true : undefined}
                  onClick={handleReplySubmit}
                >
                  Post Public Response
                </s-button>
                <s-button
                  variant="secondary"
                  disabled={isSubmitting && submittingIntent === "reply" ? true : undefined}
                  onClick={() => setSelectedReviewForReply(null)}
                >
                  Cancel
                </s-button>
              </s-stack>
            </s-stack>
          </s-section>
        )}

        {/* Review Cards Listing */}
        {reviews.length === 0 ? (
          <s-section>
            <s-box padding="large">
              <s-stack gap="extra-tight" alignItems="center">
                <s-text tone="subdued" weight="semibold">
                  No reviews match your filters
                </s-text>
                <s-text tone="subdued" size="small">
                  Try adjusting your search criteria or switch status to &ldquo;All Statuses&rdquo;.
                </s-text>
              </s-stack>
            </s-box>
          </s-section>
        ) : (
          <s-stack gap="base">
            {reviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                isLoading={isSubmitting && submittingReviewId === r.id}
                loadingIntent={submittingReviewId === r.id ? submittingIntent : null}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={() => setReviewToDelete(r)}
                onReply={handleOpenReply}
              />
            ))}
          </s-stack>
        )}
      </s-stack>

      {/* App Bridge Modal for Delete Confirmation */}
      {reviewToDelete && (
        <s-modal
          id="delete-review-modal"
          heading="Delete Review?"
          open
          onClose={() => setReviewToDelete(null)}
        >
          <s-stack gap="base">
            <s-paragraph>
              Are you sure you want to permanently delete this review by{" "}
              <s-text weight="bold">{reviewToDelete?.authorName}</s-text>? This action cannot be undone.
            </s-paragraph>
            {reviewToDelete?.title && (
              <s-banner tone="warning" heading="Review Title">
                <s-paragraph>&ldquo;{reviewToDelete.title}&rdquo;</s-paragraph>
              </s-banner>
            )}
          </s-stack>
          <s-button
            slot="primary-action"
            variant="primary"
            tone="critical"
            loading={isSubmitting && submittingIntent === "delete" ? true : undefined}
            onClick={confirmDelete}
          >
            Delete Review
          </s-button>
          <s-button
            slot="secondary-actions"
            variant="secondary"
            onClick={() => setReviewToDelete(null)}
          >
            Cancel
          </s-button>
        </s-modal>
      )}
    </s-page>
  );
}


