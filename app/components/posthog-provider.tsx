"use client";

import posthog from "posthog-js";
import { PostHogProvider as PostHogReactProvider } from "posthog-js/react";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";

if (typeof window !== "undefined") {
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: "https://app.posthog.com",
      debug: false,
      disable_surveys: true,
      loaded: (ph) => {
        ph.debug(false);
        if (isLocalhost) ph.opt_out_capturing();
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
