import { defineConfig } from "@lovable.dev/vite-tanstack-config";

if (process.argv.includes("build")) {
  process.env.NODE_ENV = "production";
}

export default defineConfig({
  tanstackStart: {},
  server: {
    port: 8080,
    proxy: {
      "/api/v1": {
        target: "http://networkpeer-staging-api-alb-969746120.eu-north-1.elb.amazonaws.com",
        changeOrigin: true,
      },
    },
  },
  nitro: {
    preset: "vercel",
    noExternals: true,
  },
} as any);
