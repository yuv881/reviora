import { InlineStack, Text } from "@shopify/polaris";
import { Star } from "lucide-react";

/**
 * StarRating component using Polaris InlineStack and Text
 */
export function StarRating({ rating = 5, size = 16, showNumber = false }) {
  const fullStars = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <InlineStack gap="050" blockAlign="center">
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
        <Text as="span" variant="bodySm" fontWeight="semibold">
          {rating.toFixed(1)}
        </Text>
      )}
    </InlineStack>
  );
}
