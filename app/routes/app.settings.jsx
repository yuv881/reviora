import { useState } from "react";
import { useLoaderData, useNavigation, useSubmit, useActionData } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  InlineGrid,
  Checkbox,
  Select,
  TextField,
  Banner,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";
import { getShopSettings, updateShopSettings } from "../models/review.server.js";
import { ColorPickerField } from "../components/ColorPickerField.jsx";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);
  return { settings };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const autoPublish = formData.get("autoPublish") === "true";
  const minAutoPublishRating = Number(formData.get("minAutoPublishRating") || 4);
  const primaryColor = formData.get("primaryColor") || "#FFB800";
  const badgeColor = formData.get("badgeColor") || "#10B981";
  const requestTimingDays = Number(formData.get("requestTimingDays") || 7);
  const emailSubject = formData.get("emailSubject") || "How did you like your purchase?";
  const emailBody = formData.get("emailBody") || "Thank you for your order!";
  const enableAiFeatures = formData.get("enableAiFeatures") === "true";

  await updateShopSettings(session.shop, {
    autoPublish,
    minAutoPublishRating,
    primaryColor,
    badgeColor,
    requestTimingDays,
    emailSubject,
    emailBody,
    enableAiFeatures,
  });

  return { success: true };
};

export default function SettingsPage() {
  const loaderData = useLoaderData();
  const settings = loaderData?.settings || {};
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [autoPublish, setAutoPublish] = useState(Boolean(settings.autoPublish));
  const [minRating, setMinRating] = useState(String(settings.minAutoPublishRating || 4));
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || "#FFB800");
  const [badgeColor, setBadgeColor] = useState(settings.badgeColor || "#10B981");
  const [timingDays, setTimingDays] = useState(String(settings.requestTimingDays || 7));
  const [emailSubject, setEmailSubject] = useState(settings.emailSubject || "How did you like your purchase?");
  const [emailBody, setEmailBody] = useState(settings.emailBody || "Thank you for your order!");

  const isSaving = navigation.state === "submitting";

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    submit(
      {
        autoPublish: String(autoPublish),
        minAutoPublishRating: minRating,
        primaryColor,
        badgeColor,
        requestTimingDays: timingDays,
        emailSubject,
        emailBody,
        enableAiFeatures: String(settings.enableAiFeatures || false),
      },
      { method: "POST" }
    );
  };

  const minRatingOptions = [
    { label: "5 Stars only", value: "5" },
    { label: "4 Stars and above", value: "4" },
    { label: "3 Stars and above", value: "3" },
    { label: "All reviews (1-5 Stars)", value: "1" },
  ];

  return (
    <Page>
      <ui-title-bar title="Settings" >
        <button variant="primary" onClick={handleSave}> {isSaving ? "Saving..." : "Save Settings"}</button>
      </ui-title-bar>
      <BlockStack gap="500">
        {actionData?.success && (
          <Banner tone="success" title="Settings saved" onDismiss={() => { }}>
            <p>Your review preferences and widget styling have been successfully updated.</p>
          </Banner>
        )}

        {/* Moderation Rules Section */}
        <Card>
          <BlockStack gap="400">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">Auto-Moderation Rules</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Control which customer reviews are published to your storefront automatically.
              </Text>
            </BlockStack>

            <Checkbox
              label="Automatically publish approved reviews"
              checked={autoPublish}
              onChange={setAutoPublish}
            />

            <Select
              label="Minimum Star Rating to Auto-Publish"
              options={minRatingOptions}
              value={minRating}
              onChange={setMinRating}
              disabled={!autoPublish}
            />
          </BlockStack>
        </Card>

        {/* Branding & Widget Colors Section */}
        <Card>
          <BlockStack gap="400">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">Widget Appearance &amp; Brand Colors</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Customize star accents and verified customer badge colors to match your theme.
              </Text>
            </BlockStack>

            <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
              <ColorPickerField
                label="Star Rating Color"
                value={primaryColor}
                onChange={setPrimaryColor}
                presets={["#FFB800", "#F59E0B", "#F97316", "#EF4444", "#0D9488", "#1E293B"]}
              />

              <ColorPickerField
                label="Verified Buyer Badge Color"
                value={badgeColor}
                onChange={setBadgeColor}
                presets={["#10B981", "#008060", "#2563EB", "#4F46E5", "#7C3AED", "#1E293B"]}
              />
            </InlineGrid>
          </BlockStack>
        </Card>

        {/* Automation Timing Section */}
        <Card>
          <BlockStack gap="400">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">Automated Request Timing</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Timing and content for automated review invitation emails.
              </Text>
            </BlockStack>

            <TextField
              label="Send Invitation After Fulfillment (Days)"
              type="number"
              min={1}
              max={60}
              value={timingDays}
              onChange={setTimingDays}
              autoComplete="off"
            />

            <TextField
              label="Invitation Email Subject"
              value={emailSubject}
              onChange={setEmailSubject}
              autoComplete="off"
            />

            <TextField
              label="Invitation Email Message"
              multiline={3}
              value={emailBody}
              onChange={setEmailBody}
              autoComplete="off"
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}


