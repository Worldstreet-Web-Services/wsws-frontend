"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// The last boundary. This only runs when the failure is in the root layout
// itself, or when app/error.tsx could not render — so it replaces the whole
// document, html and body included, and cannot rely on anything the layout
// would normally provide: no fonts, no providers, no globals.css classes.
//
// Everything here is therefore inline-styled and dependency-free apart from the
// report. If this component throws, the user sees the browser's own blank error
// page and we learn nothing.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#000",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "46ch", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: "13.5px", color: "rgba(255,255,255,0.55)", marginTop: "8px" }}>
            The app failed to load. Your funds are untouched. Reloading usually fixes it.
          </p>
          <a
            href="/dashboard"
            style={{
              display: "inline-block",
              marginTop: "20px",
              padding: "8px 16px",
              borderRadius: "999px",
              background: "#fff",
              color: "#000",
              fontSize: "12.5px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Reload the dashboard
          </a>
          {error.digest ? (
            <p
              style={{
                marginTop: "16px",
                fontFamily: "monospace",
                fontSize: "11px",
                color: "rgba(255,255,255,0.25)",
              }}
            >
              Ref {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
