// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // <-- สำคัญ: ต้อง Scan โฟลเดอร์ components
    "./app/**/*.{js,ts,jsx,tsx,mdx}",        // <-- สำคัญ: ต้อง Scan โฟลเดอร์ app
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",        // <-- สำคัญ: Scan config ใน lib
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")], // อย่าลืม plugin นี้
};
export default config;