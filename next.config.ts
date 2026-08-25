import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // /como-funciona is a homepage anchor, not a standalone page
        source: "/como-funciona",
        destination: "/#como-funciona",
        permanent: true, // 308
      },
    ];
  },
};

export default nextConfig;
