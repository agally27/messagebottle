import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is deliberately off: almost every route reads a session or
  // the database, so the classic model (dynamic on cookies()/db, static otherwise)
  // is simpler and less error-prone here. See docs/DECISIONS.md.
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      // Supabase Storage public/signed URLs (project ref is environment-specific).
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), payment=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
