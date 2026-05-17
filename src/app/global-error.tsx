'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#0a0a0a",
          color: "#ededed",
          padding: "20px",
          textAlign: "center"
        }}>
          <h2 style={{ marginBottom: "16px", fontSize: "24px" }}>Something went wrong!</h2>
          <p style={{ color: "#a0a0a0", marginBottom: "24px", maxWidth: "500px" }}>
            An unexpected error occurred in the backend application.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              backgroundColor: "#ededed",
              color: "#0a0a0a",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
