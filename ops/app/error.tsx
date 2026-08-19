"use client";

// Without this, a thrown Server Action shows Next's raw dev-error overlay — which reads as "you
// broke something" to a non-technical user and is exactly the moment someone gives up and goes
// back to paper. This is the fallback: plain language, a way forward, no stack trace.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ padding: 40, maxWidth: 480 }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 10 }}>Something went wrong</h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        Nothing was lost — whatever you were doing before this didn&apos;t save, but everything
        already saved is still there. Try again, or go back and re-enter what you were adding.
      </p>
      <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
    </div>
  );
}
