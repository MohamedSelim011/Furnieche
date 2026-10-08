import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/WASM image libraries must load from node_modules, not be bundled
  serverExternalPackages: ["sharp", "heic-convert", "heic-decode", "libheif-js"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
