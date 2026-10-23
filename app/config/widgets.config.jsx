/**
 * Reviora Storefront Widgets Configuration
 * 
 * To add a new widget:
 * Simply add a new object to the `widgetsConfig` array below.
 * It will automatically render on the Widgets page with Install and Customize support.
 */

export const widgetsConfig = [
  {
    id: "review_widget",
    title: "Review Widget",
    description: "Collect and display product reviews on your product pages.",
    badge: null,
    badgeTone: "success",
    hasInstall: true,
    blockName: "Reviora Reviews Widget",
    template: "product",
    snippet: (shop) =>
      `<reviora-reviews-widget data-shop="${shop}" data-product-id="{{ product.id }}"></reviora-reviews-widget>`,
    preview: {
      gradient: "linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 50%, #bbf7d0 100%)",
      accentColor: "#10b981",
      icon: "💬",
      render: () => (
        <div
          style={{
            width: "92%",
            background: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            padding: "10px 14px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ textAlign: "center", fontSize: "11px", fontWeight: "700", color: "#374151", marginBottom: "8px" }}>
            Customer Reviews
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <div style={{ color: "#10b981", fontSize: "11px", letterSpacing: "1px" }}>★★★★★</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ height: "3px", background: "#10b981", borderRadius: "2px", width: "85%" }} />
              <div style={{ height: "3px", background: "#34d399", borderRadius: "2px", width: "55%" }} />
              <div style={{ height: "3px", background: "#cbd5e1", borderRadius: "2px", width: "20%" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ height: "9px", width: "36px", borderRadius: "10px", background: "#1e293b" }} />
              <div style={{ height: "9px", width: "36px", borderRadius: "10px", border: "1px solid #cbd5e1" }} />
            </div>
          </div>
          <div style={{ height: "1px", background: "#f1f5f9", margin: "8px 0" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "#f59e0b", opacity: 0.85 }} />
              <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "#3b82f6", opacity: 0.85 }} />
              <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "#ec4899", opacity: 0.85 }} />
              <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "#8b5cf6", opacity: 0.85 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <span style={{ fontSize: "12px" }}>🛡️</span>
              <span style={{ fontSize: "9px", color: "#059669", fontWeight: "600" }}>Verified</span>
            </div>
          </div>
        </div>
      ),
    },
  },
  {
    id: "star_rating",
    title: "Star Rating Badge",
    description: "Show the average rating of your products and how many reviews they've received.",
    badge: null,
    badgeTone: "info",
    hasInstall: true,
    blockName: "Star Rating Badge",
    template: "product",
    snippet: () =>
      `{% render 'stars', rating: product.metafields.reviora.avg_rating.value | default: 5 %}`,
    preview: {
      gradient: "linear-gradient(135deg, #7dd3fc 0%, #38bdf8 50%, #93c5fd 100%)",
      accentColor: "#0284c7",
      icon: "⭐",
      render: () => (
        <div
          style={{
            width: "88%",
            background: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            padding: "16px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "2px", width: "45%", marginBottom: "6px" }} />
          <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "2px", width: "25%", marginBottom: "12px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ color: "#0f172a", fontSize: "16px", letterSpacing: "2px" }}>★★★★★</span>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>4.8</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ height: "14px", flex: 1, background: "#86efac", borderRadius: "10px" }} />
            <div style={{ height: "14px", flex: 1, border: "1px solid #cbd5e1", borderRadius: "10px" }} />
          </div>
        </div>
      ),
    },
  },
  {
    id: "write_review",
    title: "Write a Review",
    description: "A pre-installed widget to help your customers write reviews.",
    badge: "Installed",
    badgeTone: "success",
    hasInstall: false,
    blockName: "Write a Review Form",
    template: "product",
    snippet: () =>
      `<reviora-write-review-button product-id="{{ product.id }}"></reviora-write-review-button>`,
    preview: {
      gradient: "linear-gradient(135deg, #bbf7d0 0%, #86efac 50%, #a7f3d0 100%)",
      accentColor: "#10b981",
      icon: "✍️",
      render: () => (
        <div
          style={{
            width: "82%",
            background: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            padding: "12px 14px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
            Write a review
          </div>
          <div style={{ color: "#64748b", fontSize: "16px", letterSpacing: "3px", marginBottom: "8px" }}>
            ☆☆☆☆☆
          </div>
          <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", marginBottom: "6px" }} />
          <div style={{ width: "100%", height: "18px", border: "1px solid #e2e8f0", borderRadius: "4px", marginBottom: "8px" }} />
          <div
            style={{
              background: "#86efac",
              color: "#065f46",
              fontSize: "10px",
              fontWeight: "600",
              padding: "3px 12px",
              borderRadius: "12px",
            }}
          >
            Submit review
          </div>
        </div>
      ),
    },
  },
  {
    id: "cards_carousel",
    title: "Cards Carousel",
    description: "Showcase reviews in a carousel on a page of your choice. Flexible styling in the Shopify Theme Editor.",
    badge: null,
    badgeTone: "info",
    hasInstall: true,
    blockName: "Reviora Cards Carousel",
    template: "index",
    snippet: () => `<reviora-reviews-carousel type="cards"></reviora-reviews-carousel>`,
    preview: {
      gradient: "linear-gradient(135deg, #86efac 0%, #4ade80 50%, #86efac 100%)",
      accentColor: "#059669",
      icon: "🎴",
      render: () => (
        <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "4px", padding: "0 4px" }}>
          <span style={{ fontSize: "14px", color: "#065f46", fontWeight: "bold" }}>‹</span>
          <div style={{ display: "flex", gap: "6px", flex: 1, justifyContent: "center" }}>
            {[
              { color: "#f87171", name: "Barbara S." },
              { color: "#fbbf24", name: "Barbara S." },
              { color: "#fb923c", name: "Barbara S." },
              { color: "#e2e8f0", name: "Barbara S." },
            ].map((card, idx) => (
              <div
                key={idx}
                style={{
                  width: "48px",
                  background: "#fff",
                  borderRadius: "6px",
                  padding: "4px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ height: "40px", background: card.color, borderRadius: "4px", marginBottom: "3px" }} />
                <div style={{ fontSize: "7px", color: "#0f766e" }}>★★★★</div>
                <div style={{ fontSize: "6px", color: "#64748b" }}>{card.name}</div>
              </div>
            ))}
          </div>
          <span style={{ fontSize: "14px", color: "#065f46", fontWeight: "bold" }}>›</span>
        </div>
      ),
    },
  },
  {
    id: "testimonials_carousel",
    title: "Testimonials Carousel",
    description: "Display customer quotes to build trust and social proof. Flexible styling in the Shopify Theme Editor.",
    badge: null,
    badgeTone: "info",
    hasInstall: true,
    blockName: "Reviora Testimonials Carousel",
    template: "index",
    snippet: () => `<reviora-reviews-carousel type="testimonials"></reviora-reviews-carousel>`,
    preview: {
      gradient: "linear-gradient(135deg, #6ee7b7 0%, #34d399 50%, #6ee7b7 100%)",
      accentColor: "#0d9488",
      icon: "💬",
      render: () => (
        <div
          style={{
            width: "88%",
            background: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            padding: "14px 16px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "28px", lineHeight: "18px", color: "#0f172a", fontWeight: "bold", fontFamily: "serif", marginBottom: "8px" }}>
            ”
          </div>
          <div style={{ width: "90%", height: "4px", background: "#e2e8f0", borderRadius: "2px", marginBottom: "4px" }} />
          <div style={{ width: "75%", height: "4px", background: "#e2e8f0", borderRadius: "2px", marginBottom: "4px" }} />
          <div style={{ width: "50%", height: "4px", background: "#f1f5f9", borderRadius: "2px", marginBottom: "8px" }} />
          <div style={{ color: "#38bdf8", fontSize: "13px", letterSpacing: "2px" }}>
            ★★★★★
          </div>
        </div>
      ),
    },
  },
  {
    id: "videos_carousel",
    title: "Videos Carousel",
    description: "Showcase customer video reviews in a dynamic widget. Flexible styling in the Shopify Theme Editor.",
    badge: null,
    badgeTone: "info",
    hasInstall: true,
    blockName: "Reviora Video Reels Widget",
    template: "index",
    snippet: () => `<reviora-reviews-carousel type="videos"></reviora-reviews-carousel>`,
    preview: {
      gradient: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #93c5fd 100%)",
      accentColor: "#2563eb",
      icon: "🎥",
      render: () => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
          <div style={{ width: "36px", height: "68px", background: "#1e3a8a", opacity: 0.8, borderRadius: "6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#93c5fd", fontSize: "10px" }}>▶</span>
            <div style={{ color: "#fbbf24", fontSize: "6px", marginTop: "10px" }}>★★★★★</div>
          </div>
          <div style={{ width: "58px", height: "90px", background: "#1e293b", borderRadius: "8px", overflow: "hidden", position: "relative", boxShadow: "0 6px 14px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(180deg, #f43f5e 0%, #881337 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "10px" }}>
                ▶
              </div>
              <div style={{ color: "#fbbf24", fontSize: "8px", position: "absolute", bottom: "6px" }}>★★★★★</div>
            </div>
          </div>
          <div style={{ width: "36px", height: "68px", background: "#1e3a8a", opacity: 0.8, borderRadius: "6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#93c5fd", fontSize: "10px" }}>▶</span>
            <div style={{ color: "#fbbf24", fontSize: "6px", marginTop: "10px" }}>★★★★★</div>
          </div>
        </div>
      ),
    },
  },
];
