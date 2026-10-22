/**
 * RatingBreakdown component built following Google Stitch card & bar specs
 */
export function RatingBreakdown({ distribution, total = 0, averageRating = 0 }) {
  const safeTotal = total > 0 ? total : 1;

  return (
    <div className="reviora-card" style={{ marginBottom: 0, padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "600", margin: 0, color: "#202223" }}>
          Rating Distribution
        </h2>
        <span className="reviora-badge-pill reviora-badge-info">
          {total} Total Reviews
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = distribution[stars] || 0;
          const pct = Math.round((count / safeTotal) * 100);

          return (
            <div key={stars} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
              <span style={{ width: "50px", color: "#202223", fontWeight: "500" }}>{stars} Stars</span>
              <div
                style={{
                  flex: 1,
                  backgroundColor: "#F1F2F4",
                  height: "8px",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    backgroundColor: "#008060",
                    height: "100%",
                    borderRadius: "4px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <span style={{ width: "35px", textAlign: "right", color: "#6D7175", fontWeight: "500" }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
