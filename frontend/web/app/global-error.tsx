"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Operator Dashboard Global Error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a", color: "white", fontFamily: "sans-serif" }}>
        <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>System Error</h2>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
          The dashboard encountered a critical error. Engineering has been notified via Sentry.
        </p>
        <button
          onClick={() => reset()}
          style={{ padding: "0.75rem 2rem", borderRadius: "0.5rem", backgroundColor: "#3b82f6", color: "white", border: "none", cursor: "pointer", fontSize: "1rem", fontWeight: "bold" }}
        >
          Reload Dashboard
        </button>
      </body>
    </html>
  );
}
