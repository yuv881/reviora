import { connectDB } from "../db.server.js";
import { ShopSetting } from "./shopSetting.model.js";
import { StoreReviews } from "./review.model.js";
import { ReviewRequest } from "./reviewRequest.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.server.js";
import { unauthenticated } from "../shopify.server.js";

/**
 * Verify whether an authorEmail belongs to an existing customer with orders in Shopify
 * or has an existing order review request in this shop.
 */
export async function verifyCustomerByEmail(shop, email, adminClient = null) {
  if (!email || !email.trim() || !shop) return false;
  const cleanEmail = email.trim().toLowerCase();

  try {
    await connectDB();
    // 1. Fast check in local ReviewRequest database (fulfilled/delivered orders)
    const hasRequest = await ReviewRequest.exists({
      shop,
      customerEmail: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
    });
    if (hasRequest) return true;
  } catch (err) {
    console.warn("Could not check ReviewRequest for email verification:", err?.message || err);
  }

  // 2. Query Shopify orders for this email via Admin GraphQL
  try {
    let admin = adminClient;
    if (!admin) {
      const auth = await unauthenticated.admin(shop);
      admin = auth?.admin;
    }

    if (admin) {
      const response = await admin.graphql(
        `#graphql
        query checkCustomerPurchased($query: String!) {
          orders(first: 1, query: $query) {
            nodes {
              id
            }
          }
        }`,
        {
          variables: {
            query: `email:${cleanEmail}`,
          },
        }
      );

      const json = await response.json();
      const orders = json.data?.orders?.nodes || [];
      if (orders.length > 0) {
        return true;
      }
    }
  } catch (err) {
    console.warn(`Customer order check for "${cleanEmail}" failed:`, err?.message || err);
  }

  return false;
}

/**
 * Fetch or initialize default settings for a given shop
 */
export async function getShopSettings(shop) {
  await connectDB();
  let settings = await ShopSetting.findOne({ shop });

  if (!settings) {
    settings = await ShopSetting.create({
      shop,
      autoPublish: true,
      minAutoPublishRating: 4,
      primaryColor: "#FFB800",
      badgeColor: "#10B981",
      requestTimingDays: 7,
      emailSubject: "How did you like your purchase?",
      emailBody: "Thank you for your order! We would love to hear your feedback on your recent purchase.",
      enableAiFeatures: true,
    });
  }

  return settings.toObject({ virtuals: true });
}

/**
 * Update shop settings
 */
export async function updateShopSettings(shop, data) {
  await connectDB();
  const updated = await ShopSetting.findOneAndUpdate(
    { shop },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return updated.toObject({ virtuals: true });
}

/**
 * Update widget-specific settings for a shop
 */
export async function updateWidgetSettings(shop, widgetId, widgetData) {
  await connectDB();
  const current = await getShopSettings(shop);
  const updatedWidgets = {
    ...(current?.widgetSettings || {}),
    [widgetId]: {
      ...((current?.widgetSettings && current.widgetSettings[widgetId]) || {}),
      ...widgetData,
    },
  };
  return updateShopSettings(shop, { widgetSettings: updatedWidgets });
}


/**
 * Fetch reviews for admin moderation with filters & pagination
 */
export async function getAdminReviews(shop, { status, rating, search, page = 1, limit = 20 } = {}) {
  await connectDB();
  const storeDoc = await StoreReviews.findOne({ shop }).lean({ virtuals: true });

  let allReviews = (storeDoc?.reviews || []).map((r) => ({
    ...r,
    id: r.id || r._id?.toString(),
    media: (r.media || []).map((m) => ({ ...m, id: m.id || m._id?.toString() })),
    replies: (r.replies || []).map((rep) => ({ ...rep, id: rep.id || rep._id?.toString() })),
  }));

  // Filtering
  if (status && status !== "ALL") {
    allReviews = allReviews.filter((r) => r.status === status);
  }

  if (rating) {
    allReviews = allReviews.filter((r) => r.rating === Number(rating));
  }

  if (search) {
    const s = search.toLowerCase();
    allReviews = allReviews.filter((r) => {
      return (
        (r.authorName && r.authorName.toLowerCase().includes(s)) ||
        (r.authorEmail && r.authorEmail.toLowerCase().includes(s)) ||
        (r.title && r.title.toLowerCase().includes(s)) ||
        (r.body && r.body.toLowerCase().includes(s)) ||
        (r.productTitle && r.productTitle.toLowerCase().includes(s))
      );
    });
  }

  // Sort by createdAt descending
  allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalCount = allReviews.length;
  const skip = (page - 1) * limit;
  const paginatedReviews = allReviews.slice(skip, skip + limit);

  return {
    reviews: paginatedReviews,
    totalCount,
    totalPages: Math.ceil(totalCount / limit) || 1,
    currentPage: page,
  };
}

/**
 * Get aggregate dashboard metrics for a shop
 */
export async function getDashboardMetrics(shop) {
  await connectDB();
  const [storeDoc, totalRequests] = await Promise.all([
    StoreReviews.findOne({ shop }).lean({ virtuals: true }),
    ReviewRequest.countDocuments({ shop }),
  ]);

  const allReviews = storeDoc?.reviews || [];
  const totalReviews = allReviews.length;
  const publishedReviews = allReviews.filter((r) => r.status === "PUBLISHED");
  const pendingReviews = allReviews.filter((r) => r.status === "PENDING").length;

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let weightedSum = 0;

  publishedReviews.forEach((item) => {
    if (distribution[item.rating] !== undefined) {
      distribution[item.rating] += 1;
      weightedSum += item.rating;
    }
  });

  const pubCount = publishedReviews.length;
  const averageRating = pubCount > 0 ? (weightedSum / pubCount).toFixed(1) : "0.0";

  return {
    totalReviews,
    publishedReviews: pubCount,
    pendingReviews,
    averageRating: Number(averageRating),
    distribution,
    totalRequests,
  };
}

/**
 * Public storefront query for product reviews
 */
export async function getStorefrontReviews(shop, productId, { sort = "newest", rating, hasMedia = false, limit = null } = {}) {
  await connectDB();
  const storeDoc = await StoreReviews.findOne({ shop }).lean({ virtuals: true });
  const allReviews = storeDoc?.reviews || [];

  // Filter for matching product and published status (supports all products if "all" or omitted)
  let matchingReviews = allReviews.filter(
    (r) => (productId === "all" || !productId ? true : String(r.productId) === String(productId)) && r.status === "PUBLISHED"
  );

  // Calculate aggregates based on all published reviews for this product
  const total = matchingReviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  matchingReviews.forEach((r) => {
    const numericRating = Math.round(Number(r.rating) || 5);
    if (distribution[numericRating] !== undefined) {
      distribution[numericRating] += 1;
      sum += numericRating;
    }
  });

  const averageRating = total > 0 ? +(sum / total).toFixed(1) : 0;

  // Additional filter for user queries
  if (rating) {
    matchingReviews = matchingReviews.filter((r) => r.rating === Number(rating));
  }

  if (hasMedia) {
    matchingReviews = matchingReviews.filter((r) => r.media && r.media.length > 0);
  }

  // Sort
  if (sort === "highest") {
    matchingReviews.sort((a, b) => b.rating - a.rating);
  } else if (sort === "lowest") {
    matchingReviews.sort((a, b) => a.rating - b.rating);
  } else if (sort === "helpful") {
    matchingReviews.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
  } else {
    matchingReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  let reviews = matchingReviews.map((r) => ({
    ...r,
    id: r.id || r._id?.toString(),
    media: (r.media || []).map((m) => ({ ...m, id: m.id || m._id?.toString() })),
    replies: (r.replies || []).map((rep) => ({ ...rep, id: rep.id || rep._id?.toString() })),
  }));

  if (limit && Number(limit) > 0) {
    reviews = reviews.slice(0, Number(limit));
  }

  const settings = await getShopSettings(shop);
  const photoUploadsEnabled = settings.plan !== "FREE";

  return {
    reviews,
    stats: {
      total,
      averageRating,
      distribution,
      photoUploadsEnabled,
      plan: settings.plan,
    },
    settings: {
      primaryColor: settings.primaryColor,
      badgeColor: settings.badgeColor,
      widgetSettings: settings.widgetSettings || {},
    },
  };
}

/**
 * Create a new review into the shop's single document
 */
export async function createReview({
  shop,
  productId,
  productTitle,
  productHandle,
  orderId,
  rating,
  title,
  body,
  authorName,
  authorEmail,
  mediaUrls = [],
  verified = false,
}) {
  await connectDB();
  const settings = await getShopSettings(shop);

  // Simple profanity & spam check
  const spamKeywords = ["viagra", "casino", "free crypto", "buy followers", "loan instantly"];
  const lowerBody = (body || "").toLowerCase();
  const isSpam = spamKeywords.some((w) => lowerBody.includes(w));

  let status = "PENDING";
  let riskScore = 0.0;

  if (isSpam) {
    status = "FLAGGED";
    riskScore = 0.95;
  } else if (settings.autoPublish && rating >= settings.minAutoPublishRating) {
    status = "PUBLISHED";
  }

  let sentiment = "NEUTRAL";
  if (rating >= 4) sentiment = "POSITIVE";
  else if (rating <= 2) sentiment = "NEGATIVE";

  // Process and upload any base64 media to Cloudinary if configured
  const media = [];
  for (const m of mediaUrls) {
    if (!m.url) continue;
    let finalUrl = m.url;
    let mediaType = m.type || (m.url.startsWith("data:video/") ? "VIDEO" : "PHOTO");

    // If it's a base64 data URI, upload to Cloudinary
    if (m.url.startsWith("data:")) {
      try {
        const cleanShop = (shop || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
        const uploadResult = await uploadToCloudinary(m.url, {
          resource_type: mediaType === "VIDEO" ? "video" : "image",
          folder: `reviora/${cleanShop}/reviews`,
        });
        console.log("Cloudinary upload success:", uploadResult.url);
        finalUrl = uploadResult.url;
        mediaType = uploadResult.resourceType === "video" ? "VIDEO" : "PHOTO";
      } catch (err) {
        console.error("Cloudinary upload failed, falling back to original URL:", err);
      }
    }

    media.push({
      mediaType,
      url: finalUrl,
      thumbnailUrl: m.thumbnailUrl || finalUrl,
    });
  }

  // Verify if reviewer is an existing customer by email
  let isVerified = Boolean(verified);
  if (!isVerified && authorEmail) {
    isVerified = await verifyCustomerByEmail(shop, authorEmail);
  }

  const newReviewData = {
    productId: String(productId),
    productTitle,
    productHandle,
    orderId,
    rating: Number(rating),
    title,
    body,
    authorName,
    authorEmail,
    verified: isVerified,
    status,
    sentiment,
    riskScore,
    media,
    replies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const updatedDoc = await StoreReviews.findOneAndUpdate(
    { shop },
    { $push: { reviews: newReviewData } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const createdReview = updatedDoc.reviews[updatedDoc.reviews.length - 1];
  const obj = createdReview.toObject ? createdReview.toObject({ virtuals: true }) : createdReview;
  return {
    ...obj,
    id: obj.id || obj._id.toString(),
  };
}



/**
 * Delete a specific review from the shop's review collection
 * @param {string} shop
 * @param {string} reviewId
 */
export async function deleteReview(shop, reviewId) {
  await connectDB();
  const res = await StoreReviews.updateOne(
    { shop },
    { $pull: { reviews: { _id: reviewId } } }
  );
  return { success: res.modifiedCount > 0 };
}

/**
 * Export all reviews for a shop formatted as standard CSV
 * @param {string} shop
 */
export async function exportReviewsToCsv(shop) {
  await connectDB();
  const storeDoc = await StoreReviews.findOne({ shop }).lean();
  const reviews = storeDoc?.reviews || [];

  const headers = ["title", "body", "rating", "review_date", "reviewer_name", "reviewer_email", "product_handle", "status", "verified"];
  const rows = reviews.map((r) => {
    let dateStr = "";
    if (r.createdAt) {
      try {
        const d = new Date(r.createdAt);
        dateStr = isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
      } catch {
        dateStr = "";
      }
    }
    if (!dateStr) {
      dateStr = new Date().toISOString().split("T")[0];
    }

    return [
      `"${(r.title || "").replace(/"/g, '""')}"`,
      `"${(r.body || "").replace(/"/g, '""')}"`,
      r.rating || 5,
      `"${dateStr}"`,
      `"${(r.authorName || "").replace(/"/g, '""')}"`,
      `"${(r.authorEmail || "").replace(/"/g, '""')}"`,
      `"${(r.productHandle || r.productId || "").replace(/"/g, '""')}"`,
      `"${r.status || "PUBLISHED"}"`,
      r.verified ? "true" : "false",
    ];
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}


