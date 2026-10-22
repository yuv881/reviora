import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, Form, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server.js";
import { getAdminReviews, deleteReview } from "../models/review.server.js";
import { StoreReviews } from "../models/review.model.js";
import { connectDB } from "../db.server.js";
import { ReviewCard } from "../components/ReviewCard.jsx";
import { Search, Filter, Send, X, Trash2, Loader2, Download } from "lucide-react";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "ALL";
  const rating = url.searchParams.get("rating") || "";
  const search = url.searchParams.get("search") || "";
  const page = Number(url.searchParams.get("page") || 1);

  const data = await getAdminReviews(session.shop, { status, rating, search, page });
  return { ...data, status, rating, search };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const reviewId = formData.get("reviewId");

  if (!reviewId) return { error: "Review ID required" };

  await connectDB();

  if (intent === "delete") {
    await deleteReview(session.shop, reviewId);
    return { success: true, deleted: true };
  } else if (intent === "publish") {
    await StoreReviews.updateOne(
      { shop: session.shop, "reviews._id": reviewId },
      { $set: { "reviews.$.status": "PUBLISHED", "reviews.$.updatedAt": new Date() } }
    );
  } else if (intent === "reject") {
    await StoreReviews.updateOne(
      { shop: session.shop, "reviews._id": reviewId },
      { $set: { "reviews.$.status": "REJECTED", "reviews.$.updatedAt": new Date() } }
    );
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
  const { reviews, status, search } = useLoaderData();
  const fetcher = useFetcher();
  const [selectedReviewForReply, setSelectedReviewForReply] = useState(null);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const isSubmitting = fetcher.state !== "idle";
  const submittingIntent = fetcher.formData?.get("intent");
  const submittingReviewId = fetcher.formData?.get("reviewId");

  // Automatically close modals when fetcher completes successfully
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      if (reviewToDelete) setReviewToDelete(null);
      if (selectedReviewForReply) setSelectedReviewForReply(null);
    }
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isSubmitting) {
        setReviewToDelete(null);
        setSelectedReviewForReply(null);
      }
    };
    if (reviewToDelete || selectedReviewForReply) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [reviewToDelete, selectedReviewForReply, isSubmitting]);

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

  const handleReplySubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const replyBody = form.elements.replyBody.value;
    if (selectedReviewForReply && replyBody) {
      fetcher.submit(
        { intent: "reply", reviewId: selectedReviewForReply.id, replyBody },
        { method: "POST" }
      );
    }
  };

  return (
    <div className="reviora-page-wrapper">
      <TitleBar title="Moderation Inbox" />

      {/* Filter Toolbar */}
      <div className="reviora-card" style={{ padding: "16px", marginBottom: "20px" }}>
        <Form method="GET" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 280px", position: "relative" }}>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search reviewer name, email, or keywords..."
              className="reviora-input"
              style={{ paddingLeft: "32px" }}
            />
            <Search size={15} color="#8C9196" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
          </div>

          <div style={{ width: "180px" }}>
            <select name="status" defaultValue={status} className="reviora-select">
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="PUBLISHED">Published Only</option>
              <option value="FLAGGED">Flagged (Spam Risk)</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <button type="submit" className="reviora-btn reviora-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Filter size={14} />
            Apply Filters
          </button>

          <Link
            to="/app/import"
            className="reviora-btn reviora-btn-plain"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none", marginLeft: "auto" }}
          >
            <Download size={14} />
            Import &amp; Export
          </Link>
        </Form>
      </div>

      {/* Interactive Reply Modal / Card */}
      {selectedReviewForReply && (
        <div
          className="reviora-card"
          style={{
            borderLeft: "4px solid #008060",
            backgroundColor: "#F9FAF9",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#202223" }}>
              Reply to {selectedReviewForReply.authorName}
            </h3>
            <button
              type="button"
              className="reviora-btn reviora-btn-plain"
              onClick={() => setSelectedReviewForReply(null)}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <X size={15} /> Close
            </button>
          </div>

          <p style={{ fontSize: "13px", color: "#6D7175", margin: "0 0 12px 0" }}>
            Review: &ldquo;{selectedReviewForReply.body}&rdquo;
          </p>

          <form onSubmit={handleReplySubmit}>
            <textarea
              name="replyBody"
              rows="3"
              className="reviora-textarea"
              style={{ marginBottom: "12px" }}
              defaultValue={
                selectedReviewForReply.sentiment === "POSITIVE"
                  ? "Thank you so much for your review! We are thrilled to hear that you had a great experience."
                  : "Thank you for sharing your feedback. We apologize for any inconvenience and would love to help make this right!"
              }
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="submit"
                disabled={isSubmitting && submittingIntent === "reply"}
                className="reviora-btn reviora-btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {isSubmitting && submittingIntent === "reply" ? (
                  <>
                    <Loader2 size={14} className="reviora-spin" />
                    Posting Response...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Post Public Response
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isSubmitting && submittingIntent === "reply"}
                className="reviora-btn reviora-btn-secondary"
                onClick={() => setSelectedReviewForReply(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Review Cards Listing */}
      {reviews.length === 0 ? (
        <div className="reviora-card" style={{ textAlign: "center", padding: "40px 16px" }}>
          <p style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 6px 0", color: "#202223" }}>
            No reviews match your filters
          </p>
          <p style={{ fontSize: "13px", color: "#6D7175", margin: 0 }}>
            Try adjusting your search criteria or switch status to &ldquo;All Statuses&rdquo;.
          </p>
        </div>
      ) : (
        <div>
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              isLoading={isSubmitting && submittingReviewId === r.id}
              loadingIntent={submittingReviewId === r.id ? submittingIntent : null}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={() => setReviewToDelete(r)}
              onReply={(rev) => setSelectedReviewForReply(rev)}
            />
          ))}
        </div>
      )}

      {/* Shopify-styled Modal Confirmation Window */}
      {reviewToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reviora-delete-dialog-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "16px",
          }}
        >
          {/* Transparent full-screen interactive button for backdrop click-to-dismiss */}
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => setReviewToDelete(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.45)",
              backdropFilter: "blur(2px)",
              border: "none",
              cursor: "default",
              padding: 0,
              margin: 0,
              zIndex: 1,
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              maxWidth: "460px",
              width: "100%",
              overflow: "hidden",
              border: "1px solid #E1E3E5",
              animation: "revioraFadeIn 0.15s ease-out",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #F1F2F4",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "#FEE2E2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#DC2626",
                  }}
                >
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3
                    id="reviora-delete-dialog-title"
                    style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#202223" }}
                  >
                    Delete Review?
                  </h3>
                  <span style={{ fontSize: "12px", color: "#6D7175" }}>
                    by {reviewToDelete.authorName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="reviora-btn reviora-btn-plain"
                onClick={() => setReviewToDelete(null)}
                style={{ padding: "4px" }}
              >
                <X size={18} color="#6D7175" />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: "20px" }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#4B5563", lineHeight: "1.5" }}>
                Are you sure you want to permanently delete this review? This action cannot be undone and will remove all ratings and associated media.
              </p>
              {reviewToDelete.title && (
                <div
                  style={{
                    backgroundColor: "#F6F6F7",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "13px",
                    color: "#374151",
                    fontStyle: "italic",
                    borderLeft: "3px solid #DC2626",
                  }}
                >
                  &ldquo;{reviewToDelete.title}&rdquo;
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                padding: "14px 20px",
                backgroundColor: "#F9FAFB",
                borderTop: "1px solid #F1F2F4",
              }}
            >
              <button
                type="button"
                disabled={isSubmitting && submittingIntent === "delete"}
                className="reviora-btn reviora-btn-secondary"
                onClick={() => setReviewToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting && submittingIntent === "delete"}
                className="reviora-btn reviora-btn-critical"
                onClick={confirmDelete}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#DC2626",
                  borderColor: "#DC2626",
                  color: "#ffffff",
                  opacity: isSubmitting && submittingIntent === "delete" ? 0.75 : 1,
                  cursor: isSubmitting && submittingIntent === "delete" ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting && submittingIntent === "delete" ? (
                  <>
                    <Loader2 size={14} className="reviora-spin" />
                    Deleting Review...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete Review
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ErrorBoundary() {
  return boundary.error();
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
