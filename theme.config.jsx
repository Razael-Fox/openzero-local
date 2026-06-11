import React from "react";

export default {
  logo: <span style={{ fontWeight: 800 }}>OpenZero Local Docs</span>,
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
