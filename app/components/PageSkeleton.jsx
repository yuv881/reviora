export function PageSkeleton() {
  return (
    <div className="reviora-page-wrapper" aria-busy="true" aria-label="Loading page">
      {/* Top Header Skeleton */}
      <div style={{ marginBottom: "24px" }}>
        <div
          className="reviora-skeleton-pulse"
          style={{ width: "220px", height: "26px", borderRadius: "6px", marginBottom: "8px" }}
        />
        <div
          className="reviora-skeleton-pulse"
          style={{ width: "380px", height: "16px", borderRadius: "4px" }}
        />
      </div>

      {/* Top Cards Grid Skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="reviora-card"
            style={{ padding: "20px", margin: 0, minHeight: "100px" }}
          >
            <div
              className="reviora-skeleton-pulse"
              style={{ width: "90px", height: "14px", borderRadius: "4px", marginBottom: "12px" }}
            />
            <div
              className="reviora-skeleton-pulse"
              style={{ width: "60px", height: "28px", borderRadius: "6px" }}
            />
          </div>
        ))}
      </div>

      {/* Main Content Card Skeleton */}
      <div className="reviora-card" style={{ padding: "24px" }}>
        <div
          className="reviora-skeleton-pulse"
          style={{ width: "160px", height: "18px", borderRadius: "4px", marginBottom: "20px" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "16px",
                padding: "16px",
                border: "1px solid #F1F2F3",
                borderRadius: "8px",
              }}
            >
              <div
                className="reviora-skeleton-pulse"
                style={{ width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div
                  className="reviora-skeleton-pulse"
                  style={{ width: "30%", height: "16px", borderRadius: "4px", marginBottom: "8px" }}
                />
                <div
                  className="reviora-skeleton-pulse"
                  style={{ width: "85%", height: "14px", borderRadius: "4px", marginBottom: "6px" }}
                />
                <div
                  className="reviora-skeleton-pulse"
                  style={{ width: "60%", height: "14px", borderRadius: "4px" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
