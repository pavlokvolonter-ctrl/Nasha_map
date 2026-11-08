import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false, // 3D-рушій створюється один раз; StrictMode подвоював би його в dev
};

export default nextConfig;
