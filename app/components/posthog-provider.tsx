"use client";

import posthog from "posthog-js";
import { PostHogProvider as PostHogReactProvider } from "posthog-js/react";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;

if (typeof window !== "undefined") {
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: "https://app.posthog.com",
      loaded: (posthog) => {
        if (process.env.NODE_ENV === "development") posthog.debug();
      },
    });
  }
}

export function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PostHogReactProvider client={posthog}>{children}</PostHogReactProvider>
  );
}
