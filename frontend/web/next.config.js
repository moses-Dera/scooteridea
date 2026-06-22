/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ebike/types", "@ebike/api-client"],
};

module.exports = nextConfig;
