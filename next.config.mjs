/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Avoid "inferred workspace root" warning when multiple lockfiles exist
  turbopack: { root: process.cwd() },
};

export default nextConfig;
