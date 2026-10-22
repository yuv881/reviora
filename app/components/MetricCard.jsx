/**
 * Reusable Metric KPI Card built following Google Stitch & Shopify Polaris spacing tokens
 */
export function MetricCard({ label, value, subtext, icon: Icon, tone = "default" }) {
  return (
    <div className="reviora-card" style={{ marginBottom: 0, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "12px", color: "#6D7175", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {label}
        </span>
        {Icon && (
          <div style={{ padding: "6px", borderRadius: "6px", backgroundColor: "#F6F6F7", display: "flex", alignItems: "center" }}>
            <Icon size={18} color="#008060" />
          </div>
        )}
      </div>

      <div style={{ fontSize: "28px", fontWeight: "700", color: "#202223", lineHeight: "1.1", marginBottom: "8px" }}>
        {value}
      </div>

      {subtext && (
        <div style={{ fontSize: "12px", color: tone === "warning" ? "#916A00" : tone === "success" ? "#108043" : "#6D7175" }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
