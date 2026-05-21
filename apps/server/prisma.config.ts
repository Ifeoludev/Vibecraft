/// <reference types="node" />
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Fallback keeps prisma generate from failing during Docker build
    // when DATABASE_URL isn't available yet. At runtime Render injects the real value.
    url: process.env["DATABASE_URL"] ?? "postgresql://build:build@localhost:5432/build",
  },
});
