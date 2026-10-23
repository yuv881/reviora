import { useState, useEffect, useMemo } from "react";
import { useLoaderData, useFetcher, useSubmit, useNavigation } from "react-router";
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
  Badge,
  Divider,
  Text,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";
import { ReviewRequest } from "../models/reviewRequest.model.js";
import { connectDB } from "../db.server.js";
import { sendReviewRequestEmail } from "../utils/email.server.js";
import { GET_RECENT_ORDERS_QUERY } from "../graphql/index.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  await connectDB();

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";

  let orders = [];
  try {
    // Lean 20 orders to keep page transitions super snappy
    const variables = { first: 20 };
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
  const loaderData = useLoaderData();
  const requests = loaderData?.requests || [];
  const orders = useMemo(() => loaderData?.orders || [], [loaderData?.orders]);
  const searchQuery = loaderData?.searchQuery || "";
  const fetcher = useFetcher();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSending = fetcher.state === "submitting";
  const isSearching = navigation.state === "loading" && navigation.location?.search !== "";

  // Search input state
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Selection states
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);

  const currentOrder = orders.find((o) => o.id === selectedOrderId);

  // Update selection if orders change
  useEffect(() => {
    if (orders.length > 0 && selectedOrderId && !orders.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId("");
    } else if (orders.length === 0) {
      setSelectedOrderId("");
    }
  }, [orders, selectedOrderId]);

  // Auto-fill customer and products whenever the selected order changes
  useEffect(() => {
    if (currentOrder) {
      setCustomerName(currentOrder.customerName || "");
      setCustomerEmail(currentOrder.customerEmail || "");
      setOrderNumber(currentOrder.orderNumber || "");
      setSelectedProductIndex(0);
    } else {
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
    if (e && e.preventDefault) e.preventDefault();
    submit({ q: searchInput }, { method: "GET" });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    submit({}, { method: "GET" });
  };

  const handleSend = () => {
    if (!currentOrder || !currentProduct) return;
    fetcher.submit(
      {
        intent: "send_manual",
        orderId: currentOrder.orderNumber || orderNumber,
        productTitle: currentProduct.title,
        productId: currentProduct.productId || "custom-product",
        productHandle: currentProduct.productHandle || "",
        customerName,
        customerEmail,
      },
      { method: "POST" }
    );
  };

  const orderSelectOptions =
    orders.length === 0
      ? [
        {
          label: searchQuery
            ? `No delivered orders matching "${searchQuery}"`
            : "No delivered orders found yet",
          value: "",
          disabled: true,
        },
      ]
      : [
        { label: "Please select an order", value: "" },
        ...orders.map((o) => ({
          label: `${o.orderNumber} — ${o.customerName} (${o.customerEmail || "No email"}) • [${o.fulfillmentStatus}]`,
          value: o.id,
        })),
      ];

  const productOptions =
    currentOrder && currentOrder.items?.length > 0
      ? currentOrder.items.map((item, idx) => ({
        label: item.title,
        value: idx.toString(),
      }))
      : [];

  return (
    <Page>
      <ui-title-bar title="Review Requests" />
      <BlockStack gap="500">
        {/* Banner Feedback */}
        {fetcher.data?.message && (
          <Banner tone="success" title="Success" onDismiss={() => { }}>
            <p>{fetcher.data.message}</p>
          </Banner>
        )}

        {(fetcher.data?.warning || fetcher.data?.error) && (
          <Banner tone="critical" title="Delivery Notice" onDismiss={() => { }}>
            <p>{fetcher.data.warning || fetcher.data.error}</p>
          </Banner>
        )}

        {/* Section 1: Send Invitation by Order */}
        <Card>
          <BlockStack gap="400">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">Send Review Invitation by Order</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Select or search delivered and fulfilled orders from your store to automatically populate customer and product details.
              </Text>
            </BlockStack>

            {/* Order Search Bar */}
            <InlineGrid columns={{ xs: 1, md: "1fr auto auto" }} gap="300" alignItems="end">
              <TextField
                label="Search Delivered Orders"
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search order #, customer name, or email..."
                autoComplete="off"
              />
              <Button variant="secondary" onClick={handleSearchSubmit} loading={isSearching}>
                Search
              </Button>
              {searchQuery && (
                <Button variant="plain" onClick={handleClearSearch} disabled={isSearching}>
                  Clear ({searchQuery})
                </Button>
              )}
            </InlineGrid>

            <Divider />

            {/* Review Invitation Form */}
            <BlockStack gap="400">
              <Select
                label="Select Delivered Order"
                options={orderSelectOptions}
                value={selectedOrderId}
                onChange={setSelectedOrderId}
                disabled={orders.length === 0}
              />

              <InlineGrid columns={{ xs: 1, md: 3 }} gap="300">
                <TextField
                  label="Customer Name"
                  value={customerName}
                  onChange={setCustomerName}
                  autoComplete="name"
                  disabled={!currentOrder}
                />

                <TextField
                  label="Customer Email"
                  type="email"
                  value={customerEmail}
                  onChange={setCustomerEmail}
                  autoComplete="email"
                  disabled={!currentOrder}
                />

                {currentOrder && currentOrder.items && currentOrder.items.length > 0 ? (
                  <Select
                    label="Purchased Product"
                    options={productOptions}
                    value={selectedProductIndex.toString()}
                    onChange={(val) => setSelectedProductIndex(Number(val))}
                  />
                ) : (
                  <TextField
                    label="Purchased Product"
                    value=""
                    disabled
                    placeholder="No product selected"
                    autoComplete="off"
                  />
                )}
              </InlineGrid>

              <InlineStack>
                <Button
                  variant="primary"
                  loading={isSending}
                  disabled={!currentOrder || !currentProduct || !customerEmail.trim()}
                  onClick={handleSend}
                >
                  Send Review Invitation
                </Button>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>

        {/* Section 2: Delivery & Activity Log */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Delivery &amp; Activity Log</Text>

            {requests.length === 0 ? (
              <Box padding="600">
                <BlockStack gap="200" inlineAlign="center">
                  <Text as="p" variant="headingSm" tone="subdued">
                    No invitations sent yet
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Use the form above to send your first customer review invitation.
                  </Text>
                </BlockStack>
              </Box>
            ) : (
              <BlockStack gap="300">
                {requests.map((req) => (
                  <Box key={req.id} background="bg-surface-secondary" padding="300" borderRadius="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {req.customerName || req.customerEmail}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Order: <Text as="span" fontWeight="medium">{req.orderId}</Text> • Product:{" "}
                          <Text as="span" fontWeight="medium">{req.productTitle || req.productId}</Text> • Channel:{" "}
                          {req.channel} • {new Date(req.createdAt).toLocaleString()}
                        </Text>
                      </BlockStack>

                      <Badge
                        tone={
                          req.status === "SENT"
                            ? "success"
                            : req.status === "FAILED"
                              ? "critical"
                              : "warning"
                        }
                      >
                        {req.status}
                      </Badge>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}


