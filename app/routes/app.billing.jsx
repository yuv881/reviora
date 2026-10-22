import { CheckCircle2, Zap } from "lucide-react";
import { TitleBar } from "@shopify/app-bridge-react";

export default function BillingPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Essential review collection for new stores starting out.",
      features: [
        "Up to 50 review requests/month",
        "Star rating & review widget",
        "Basic auto-moderation rules",
        "Community support",
      ],
      current: true,
      buttonText: "Current Plan",
      buttonVariant: "secondary",
    },
    {
      name: "Growth",
      price: "$4.99",
      period: "per month",
      description: "For growing brands wanting unlimited collection and photo reviews.",
      features: [
        "Unlimited email review requests",
        "Customer photo uploads",
        "Google Shopping rich snippet feed",
        "1-click Judge.me & Okendo import",
        "Priority email support",
      ],
      current: false,
      popular: true,
      buttonText: "Upgrade to Growth",
      buttonVariant: "primary",
    }
  ];

  return (
    <div className="reviora-page-wrapper">
      <TitleBar title="Subscription & Plans" />

      {/* Subtitle Header */}
      <div style={{ marginBottom: "28px", maxWidth: "980px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 6px 0", color: "#202223" }}>
          Choose the right plan for your business
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#6D7175" }}>
          Transparent pricing designed to scale with your store without caps on organic reviews.
        </p>
      </div>

      {/* 3-Column Pricing Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          alignItems: "stretch",
          maxWidth: "1080px",
        }}
      >
        {plans.map((p) => (
          <div
            key={p.name}
            className="reviora-card"
            style={{
              position: "relative",
              border: p.popular ? "2px solid #008060" : "1px solid #E1E3E5",
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "32px 24px 24px",
              boxShadow: p.popular
                ? "0 4px 16px rgba(0, 128, 96, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05)"
                : "0 1px 3px rgba(0, 0, 0, 0.05)",
              marginBottom: 0,
            }}
          >
            {p.popular && (
              <span
                className="reviora-badge-pill reviora-badge-success"
                style={{
                  position: "absolute",
                  top: "-12px",
                  right: "20px",
                  fontSize: "11px",
                  padding: "3px 10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                }}
              >
                <Zap size={11} /> Most Popular
              </span>
            )}

            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 6px 0", color: "#202223" }}>
                {p.name}
              </h3>
              <p style={{ fontSize: "13px", color: "#6D7175", margin: "0 0 20px 0", minHeight: "36px" }}>
                {p.description}
              </p>

              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "24px" }}>
                <span style={{ fontSize: "36px", fontWeight: "700", color: "#202223", letterSpacing: "-0.5px" }}>
                  {p.price}
                </span>
                <span style={{ fontSize: "13px", color: "#6D7175" }}>
                  / {p.period}
                </span>
              </div>

              <div style={{ borderTop: "1px solid #E1E3E5", paddingTop: "20px", marginBottom: "28px" }}>
                <div style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", color: "#6D7175", marginBottom: "14px" }}>
                  Included Features
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {p.features.map((f, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: "#202223" }}>
                      <CheckCircle2 size={16} color="#008060" style={{ flexShrink: 0, marginTop: "1px" }} />
                      <span style={{ lineHeight: "1.4" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ paddingTop: "16px", borderTop: "1px solid #F6F6F7" }}>
              <button
                type="button"
                className={`reviora-btn ${p.buttonVariant === "primary" ? "reviora-btn-primary" : "reviora-btn-secondary"}`}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "10px 16px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
                disabled={p.current}
              >
                {p.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
