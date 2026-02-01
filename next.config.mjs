/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Explicitly set turbopack root to avoid lockfile detection issues
  turbopack: {
    root: process.cwd(),
  },
  // ปิด x-powered-by header เพื่อความปลอดภัยเล็กน้อย
  poweredByHeader: false,
  // Standalone output สำหรับ Docker deployment
  output: 'standalone',
  // จัดการ Image Optimization (ถ้าจำเป็นในอนาคต)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
