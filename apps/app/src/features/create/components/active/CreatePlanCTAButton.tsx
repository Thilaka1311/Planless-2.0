/**
 * CreatePlanCTAButton
 * -------------------
 * Dedicated primary action button for every step inside the Create Plan flow.
 * Do NOT use this component outside of the Create Plan feature.
 *
 * Variants:
 *   default  — used for steps 1–3 (SET THE DETAILS, INVITE PEOPLE, FINALIZE PLAN)
 *   final    — used for step 4 (HOST PLAN) — stronger glow, slightly bolder feel
 *
 * States: enabled → disabled → loading
 */

import React from "react";

interface CreatePlanCTAButtonProps {
  /** All-caps label, e.g. "SET THE DETAILS" */
  text: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** "final" = HOST PLAN style with larger glow. Default = normal step CTA. */
  variant?: "default" | "final";
  /** Optional id for test/accessibility targeting */
  id?: string;
  /** Set to true to hide the right arrow icon */
  hideArrow?: boolean;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    style={{ animation: "cta-spin 0.75s linear infinite" }}
  >
    <style>{`
      @keyframes cta-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
    `}</style>
    <circle
      cx="8" cy="8" r="6"
      stroke="rgba(255,255,255,0.25)"
      strokeWidth="2"
    />
    <path
      d="M8 2 A6 6 0 0 1 14 8"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Arrow icon ───────────────────────────────────────────────────────────────

const ArrowRight = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    style={{ flexShrink: 0 }}
  >
    <path
      d="M3 8h10M9 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const CreatePlanCTAButton = ({
  text,
  onPress,
  disabled = false,
  loading = false,
  variant = "default",
  id,
  hideArrow = true,
}: CreatePlanCTAButtonProps) => {
  const isFinal   = variant === "final";
  const isInert   = disabled || loading;

  // ── Colours & shadow based on state & variant ──────────────────────────────
  const bgGradient = isInert
    ? "none"
    : isFinal
      ? "linear-gradient(135deg, #FF7A45 0%, #FF9866 100%)"   // slightly deeper for HOST PLAN
      : "linear-gradient(135deg, #FF9866 0%, #FF7A45 100%)";  // standard step gradient

  const bgColor    = isInert ? "#1e1e20" : undefined;
  const textColor  = isInert ? "#555560" : "#ffffff";

  const boxShadow  = isInert
    ? "none"
    : isFinal
      ? "0 10px 36px rgba(255,122,69,0.40), 0 2px 8px rgba(255,122,69,0.20)"  // bigger glow
      : "0 8px 24px rgba(255,122,69,0.25)";

  const border = isInert
    ? "1px solid rgba(255,255,255,0.06)"
    : "none";

  return (
    <button
      id={id}
      type="button"
      onClick={isInert ? undefined : onPress}
      disabled={isInert}
      style={{
        // Layout
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        gap:            8,
        width:          "100%",
        height:         56,
        borderRadius:   20,
        border,
        padding:        "0 20px",
        // Colour
        background:     isInert ? bgColor : bgGradient,
        color:          textColor,
        // Typography
        fontSize:       13,
        fontWeight:     isFinal ? 800 : 700,
        fontFamily:     "var(--font-display)",
        letterSpacing:  "0.12em",
        textTransform:  "uppercase",
        // Shadow & UX
        boxShadow,
        cursor:         isInert ? "not-allowed" : "pointer",
        userSelect:     "none",
        transition:     "opacity 0.15s, transform 0.12s, box-shadow 0.15s",
        opacity:        1,
        // Prevent native button styles
        WebkitAppearance: "none",
        appearance:       "none",
      }}
      onMouseEnter={e => {
        if (!isInert) {
          e.currentTarget.style.opacity   = "0.92";
          e.currentTarget.style.boxShadow = isFinal
            ? "0 14px 40px rgba(255,122,69,0.50)"
            : "0 10px 30px rgba(255,122,69,0.35)";
        }
      }}
      onMouseLeave={e => {
        if (!isInert) {
          e.currentTarget.style.opacity   = "1";
          e.currentTarget.style.boxShadow = boxShadow;
        }
      }}
      onMouseDown={e => {
        if (!isInert) e.currentTarget.style.transform = "scale(0.98)";
      }}
      onMouseUp={e => {
        if (!isInert) e.currentTarget.style.transform = "scale(1)";
      }}
      onTouchStart={e => {
        if (!isInert) e.currentTarget.style.transform = "scale(0.98)";
      }}
      onTouchEnd={e => {
        if (!isInert) e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {loading ? (
        <>
          <Spinner />
          <span style={{ fontFamily: "inherit", fontSize: "inherit",
            fontWeight: "inherit", letterSpacing: "inherit" }}>
            {text}
          </span>
        </>
      ) : (
        <>
          <span style={{ fontFamily: "inherit", fontSize: "inherit",
            fontWeight: "inherit", letterSpacing: "inherit" }}>
            {text}
          </span>
        </>
      )}
    </button>
  );
};
