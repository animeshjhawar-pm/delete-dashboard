import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lean, self-contained server bundle for the Railway Docker image.
  output: "standalone",
  // This project nests under a parent dir that also has a lockfile; pin the
  // workspace root so tracing/standalone resolves from here.
  outputFileTracingRoot: import.meta.dirname,
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
