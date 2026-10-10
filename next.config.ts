import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // OpenNext must copy jose's Workers-specific conditional export in full.
  serverExternalPackages: ["jose"],
  output: "standalone",
};

export default async function configureNext(): Promise<NextConfig> {
  // The normal Firestore/Cloud Run workflow does not start a Cloudflare runtime.
  // Use `pnpm dev:cloudflare` when developing against the local D1 binding.
  if (process.env.CLOUDFLARE_DEV === "1") {
    const { initOpenNextCloudflareForDev } =
      await import("@opennextjs/cloudflare");
    await initOpenNextCloudflareForDev();
  }
  return nextConfig;
}
