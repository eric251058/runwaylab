import { defineConfig, devices } from "@playwright/test";

const host = "127.0.0.1";
const port = 3100;
const baseURL = "http://" + host + ":" + port;
const standaloneServerCommand = [
  "mkdir -p .next/standalone/.next",
  "rm -rf .next/standalone/.next/static",
  "cp -R .next/static .next/standalone/.next/static",
  "if [ -d public ]; then rm -rf .next/standalone/public && cp -R public .next/standalone/public; fi",
  "PORT=3100 HOSTNAME=127.0.0.1 node .next/standalone/server.js"
].join(" && ");
const missingEnv = ["RUNWAYLAB_E2E", "DATABASE_URL"].filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Missing required Playwright E2E environment variables: ${missingEnv.join(", ")}`);
}

if (process.env.RUNWAYLAB_E2E !== "1") {
  throw new Error("RUNWAYLAB_E2E must be exactly 1 for operational acceptance E2E.");
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: process.env.RUNWAYLAB_E2E_SKIP_SERVER
    ? undefined
    : {
        command: standaloneServerCommand,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000
      }
});
