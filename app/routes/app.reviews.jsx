import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useSubmit, useNavigation, useNavigate } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  TextField,
  Select,
  Button,
  Banner,
  Modal,
  Text,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";
import { getAdminReviews, deleteReview } from "../models/review.server.js";
import { StoreReviews } from "../models/review.model.js";
import { connectDB } from "../db.server.js";
import { ReviewCard } from "../components/ReviewCard.jsx";

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
      if (reviewToDelete) {
        setReviewToDelete(null);
      }
      if (selectedReviewForReply) {
        setSelectedReviewForReply(null);
        setReplyText("");
      }
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
    { label: "Published Only", value: "PUBLISHED" },
    { label: "Flagged (Spam Risk)", value: "FLAGGED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <Page>
      <ui-title-bar title="Moderation Inbox">
        <button variant="primary" onClick={() => navigate("/app/import")} >
          Import & Export
        </button>
      </ui-title-bar>
      <BlockStack gap="500">
        {/* Filters Card */}
        <Card>
          <BlockStack gap="400">
            <InlineGrid columns={{ xs: 1, md: "1fr 200px auto auto" }} gap="300" alignItems="end">
              <TextField
                label="Search Reviews"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search reviewer name, email, or keywords..."
                autoComplete="off"
                clearButton
                onClearButtonClick={() => setSearchQuery("")}
              />

              <Select
                label="Filter by Status"
                options={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
              />

              <Button variant="primary" onClick={handleApplyFilter} loading={isFiltering}>
                Apply Filters
              </Button>

              {(searchQuery || statusFilter !== "ALL") && (
                <Button variant="plain" onClick={handleClearFilter} disabled={isFiltering}>
                  Clear
                </Button>
              )}
            </InlineGrid>
          </BlockStack>
        </Card>

        {/* Interactive Reply Section */}
        {selectedReviewForReply && (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Reply to {selectedReviewForReply.authorName}
              </Text>

              <Banner tone="info" title="Customer Review">
                <p>&ldquo;{selectedReviewForReply.body}&rdquo;</p>
              </Banner>

              <TextField
                label="Your Public Response"
                value={replyText}
                onChange={setReplyText}
                multiline={3}
                autoComplete="off"
              />

              <InlineStack gap="300">
                <Button
                  variant="primary"
                  loading={isSubmitting && submittingIntent === "reply"}
                  onClick={handleReplySubmit}
                >
                  Post Public Response
                </Button>
                <Button
                  variant="secondary"
                  disabled={isSubmitting && submittingIntent === "reply"}
                  onClick={() => setSelectedReviewForReply(null)}
                >
                  Cancel
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        )}

        {/* Review Cards Listing */}
        {reviews.length === 0 ? (
          <Card>
            <Box padding="600">
              <BlockStack gap="200" inlineAlign="center">
                <Text as="p" variant="headingSm" tone="subdued">
                  No reviews match your filters
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Try adjusting your search criteria or switch status to &ldquo;All Statuses&rdquo;.
                </Text>
              </BlockStack>
            </Box>
          </Card>
        ) : (
          <BlockStack gap="400">
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
          </BlockStack>
        )}
      </BlockStack>

      {/* Polaris Modal for Delete Confirmation */}
      <Modal
        open={Boolean(reviewToDelete)}
        onClose={() => setReviewToDelete(null)}
        title="Delete Review?"
        primaryAction={{
          content: "Delete Review",
          destructive: true,
          loading: isSubmitting && submittingIntent === "delete",
          onAction: confirmDelete,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setReviewToDelete(null),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p">
              Are you sure you want to permanently delete this review by{" "}
              <Text as="span" fontWeight="bold">{reviewToDelete?.authorName}</Text>? This action cannot be undone.
            </Text>
            {reviewToDelete?.title && (
              <Banner tone="warning" title="Review Title">
                <p>&ldquo;{reviewToDelete.title}&rdquo;</p>
              </Banner>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}


