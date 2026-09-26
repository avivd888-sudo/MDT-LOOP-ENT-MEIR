import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `output: "export"` produces a fully static build that can be served from any
  // static host (or opened locally) — appropriate for a demo/prototype with no
  // backend. Remove this once a real API is introduced.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
