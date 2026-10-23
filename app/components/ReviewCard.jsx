import { useState } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Badge,
  Text,
  ButtonGroup,
  Button,
  Divider,
  Box,
  Thumbnail,
  Modal,
} from "@shopify/polaris";
import { StarRating } from "./StarRating.jsx";

/**
 * ReviewCard using native Shopify Polaris React components
 */
export function ReviewCard({ review, onApprove, onReject, onReply, onDelete, isLoading, loadingIntent }) {
  const [previewImage, setPreviewImage] = useState(null);
  const topics = review.topics ? JSON.parse(review.topics) : [];

  let statusTone = "info";
  if (review.status === "PUBLISHED") statusTone = "success";
  if (review.status === "PENDING") statusTone = "warning";
  if (review.status === "FLAGGED" || review.status === "REJECTED") statusTone = "critical";

  let sentimentTone = "info";
  if (review.sentiment === "POSITIVE") sentimentTone = "success";
  if (review.sentiment === "NEGATIVE") sentimentTone = "critical";

  return (
    <>
      <Card>
        <BlockStack gap="300">
          {/* Top Header Row */}
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="200" blockAlign="center">
              <StarRating rating={review.rating} size={15} />
              <Text as="h3" variant="headingSm" fontWeight="semibold">
                {review.title || "Customer Review"}
              </Text>
              {review.verified && <Badge tone="success">Verified Buyer</Badge>}
            </InlineStack>

            <InlineStack gap="150" blockAlign="center">
              <Badge tone={statusTone}>{review.status}</Badge>
              {review.sentiment && (
                <Badge tone={sentimentTone}>{review.sentiment}</Badge>
              )}
            </InlineStack>
          </InlineStack>

          {/* Author and Product details */}
          <Text as="p" variant="bodySm" tone="subdued">
            By <Text as="span" fontWeight="semibold">{review.authorName}</Text> ({review.authorEmail})
            {review.productTitle && ` • on ${review.productTitle}`}
            {` • ${new Date(review.createdAt).toLocaleDateString()}`}
          </Text>

          {/* Review Body */}
          <Text as="p" variant="bodyMd">
            {review.body}
          </Text>

          {/* Attached Media */}
          {review.media && review.media.length > 0 && (
            <InlineStack gap="200">
              {review.media.map((m) => (
                <button
                  key={m.id || m.url}
                  type="button"
                  onClick={() => setPreviewImage(m.url)}
                  title="Click to view full photo"
                  aria-label="Click to enlarge customer photo"
                  style={{
                    border: "1px solid #E1E3E5",
                    background: "#FFFFFF",
                    padding: "2px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.06)";
                    e.currentTarget.style.borderColor = "#008060";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.borderColor = "#E1E3E5";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <Thumbnail
                    source={m.url}
                    size="medium"
                    alt="Customer upload"
                  />
                </button>
              ))}
            </InlineStack>
          )}

          {/* Topics */}
          {topics.length > 0 && (
            <InlineStack gap="100">
              {topics.map((t, idx) => (
                <Badge key={idx} tone="info">
                  {`#${t}`}
                </Badge>
              ))}
            </InlineStack>
          )}

          {/* Merchant Reply Section */}
          {review.replies && review.replies.length > 0 && (
            <Box background="bg-surface-secondary" padding="300" borderRadius="200">
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" fontWeight="bold" tone="success">
                  Store Owner Response:
                </Text>
                <Text as="p" variant="bodySm">
                  {review.replies[0].body}
                </Text>
              </BlockStack>
            </Box>
          )}

          {/* Actions Row */}
          <Divider />
          <InlineStack align="space-between" blockAlign="center">
            <ButtonGroup>
              {review.status !== "PUBLISHED" && (
                <Button
                  variant="primary"
                  disabled={isLoading}
                  loading={isLoading && loadingIntent === "publish"}
                  onClick={() => onApprove(review.id)}
                >
                  Approve &amp; Publish
                </Button>
              )}

              {review.status !== "REJECTED" && (
                <Button
                  tone="critical"
                  disabled={isLoading}
                  loading={isLoading && loadingIntent === "reject"}
                  onClick={() => onReject(review.id)}
                >
                  Reject
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={() => onReply(review)}
              >
                Reply to Customer
              </Button>
            </ButtonGroup>

            {onDelete && (
              <Button
                variant="plain"
                tone="critical"
                onClick={() => onDelete(review)}
              >
                Delete
              </Button>
            )}
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Customer Photo Lightbox Modal */}
      <Modal
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title="Customer Photo"
        secondaryActions={[
          {
            content: "Open original in new tab",
            onAction: () => window.open(previewImage, "_blank", "noopener,noreferrer"),
          },
          {
            content: "Close",
            onAction: () => setPreviewImage(null),
          },
        ]}
      >
        <Modal.Section>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#F6F6F7",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <img
              src={previewImage}
              alt="Customer review attachment"
              style={{
                maxWidth: "100%",
                maxHeight: "65vh",
                borderRadius: "6px",
                objectFit: "contain",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              }}
            />
          </div>
        </Modal.Section>
      </Modal>
    </>
  );
}
