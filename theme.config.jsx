import React from "react";

export default {
  logo: (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <span style={{ fontWeight: 800 }}>OpenZero Local Docs</span>
      <button
        onClick={() => {
          if (typeof window !== "undefined") {
            if (window.parent !== window) {
              window.parent.postMessage({ type: "BACK_TO_PORTFOLIO" }, "*");
            } else {
              window.location.href = "https://razael-fox.my.id";
            }
          }
        }}
        style={{
          fontSize: "12px",
          padding: "4px 10px",
          borderRadius: "9999px",
          background: "#6750A4",
          color: "white",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        ← Back to Portfolio
      </button>
    </div>
  ),
  project: {
    link: "https://github.com/Razael-Fox/openzero-local",
  },
  docsRepositoryBase: "https://github.com/Razael-Fox/openzero-local",
  footer: {
    text: (
      <span>
        {new Date().getFullYear()} ©{" "}
        <a href="https://razael-fox.my.id" target="_blank" rel="noopener noreferrer">
          Razael Fox
        </a>
        . Powered by Nextra.
      </span>
    ),
  },
  useNextSeoProps() {
    return {
      titleTemplate: "%s – OpenZero Local Docs",
    };
  },
};
