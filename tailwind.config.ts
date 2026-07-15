import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101010",
        paper: "#f6f6f6",
        accent: "#b7ff2a"
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "PingFang SC", "Microsoft YaHei", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
