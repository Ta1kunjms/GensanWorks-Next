import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'; object-src 'none'; img-src 'self' data: blob: https:; font-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https: ws: wss:",
        },
        {
          key: "Content-Security-Policy-Report-Only",
          value:
            "default-src 'self'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'; object-src 'none'; img-src 'self' data: blob: https:; font-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https: ws: wss:",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN",
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin",
        },
        {
          key: "Cross-Origin-Resource-Policy",
          value: "same-site",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "off",
        },
        {
          key: "X-Permitted-Cross-Domain-Policies",
          value: "none",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ],
    },
  ],
  redirects: async () => [
    {
      source: "/auth/login",
      destination: "/login",
      permanent: true,
    },
    {
      source: "/jobs",
      destination: "/jobseeker/jobs",
      permanent: true,
    },
    {
      source: "/employers",
      destination: "/employer/jobs",
      permanent: true,
    },

    {
      source: "/about-peso",
      destination: "/about",
      permanent: true,
    },
    {
      source: "/helpdesk",
      destination: "/help",
      permanent: true,
    },
    {
      source: "/help-support",
      destination: "/help",
      permanent: true,
    },
    {
      source: "/admin-portal",
      destination: "/admin/dashboard",
      permanent: true,
    },
    {
      source: "/admin-portal/:path*",
      destination: "/admin/:path*",
      permanent: true,
    },
  ],
};

export default nextConfig;
