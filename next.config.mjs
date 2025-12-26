/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ปิด x-powered-by header เพื่อความปลอดภัยเล็กน้อย
  poweredByHeader: false,
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