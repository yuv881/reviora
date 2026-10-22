import { StarRating } from "./StarRating.jsx";
import { CheckCircle2, MessageSquare, Check, X, Sparkles, Trash2, Loader2 } from "lucide-react";

/**
 * ReviewCard with Lucide icons and clean Stitch styling
 */
export function ReviewCard({ review, onApprove, onReject, onReply, onDelete, isLoading, loadingIntent }) {
  const topics = review.topics ? JSON.parse(review.topics) : [];

  let statusBadgeClass = "reviora-badge-info";
  if (review.status === "PUBLISHED") statusBadgeClass = "reviora-badge-success";
  if (review.status === "PENDING") statusBadgeClass = "reviora-badge-warning";
  if (review.status === "FLAGGED" || review.status === "REJECTED") statusBadgeClass = "reviora-badge-critical";

  let sentimentBadgeClass = "reviora-badge-info";
  if (review.sentiment === "POSITIVE") sentimentBadgeClass = "reviora-badge-success";
  if (review.sentiment === "NEGATIVE") sentimentBadgeClass = "reviora-badge-critical";

  return (
    <div className="reviora-card" style={{ marginBottom: "16px" }}>
      {/* Top Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <StarRating rating={review.rating} size={16} />
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#202223" }}>
            {review.title || "Review"}
          </h3>
          {review.verified && (
            <span className="reviora-badge-pill reviora-badge-success" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <CheckCircle2 size={12} color="#108043" />
              Verified Buyer
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className={`reviora-badge-pill ${statusBadgeClass}`}>
            {review.status}
          </span>
          {review.sentiment && (
            <span className={`reviora-badge-pill ${sentimentBadgeClass}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Sparkles size={11} />
              {review.sentiment}
            </span>
          )}
        </div>
      </div>

      {/* Author and Product details */}
      <div style={{ fontSize: "12px", color: "#6D7175", marginBottom: "12px" }}>
        By <strong>{review.authorName}</strong> ({review.authorEmail})
        {review.productTitle && (
          <span> • on <em>{review.productTitle}</em></span>
        )}
        <span> • {new Date(review.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Review Body */}
      <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#202223", margin: "0 0 12px 0" }}>
        {review.body}
      </p>

      {/* Attached Media */}
      {review.media && review.media.length > 0 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
          {review.media.map((m) => (
            <img
              key={m.id}
              src={m.url}
              alt="Customer upload"
              style={{
                width: "72px",
                height: "72px",
                objectFit: "cover",
                borderRadius: "6px",
                border: "1px solid #E1E3E5",
              }}
            />
          ))}
        </div>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
          {topics.map((t, idx) => (
            <span
              key={idx}
              style={{
                backgroundColor: "#EEF2FF",
                color: "#4338CA",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: "500",
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Merchant Reply Section */}
      {review.replies && review.replies.length > 0 && (
        <div
          style={{
            backgroundColor: "#F6F6F7",
            borderLeft: "3px solid #008060",
            padding: "10px 14px",
            borderRadius: "0 6px 6px 0",
            marginBottom: "14px",
            fontSize: "13px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#202223", fontWeight: "600" }}>
            <MessageSquare size={13} color="#008060" />
            Store Owner Response:
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#4B5563" }}>{review.replies[0].body}</p>
        </div>
      )}

      {/* Actions Row */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", borderTop: "1px solid #F1F2F4", paddingTop: "12px" }}>
        {review.status !== "PUBLISHED" && (
          <button
            type="button"
            disabled={isLoading}
            className="reviora-btn reviora-btn-primary"
            onClick={() => onApprove(review.id)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {isLoading && loadingIntent === "publish" ? (
              <>
                <Loader2 size={14} className="reviora-spin" />
                Approving...
              </>
            ) : (
              <>
                <Check size={14} />
                Approve &amp; Publish
              </>
            )}
          </button>
        )}

        {review.status !== "REJECTED" && (
          <button
            type="button"
            disabled={isLoading}
            className="reviora-btn reviora-btn-critical"
            onClick={() => onReject(review.id)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {isLoading && loadingIntent === "reject" ? (
              <>
                <Loader2 size={14} className="reviora-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <X size={14} />
                Reject
              </>
            )}
          </button>
        )}

        <button
          type="button"
          className="reviora-btn reviora-btn-secondary"
          onClick={() => onReply(review)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <MessageSquare size={14} />
          Reply to Customer
        </button>

        {onDelete && (
          <button
            type="button"
            className="reviora-btn reviora-btn-plain"
            onClick={() => onDelete(review.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "#D72C0D",
              marginLeft: "auto",
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
