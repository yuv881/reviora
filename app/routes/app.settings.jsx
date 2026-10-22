import { Form, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server.js";
import { getShopSettings, updateShopSettings } from "../models/review.server.js";
import { Shield, Palette, Clock, Save } from "lucide-react";

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
  const { settings } = useLoaderData();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  return (
    <div className="reviora-page-wrapper">
      <TitleBar title="Settings" />

      <Form method="POST">
        {/* Moderation Rules Card */}
        <div className="reviora-card">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Shield size={16} color="#008060" />
            <h2 style={{ fontSize: "15px", fontWeight: "600", margin: 0, color: "#202223" }}>
              Auto-Moderation Rules
            </h2>
          </div>
          <p style={{ fontSize: "13px", color: "#6D7175", margin: "0 0 16px 0" }}>
            Control which customer reviews are published to your storefront automatically.
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
              <input
                type="checkbox"
                name="autoPublish"
                value="true"
                defaultChecked={settings.autoPublish}
                style={{ width: "16px", height: "16px", accentColor: "#008060" }}
              />
              Automatically publish approved reviews
            </label>
          </div>

          <div>
            <label htmlFor="minAutoPublishRating" style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
              Minimum Star Rating to Auto-Publish
            </label>
            <select
              id="minAutoPublishRating"
              name="minAutoPublishRating"
              defaultValue={settings.minAutoPublishRating}
              className="reviora-select"
              style={{ maxWidth: "240px" }}
            >
              <option value="5">5 Stars only</option>
              <option value="4">4 Stars and above</option>
              <option value="3">3 Stars and above</option>
              <option value="1">All reviews (1-5 Stars)</option>
            </select>
          </div>
        </div>

        {/* Branding & Widget Colors Card */}
        <div className="reviora-card">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Palette size={16} color="#008060" />
            <h2 style={{ fontSize: "15px", fontWeight: "600", margin: 0, color: "#202223" }}>
              Widget Appearance &amp; Brand Colors
            </h2>
          </div>
          <p style={{ fontSize: "13px", color: "#6D7175", margin: "0 0 16px 0" }}>
            Customize star accents and verified customer badge colors to match your theme.
          </p>

          <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
            <div>
              <label htmlFor="primaryColor" style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                Star Rating Color
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  id="primaryColor"
                  type="color"
                  name="primaryColor"
                  defaultValue={settings.primaryColor}
                  style={{ width: "48px", height: "36px", border: "1px solid #C9CCCF", borderRadius: "4px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "13px", color: "#6D7175" }}>{settings.primaryColor}</span>
              </div>
            </div>

            <div>
              <label htmlFor="badgeColor" style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                Verified Buyer Badge Color
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  id="badgeColor"
                  type="color"
                  name="badgeColor"
                  defaultValue={settings.badgeColor}
                  style={{ width: "48px", height: "36px", border: "1px solid #C9CCCF", borderRadius: "4px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "13px", color: "#6D7175" }}>{settings.badgeColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Automation Timing Card */}
        <div className="reviora-card">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Clock size={16} color="#008060" />
            <h2 style={{ fontSize: "15px", fontWeight: "600", margin: 0, color: "#202223" }}>
              Automated Request Timing
            </h2>
          </div>
          <p style={{ fontSize: "13px", color: "#6D7175", margin: "0 0 16px 0" }}>
            Timing and content for automated review invitation emails.
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="requestTimingDays" style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
              Send Invitation After Fulfillment (Days)
            </label>
            <input
              id="requestTimingDays"
              type="number"
              name="requestTimingDays"
              defaultValue={settings.requestTimingDays}
              min="1"
              max="60"
              className="reviora-input"
              style={{ maxWidth: "160px" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="emailSubject" style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
              Invitation Email Subject
            </label>
            <input
              id="emailSubject"
              type="text"
              name="emailSubject"
              defaultValue={settings.emailSubject}
              className="reviora-input"
            />
          </div>

          <div>
            <label htmlFor="emailBody" style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
              Invitation Email Message
            </label>
            <textarea
              id="emailBody"
              name="emailBody"
              rows="3"
              defaultValue={settings.emailBody}
              className="reviora-textarea"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="reviora-btn reviora-btn-primary"
            disabled={isSaving}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Save size={14} />
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </Form>
    </div>
  );
}

export function ErrorBoundary() {
  return boundary.error();
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
