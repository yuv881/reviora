import { Star } from "lucide-react";

/**
 * Reusable StarRating component using Lucide icons
 */
export function StarRating({ rating = 5, size = 16, showNumber = false }) {
  const fullStars = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= fullStars ? "#FFB800" : "#E5E7EB"}
          color={i <= fullStars ? "#FFB800" : "#D1D5DB"}
          strokeWidth={1.5}
        />
      ))}
      {showNumber && (
        <span style={{ fontSize: "13px", fontWeight: "600", marginLeft: "4px", color: "#202223" }}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
