"use client";

import { ClockIcon } from "@/components/icons";
import { Button } from "@/components/ui";

// Most often hit when the API is asleep on Render's free plan and the first request times out.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <ClockIcon width={26} height={26} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Just a moment</h1>
        <p className="mt-2 text-ink-3">We couldn&apos;t load this page. The server may be waking up. Give it a few seconds and try again.</p>
        <Button onClick={reset} className="mt-6">
          Try again
        </Button>
      </div>
    </main>
  );
}
