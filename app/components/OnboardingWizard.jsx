import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import {
  Check,
  Star,
  Camera,
  LayoutGrid,
  Bot,
  Download,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export function OnboardingWizard({
  shop,
  apiKey,
  defaultThemeId = "current",
  onComplete,
  initialStep = 1,
  hasActivePayment = false,
  currentPlan = "FREE",
}) {
  const [currentStep, setCurrentStep] = useState(() => {
    if (initialStep && initialStep > 1) return initialStep;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`reviora_onboarding_step_${shop}`);
        const parsed = parseInt(saved, 10);
        if (parsed >= 1 && parsed <= 5) return parsed;
      } catch (e) {
        // ignore
      }
    }
    return 1;
  });

  const [selectedColor, setSelectedColor] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`reviora_selected_color_${shop}`);
        if (saved) return saved;
      } catch (e) {
        // ignore
      }
    }
    return "#FFB800";
  });

  const [selectedPlan, setSelectedPlan] = useState(() => {
    if (hasActivePayment) return "PRO";
    if (currentPlan && currentPlan !== "FREE") return currentPlan;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`reviora_selected_plan_${shop}`);
        if (saved) return saved;
      } catch (e) {
        // ignore
      }
    }
    return null;
  });

  const [subscribeError, setSubscribeError] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [themeVerified, setThemeVerified] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`reviora_theme_verified_${shop}`);
        if (saved === "true") return true;
      } catch (e) {
        // 
      }
    }
    return false;
  });
  const [themeName, setThemeName] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(`reviora_theme_name_${shop}`) || "";
      } catch (e) {
        // 
      }
    }
    return "";
  });

  const totalSteps = 5;

  const billingFetcher = useFetcher();
  const themeFetcher = useFetcher();
  const stepFetcher = useFetcher();

  const changeStep = (nextStep) => {
    setCurrentStep(nextStep);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`reviora_onboarding_step_${shop}`, String(nextStep));
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set("step", String(nextStep));
        window.history.replaceState({}, "", currentUrl.toString());
      } catch (e) {
        // ignore
      }
    }
    stepFetcher.submit(
      {
        actionType: "saveOnboardingStep",
        step: String(nextStep),
        plan: selectedPlan || "FREE",
        primaryColor: selectedColor,
      },
      { method: "POST" }
    );
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`reviora_selected_plan_${shop}`, plan);
      } catch (e) {
        // 
      }
    }
    stepFetcher.submit(
      {
        actionType: "saveOnboardingStep",
        step: String(currentStep),
        plan,
        primaryColor: selectedColor,
      },
      { method: "POST" }
    );
  };

  const handleSelectColor = (hex) => {
    setSelectedColor(hex);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`reviora_selected_color_${shop}`, hex);
      } catch (e) {
        // 
      }
    }
    stepFetcher.submit(
      {
        actionType: "saveOnboardingStep",
        step: String(currentStep),
        plan: selectedPlan || "FREE",
        primaryColor: hex,
      },
      { method: "POST" }
    );
  };

  useEffect(() => {
    if (hasActivePayment && currentStep < 4) {
      changeStep(4);
      setSelectedPlan("PRO");
    }
  }, [hasActivePayment]);

  const isSubscribingPro =
    billingFetcher.state === "submitting" ||
    billingFetcher.state === "loading" ||
    Boolean(billingFetcher.data?.confirmationUrl);

  const isVerifying =
    themeFetcher.state === "submitting" ||
    themeFetcher.state === "loading";

  // Redirect to Shopify subscription confirmation page when confirmationUrl is returned
  useEffect(() => {
    if (billingFetcher.data?.confirmationUrl) {
      const url = billingFetcher.data.confirmationUrl;
      if (window.shopify?.open) {
        window.shopify.open(url, "_top");
      } else {
        window.open(url, "_top");
      }
    }
  }, [billingFetcher.data?.confirmationUrl]);

  // Capture billing error if any
  useEffect(() => {
    if (billingFetcher.data?.error) {
      setSubscribeError(billingFetcher.data.error);
    }
  }, [billingFetcher.data?.error]);

  // Capture theme verification response
  useEffect(() => {
    if (themeFetcher.data?.verified) {
      setThemeVerified(true);
      const name = themeFetcher.data?.themeName || "Live Theme";
      setThemeName(name);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`reviora_theme_verified_${shop}`, "true");
          localStorage.setItem(`reviora_theme_name_${shop}`, name);
        } catch (e) {
          // 
        }
      }
    }
  }, [themeFetcher.data, shop]);

  // Automatic background verification for theme connection on Step 4
  useEffect(() => {
    if (currentStep !== 4 || themeVerified) return;

    // Trigger check immediately if idle
    if (themeFetcher.state === "idle" && !themeFetcher.data?.verified) {
      themeFetcher.submit(
        { actionType: "verifyTheme" },
        { method: "POST" }
      );
    }

    // Automatically recheck when merchant returns to this tab from Shopify Theme Editor
    const handleRecheck = () => {
      if (!themeVerified && themeFetcher.state === "idle") {
        themeFetcher.submit(
          { actionType: "verifyTheme" },
          { method: "POST" }
        );
      }
    };

    window.addEventListener("focus", handleRecheck);
    document.addEventListener("visibilitychange", handleRecheck);

    // Heartbeat auto-poll every 4 seconds while on Step 4 until verified
    const timer = setInterval(() => {
      handleRecheck();
    }, 4000);

    return () => {
      window.removeEventListener("focus", handleRecheck);
      document.removeEventListener("visibilitychange", handleRecheck);
      clearInterval(timer);
    };
  }, [currentStep, themeVerified, themeFetcher.state, themeFetcher.data]);

  const colorPresets = [
    { label: "Classic Gold", hex: "#FFB800" },
    { label: "Shopify Emerald", hex: "#008060" },
    { label: "Amber Orange", hex: "#F59E0B" },
    { label: "Modern Indigo", hex: "#4F46E5" },
    { label: "Berry Rose", hex: "#E11D48" },
    { label: "Obsidian Slate", hex: "#202223" },
  ];

  const stepLabels = [
    "Welcome",
    "Widgets",
    "Plan",
    "Theme",
    "Launch",
  ];

  const resolvedApiKey = apiKey || "f79eb2d3832f37be2bb3a5c7c1efd416";
  const themeEditorUrl = `https://${shop}/admin/themes/${defaultThemeId}/editor?template=product&addAppBlockId=${resolvedApiKey}/review_widget&target=mainSection`;

  const handleOpenThemeEditor = () => {
    if (window.shopify?.open) {
      window.shopify.open(themeEditorUrl, "_blank");
    } else {
      window.open(themeEditorUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleVerifyTheme = () => {
    themeFetcher.submit(
      { actionType: "verifyTheme" },
      { method: "POST" }
    );
  };

  const handleSubscribePro = () => {
    setSubscribeError("");
    billingFetcher.submit(
      { actionType: "subscribePro" },
      { method: "POST" }
    );
  };

  const handleFinish = () => {
    setIsFinishing(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`reviora_onboarding_step_${shop}`);
        localStorage.removeItem(`reviora_selected_plan_${shop}`);
        localStorage.removeItem(`reviora_selected_color_${shop}`);
        localStorage.removeItem(`reviora_theme_verified_${shop}`);
        localStorage.removeItem(`reviora_theme_name_${shop}`);
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("onboarding");
        currentUrl.searchParams.delete("step");
        window.history.replaceState({}, "", currentUrl.pathname);
      } catch (e) {
        // 
      }
    }
    if (onComplete) {
      onComplete({
        primaryColor: selectedColor,
        plan: selectedPlan || "FREE",
      });
    }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "16px auto", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      {/* ================= Minimalist Progress Header ================= */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E1E3E5",
          padding: "18px 24px",
          marginBottom: "16px",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6D7175" }}>
              Initial Setup
            </div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#202223" }}>
              Step {currentStep} of {totalSteps}: {stepLabels[currentStep - 1]}
            </div>
          </div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "500",
              color: "#008060",
              backgroundColor: "#E4F8F0",
              padding: "4px 10px",
              borderRadius: "12px",
            }}
          >
            {Math.round((currentStep / totalSteps) * 100)}% Complete
          </span>
        </div>

        {/* Minimal Progress Track */}
        <div style={{ height: "4px", backgroundColor: "#F1F2F4", borderRadius: "2px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${(currentStep / totalSteps) * 100}%`,
              backgroundColor: "#008060",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Quiet Step Indicators */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: isCurrent ? "#202223" : isCompleted ? "#008060" : "#8C9196",
                  fontWeight: isCurrent ? "600" : "400",
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: "600",
                    backgroundColor: isCompleted ? "#008060" : isCurrent ? "#202223" : "#F1F2F4",
                    color: isCompleted || isCurrent ? "#FFFFFF" : "#6D7175",
                  }}
                >
                  {isCompleted ? <Check size={11} strokeWidth={3} /> : stepNum}
                </div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= Main Step Card ================= */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E1E3E5",
          padding: "28px 32px",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* ========================================================
            STEP 1: Welcome & Features
        ======================================================== */}
        {currentStep === 1 && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#F1F8F5", color: "#008060", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>
                <Sparkles size={14} /> Built for Shopify Online Store 2.0
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#202223", margin: "0 0 6px 0" }}>
                Welcome to Reviora Reviews
              </h2>
              <p style={{ fontSize: "14px", color: "#6D7175", margin: 0, lineHeight: 1.5 }}>
                Collect customer social proof, display fast-loading review widgets, and drive higher store conversion with zero liquid coding.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>
              {/* Feature 1 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "12px", borderRadius: "8px", border: "1px solid #F1F2F4", backgroundColor: "#FAFAFA" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#FFFFFF", border: "1px solid #E1E3E5", display: "flex", alignItems: "center", justifyContent: "center", color: "#008060", flexShrink: 0 }}>
                  <Camera size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    Photo &amp; Video Reviews
                  </div>
                  <div style={{ fontSize: "13px", color: "#6D7175", lineHeight: 1.4 }}>
                    Let buyers upload photos and short video clips directly from their phones with automatic image compression.
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "12px", borderRadius: "8px", border: "1px solid #F1F2F4", backgroundColor: "#FAFAFA" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#FFFFFF", border: "1px solid #E1E3E5", display: "flex", alignItems: "center", justifyContent: "center", color: "#008060", flexShrink: 0 }}>
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    11 Storefront Theme Widgets
                  </div>
                  <div style={{ fontSize: "13px", color: "#6D7175", lineHeight: 1.4 }}>
                    Star rating badges, product review lists, customer quote carousels, and floating verified badges.
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "12px", borderRadius: "8px", border: "1px solid #F1F2F4", backgroundColor: "#FAFAFA" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#FFFFFF", border: "1px solid #E1E3E5", display: "flex", alignItems: "center", justifyContent: "center", color: "#008060", flexShrink: 0 }}>
                  <Bot size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    AI Moderation &amp; Sentiment Insights
                  </div>
                  <div style={{ fontSize: "13px", color: "#6D7175", lineHeight: 1.4 }}>
                    Automatic profanity filtering, sentiment scoring, and 1-click brand-aligned reply suggestions.
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "12px", borderRadius: "8px", border: "1px solid #F1F2F4", backgroundColor: "#FAFAFA" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#FFFFFF", border: "1px solid #E1E3E5", display: "flex", alignItems: "center", justifyContent: "center", color: "#008060", flexShrink: 0 }}>
                  <Download size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    1-Click Import from CSV &amp; Competitors
                  </div>
                  <div style={{ fontSize: "13px", color: "#6D7175", lineHeight: 1.4 }}>
                    Effortlessly transfer your existing review history from Judge.me, Loox, Yotpo, AliExpress, or CSV files.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "16px", borderTop: "1px solid #F1F2F4" }}>
              <button
                type="button"
                onClick={() => changeStep(2)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 18px",
                  backgroundColor: "#008060",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Next: Customize Widgets <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 2: Widgets & Star Color
        ======================================================== */}
        {currentStep === 2 && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#202223", margin: "0 0 6px 0" }}>
                Widget Style &amp; Brand Color
              </h2>
              <p style={{ fontSize: "14px", color: "#6D7175", margin: 0, lineHeight: 1.5 }}>
                Choose the primary star rating accent color that harmonizes with your store&apos;s theme.
              </p>
            </div>

            {/* Color Palette Selector */}
            <div style={{ marginBottom: "24px" }}>
              <div
                id="star-accent-color-label"
                style={{ fontSize: "13px", fontWeight: "600", color: "#202223", marginBottom: "8px" }}
              >
                Select Star Accent Color:
              </div>
              <div
                role="radiogroup"
                aria-labelledby="star-accent-color-label"
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px" }}
              >
                {colorPresets.map((preset) => {
                  const isSelected = selectedColor === preset.hex;
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectColor(preset.hex)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: isSelected ? "2px solid #008060" : "1px solid #E1E3E5",
                        backgroundColor: isSelected ? "#F4FBF7" : "#FFFFFF",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: isSelected ? "600" : "500",
                        color: "#202223",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          backgroundColor: preset.hex,
                          flexShrink: 0,
                          border: "1px solid rgba(0,0,0,0.1)",
                        }}
                      />
                      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {preset.label}
                      </span>
                      {isSelected && <Check size={13} color="#008060" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Preview Card */}
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#6D7175", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Live Storefront Preview
                </span>
                <span style={{ fontSize: "11px", color: "#8C9196" }}>
                  Product Page Widget
                </span>
              </div>

              <div
                style={{
                  padding: "18px 20px",
                  borderRadius: "8px",
                  border: "1px solid #E1E3E5",
                  backgroundColor: "#FAFAFA",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "26px", height: "26px", borderRadius: "50%", backgroundColor: "#E4E5E7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "600", color: "#202223" }}>
                      SL
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#202223" }}>Sarah L.</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", backgroundColor: "#E4F8F0", color: "#008060", fontSize: "11px", fontWeight: "600", padding: "2px 6px", borderRadius: "4px" }}>
                      <Check size={10} strokeWidth={3} /> Verified Buyer
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "#8C9196" }}>Yesterday</span>
                </div>

                <div style={{ display: "flex", gap: "2px", marginBottom: "8px" }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={16} fill={selectedColor} color={selectedColor} strokeWidth={1} />
                  ))}
                </div>

                <div style={{ fontSize: "13px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
                  Incredible quality and fast shipping!
                </div>
                <div style={{ fontSize: "13px", color: "#6D7175", lineHeight: 1.4 }}>
                  &ldquo;The material feels premium and fits true to size. Couldn&apos;t be happier with this purchase.&rdquo;
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid #F1F2F4" }}>
              <button
                type="button"
                onClick={() => changeStep(1)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 16px",
                  backgroundColor: "#FFFFFF",
                  color: "#202223",
                  border: "1px solid #C9CCCF",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                onClick={() => changeStep(3)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 18px",
                  backgroundColor: "#008060",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Next: Choose Plan <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 3: Plan Selection
        ======================================================== */}
        {currentStep === 3 && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#202223", margin: "0 0 6px 0" }}>
                Choose Your Plan
              </h2>
              <p style={{ fontSize: "14px", color: "#6D7175", margin: 0, lineHeight: 1.5 }}>
                Start free forever or unlock photo reviews, AI auto-replies, and video reels with Reviora Pro.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              {/* Free Plan */}
              <div
                style={{
                  padding: "20px",
                  borderRadius: "10px",
                  border: selectedPlan === "FREE" ? "2px solid #008060" : "1px solid #E1E3E5",
                  backgroundColor: selectedPlan === "FREE" ? "#F9FCFB" : "#FFFFFF",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#202223" }}>Free</div>
                    {selectedPlan === "FREE" ? (
                      <span style={{ fontSize: "11px", fontWeight: "600", color: "#008060", backgroundColor: "#E4F8F0", padding: "2px 6px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <Check size={11} strokeWidth={3} /> Active Plan
                      </span>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "24px", fontWeight: "700", color: "#202223" }}>$0</span>
                    <span style={{ fontSize: "12px", color: "#6D7175" }}>/ forever</span>
                  </div>

                  <div style={{ fontSize: "12px", color: "#6D7175", marginBottom: "14px", lineHeight: 1.4 }}>
                    Ideal for new stores starting to collect authentic buyer reviews.
                  </div>

                  <div style={{ height: "1px", backgroundColor: "#F1F2F4", marginBottom: "14px" }} />

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "#202223" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={13} color="#008060" /> 8 Essential review widgets
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={13} color="#008060" /> Storefront review form
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={13} color="#008060" /> Moderation inbox (Approve/Reject)
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={13} color="#008060" /> 1-Click CSV &amp; App import
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectPlan("FREE")}
                  style={{
                    marginTop: "18px",
                    width: "100%",
                    padding: "8px",
                    borderRadius: "6px",
                    border: selectedPlan === "FREE" ? "1px solid #008060" : "1px solid #C9CCCF",
                    backgroundColor: selectedPlan === "FREE" ? "#008060" : "#FFFFFF",
                    color: selectedPlan === "FREE" ? "#FFFFFF" : "#202223",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {selectedPlan === "FREE" ? "✓ Active (Free Plan)" : "Activate Free Plan"}
                </button>
              </div>

              {/* Pro Plan */}
              <div
                style={{
                  padding: "20px",
                  borderRadius: "10px",
                  border: hasActivePayment || selectedPlan === "PRO" ? "2px solid #008060" : "1px solid #E1E3E5",
                  backgroundColor: hasActivePayment || selectedPlan === "PRO" ? "#F9FCFB" : "#FFFFFF",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease",
                  position: "relative",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#202223" }}>Pro</div>
                    {hasActivePayment || selectedPlan === "PRO" ? (
                      <span style={{ fontSize: "11px", fontWeight: "600", color: "#008060", backgroundColor: "#E4F8F0", padding: "2px 6px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <Check size={11} strokeWidth={3} /> Active Plan
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", fontWeight: "600", color: "#008060", backgroundColor: "#E4F8F0", padding: "2px 6px", borderRadius: "4px" }}>
                        Recommended
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "24px", fontWeight: "700", color: "#008060" }}>$4.99</span>
                    <span style={{ fontSize: "12px", color: "#6D7175" }}>/ month</span>
                  </div>

                  <div style={{ fontSize: "12px", color: "#6D7175", marginBottom: "14px", lineHeight: 1.4 }}>
                    Accelerate conversions with photo uploads, AI tools, and carousels.
                  </div>

                  <div style={{ height: "1px", backgroundColor: "#F1F2F4", marginBottom: "14px" }} />

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "#202223" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={13} color="#008060" /> <strong>Everything in Free</strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={13} color="#008060" /> Photo &amp; video customer uploads
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={13} color="#008060" /> AI auto-replies &amp; sentiment analysis
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={13} color="#008060" /> Automated review request emails
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={13} color="#008060" /> Video Reels &amp; Review Carousels
                    </div>
                  </div>
                </div>

                <div>
                  {hasActivePayment || selectedPlan === "PRO" ? (
                    <button
                      type="button"
                      style={{
                        marginTop: "18px",
                        width: "100%",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "#008060",
                        color: "#FFFFFF",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "default",
                      }}
                    >
                      ✓ Active (Pro Plan)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubscribingPro}
                      onClick={handleSubscribePro}
                      style={{
                        marginTop: "18px",
                        width: "100%",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "#202223",
                        color: "#FFFFFF",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: isSubscribingPro ? "wait" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      {isSubscribingPro ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" /> Preparing Shopify Checkout...
                        </>
                      ) : (
                        <>
                          Subscribe to Pro ($4.99/mo) <ExternalLink size={13} />
                        </>
                      )}
                    </button>
                  )}
                  {subscribeError && (
                    <div style={{ marginTop: "10px", padding: "8px 10px", backgroundColor: "#FFF4F4", border: "1px solid #FED2D2", borderRadius: "6px", textAlign: "center" }}>
                      <div style={{ color: "#D72C0D", fontSize: "11px", fontWeight: "500", marginBottom: "4px" }}>
                        {subscribeError}
                      </div>
                      <a
                        href="/app/billing"
                        target="_top"
                        style={{ color: "#008060", fontSize: "11px", fontWeight: "600", textDecoration: "underline" }}
                      >
                        Open Billing Page directly →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid #F1F2F4" }}>
              <button
                type="button"
                onClick={() => changeStep(2)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 16px",
                  backgroundColor: "#FFFFFF",
                  color: "#202223",
                  border: "1px solid #C9CCCF",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {!selectedPlan && (
                  <span style={{ fontSize: "12px", color: "#8C9196" }}>
                    Activate a plan above to continue
                  </span>
                )}
                <button
                  type="button"
                  disabled={!selectedPlan}
                  onClick={() => changeStep(4)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 18px",
                    backgroundColor: selectedPlan ? "#008060" : "#E4E5E7",
                    color: selectedPlan ? "#FFFFFF" : "#8C9196",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: selectedPlan ? "pointer" : "not-allowed",
                    transition: "all 0.15s ease",
                  }}
                >
                  Next: Enable in Theme <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 4: Theme Enable with Verification
        ======================================================== */}
        {currentStep === 4 && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#202223", margin: "0 0 6px 0" }}>
                Enable in Your Shopify Theme
              </h2>
              <p style={{ fontSize: "14px", color: "#6D7175", margin: 0, lineHeight: 1.5 }}>
                Connect Reviora to your live theme. No manual liquid coding or theme editing required.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "28px" }}>
              {/* Linear Step 1 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#F1F2F4", color: "#202223", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0, marginTop: "2px" }}>
                  1
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    Open Shopify Theme Editor
                  </div>
                  <div style={{ fontSize: "13px", color: "#6D7175", marginBottom: "10px", lineHeight: 1.4 }}>
                    We will deep-link directly to your active theme&apos;s product template with the Reviora block preselected.
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenThemeEditor}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      backgroundColor: "#FFFFFF",
                      color: "#202223",
                      border: "1px solid #C9CCCF",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Open Theme Editor <ExternalLink size={13} />
                  </button>
                </div>
              </div>

              <div style={{ height: "1px", backgroundColor: "#F1F2F4", margin: "0 0 0 38px" }} />

              {/* Linear Step 2 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#F1F2F4", color: "#202223", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0, marginTop: "2px" }}>
                  2
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    Click &ldquo;Save&rdquo; in Theme Editor
                  </div>
                  <div style={{ fontSize: "13px", color: "#6D7175", lineHeight: 1.4 }}>
                    In the top-right corner of the Shopify Theme Editor, click the green <strong>Save</strong> button to commit the widget.
                  </div>
                </div>
              </div>

              <div style={{ height: "1px", backgroundColor: "#F1F2F4", margin: "0 0 0 38px" }} />

              {/* Linear Step 3 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: themeVerified ? "#008060" : "#F1F2F4",
                    color: themeVerified ? "#FFFFFF" : "#202223",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "700",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  {themeVerified ? <Check size={13} strokeWidth={3} /> : "3"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    Verify Theme Connection
                  </div>
                  <div style={{ fontSize: "13px", color: "#6D7175", marginBottom: "12px", lineHeight: 1.4 }}>
                    {themeVerified
                      ? "Theme connected and verified. You're ready to complete setup."
                      : "We automatically detect and verify your theme in the background as soon as you save."}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={isVerifying || themeVerified}
                      onClick={handleVerifyTheme}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        backgroundColor: themeVerified ? "#F4FBF7" : "#008060",
                        color: themeVerified ? "#008060" : "#FFFFFF",
                        border: themeVerified ? "1px solid #A4E8CE" : "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: themeVerified ? "default" : "pointer",
                      }}
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" /> Checking in background...
                        </>
                      ) : themeVerified ? (
                        <>
                          <Check size={13} strokeWidth={3} /> Verified ({themeName || "Live Theme"})
                        </>
                      ) : (
                        <>
                          <RefreshCw size={13} /> Check Connection Now
                        </>
                      )}
                    </button>
                    {!themeVerified && (
                      <span style={{ fontSize: "12px", color: "#6D7175", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#008060",
                            boxShadow: "0 0 0 2px rgba(0, 128, 96, 0.2)",
                          }}
                        />
                        Auto-checking in background...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid #F1F2F4" }}>
              <button
                type="button"
                onClick={() => changeStep(3)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 16px",
                  backgroundColor: "#FFFFFF",
                  color: "#202223",
                  border: "1px solid #C9CCCF",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                disabled={!themeVerified}
                onClick={() => changeStep(5)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 18px",
                  backgroundColor: themeVerified ? "#008060" : "#E4E5E7",
                  color: themeVerified ? "#FFFFFF" : "#8C9196",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: themeVerified ? "pointer" : "not-allowed",
                }}
              >
                Next: Complete Setup <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 5: Setup Complete
        ======================================================== */}
        {currentStep === 5 && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#E4F8F0",
                color: "#008060",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <ShieldCheck size={28} />
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#202223", margin: "0 0 6px 0" }}>
              You&apos;re All Set!
            </h2>
            <p style={{ fontSize: "14px", color: "#6D7175", margin: "0 0 24px 0", lineHeight: 1.5 }}>
              Reviora is connected to your live theme and configured according to your preferences.
            </p>

            {/* Summary Box */}
            <div
              style={{
                textAlign: "left",
                padding: "16px 20px",
                borderRadius: "8px",
                border: "1px solid #E1E3E5",
                backgroundColor: "#FAFAFA",
                marginBottom: "28px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em", color: "#6D7175", marginBottom: "12px" }}>
                Configuration Summary
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6D7175" }}>Shopify Store</span>
                  <span style={{ fontWeight: "600", color: "#202223" }}>{shop}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6D7175" }}>Star Accent Color</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: selectedColor }} />
                    <span style={{ fontWeight: "600", color: "#202223" }}>{selectedColor}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6D7175" }}>Chosen Tier</span>
                  <span style={{ fontWeight: "600", color: "#202223" }}>
                    {selectedPlan === "PRO" ? "Pro Plan ($4.99/mo)" : "Free Plan ($0/mo)"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6D7175" }}>Theme Integration</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#008060", fontWeight: "600" }}>
                    <Check size={13} strokeWidth={3} /> Verified &amp; Active
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isFinishing}
              onClick={handleFinish}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 28px",
                backgroundColor: isFinishing ? "#4B5563" : "#008060",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: isFinishing ? "wait" : "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              {isFinishing ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Loading Dashboard...
                </>
              ) : (
                "Open Merchant Dashboard"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
