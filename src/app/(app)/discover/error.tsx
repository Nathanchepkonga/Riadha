"use client";

import { useEffect } from "react";

export default function DiscoverError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[discover] route error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="px-4 pt-8">
      <div className="card flex flex-col items-center px-6 py-10 text-center">
        <p className="kicker">Discover</p>
        <h1 className="h3 mt-2">Search is taking a breather.</h1>
        <p className="mt-2 max-w-[34ch] text-sm text-muted">Your search did not load. Try again or come back in a moment.</p>
        <button type="button" className="btn btn-primary mt-5" onClick={() => reset()}>Try again</button>
      </div>
    </main>
  );
}
