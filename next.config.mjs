/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["google-trends-api"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
