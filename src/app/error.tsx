"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] route error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center px-6 text-center">
      <p className="kicker">Something went wrong</p>
      <h1 className="h3 mt-3">This page couldn&apos;t load.</h1>
      <p className="mt-3 text-sm text-muted">Try again. If the problem continues, come back in a moment.</p>
      <button type="button" className="btn btn-primary mt-6" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
