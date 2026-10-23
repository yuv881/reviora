import { useState } from "react";
import {
  Popover,
  ColorPicker,
  TextField,
  Box,
  InlineStack,
  BlockStack,
  Text,
  hsbToHex,
  rgbToHsb,
  hexToRgb,
} from "@shopify/polaris";

function safeHexToHsb(hex, fallback = { hue: 43.3, saturation: 1, brightness: 1 }) {
  try {
    const formatted = hex && hex.startsWith("#") ? hex : `#${hex || "000000"}`;
    if (!/^#[0-9A-Fa-f]{6}$/i.test(formatted)) return fallback;
    const rgb = hexToRgb(formatted);
    if (isNaN(rgb.red) || isNaN(rgb.green) || isNaN(rgb.blue)) return fallback;
    return rgbToHsb(rgb);
  } catch {
    return fallback;
  }
}

/**
 * Interactive Polaris ColorPicker with Popover swatch, manual Hex input, and optional presets
 */
export function ColorPickerField({ label, value, onChange, presets = [] }) {
  const [popoverActive, setPopoverActive] = useState(false);
  const currentHex = value || "#000000";
  const hsb = safeHexToHsb(currentHex);

  const handleColorChange = (newHsb) => {
    const hex = hsbToHex(newHsb);
    onChange(hex);
  };

  const activator = (
    <button
      type="button"
      onClick={() => setPopoverActive((active) => !active)}
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "8px",
        backgroundColor: currentHex,
        border: "1px solid rgba(0, 0, 0, 0.15)",
        cursor: "pointer",
        padding: 0,
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        flexShrink: 0,
      }}
      aria-label={`Open color picker for ${label}`}
    />
  );

  return (
    <BlockStack gap="150">
      <Text as="label" variant="bodyMd" fontWeight="medium">
        {label}
      </Text>

      <InlineStack gap="200" blockAlign="center">
        <Popover
          active={popoverActive}
          activator={activator}
          onClose={() => setPopoverActive(false)}
        >
          <Popover.Pane>
            <Box padding="300">
              <BlockStack gap="300">
                <ColorPicker
                  onChange={handleColorChange}
                  color={hsb}
                  allowAlpha={false}
                />
                {presets.length > 0 && (
                  <BlockStack gap="150">
                    <Text as="span" variant="bodyXs" tone="subdued">
                      Popular Presets
                    </Text>
                    <InlineStack gap="150">
                      {presets.map((presetHex) => (
                        <button
                          key={presetHex}
                          type="button"
                          onClick={() => onChange(presetHex)}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: presetHex,
                            border:
                              currentHex.toLowerCase() === presetHex.toLowerCase()
                                ? "2px solid #000"
                                : "1px solid rgba(0,0,0,0.2)",
                            cursor: "pointer",
                            padding: 0,
                          }}
                          title={presetHex}
                        />
                      ))}
                    </InlineStack>
                  </BlockStack>
                )}
              </BlockStack>
            </Box>
          </Popover.Pane>
        </Popover>

        <Box minWidth="140px">
          <TextField
            label={label}
            labelHidden
            value={currentHex}
            onChange={(val) => {
              const formatted = val.startsWith("#") ? val : `#${val}`;
              onChange(formatted);
            }}
            autoComplete="off"
            placeholder="#000000"
          />
        </Box>
      </InlineStack>
    </BlockStack>
  );
}
