import { getStorefrontReviews, createReview, deleteReview } from "../models/review.server.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Handle preflight OPTIONS requests for storefront widgets
 */
export const options = () => {
  return new Response(null, { headers: CORS_HEADERS });
};

/**
 * GET /api/reviews?shop=...&productId=...&sort=...&rating=...
 */
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const productId = url.searchParams.get("productId");
  const sort = url.searchParams.get("sort") || "newest";
  const rating = url.searchParams.get("rating");
  const hasMedia = url.searchParams.get("hasMedia") === "true";

  if (!shop || !productId) {
    return Response.json(
      { error: "shop and productId query parameters are required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const data = await getStorefrontReviews(shop, productId, { sort, rating, hasMedia });
    return Response.json(data, { headers: CORS_HEADERS });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
};

/**
 * POST /api/reviews - Customer review submission
 * DELETE /api/reviews - Review deletion
 */
export const action = async ({ request }) => {
  if (request.method === "DELETE") {
    try {
      const payload = await request.json();
      const { shop, reviewId } = payload;
      if (!shop || !reviewId) {
        return Response.json({ error: "shop and reviewId are required" }, { status: 400, headers: CORS_HEADERS });
      }
      const result = await deleteReview(shop, reviewId);
      return Response.json(result, { headers: CORS_HEADERS });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: CORS_HEADERS });
    }
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  try {
    const payload = await request.json();
    const { shop, productId, productTitle, rating, title, body, authorName, authorEmail, mediaUrls } = payload;

    if (!shop || !productId || !rating || !body || !authorName || !authorEmail) {
      return Response.json({ error: "Missing required fields" }, { status: 400, headers: CORS_HEADERS });
    }

    const review = await createReview({
      shop,
      productId,
      productTitle,
      rating: Number(rating),
      title,
      body,
      authorName,
      authorEmail,
      mediaUrls: mediaUrls || [],
      verified: false,
    });

    return Response.json({ success: true, review }, { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
};
