#!/usr/bin/env node
// CRITICAL: Redirect stderr to a log file IMMEDIATELY before any imports that might log.
// This prevents any library (winston, dotenv, etc.) from breaking MCP stdio protocol,
// while still capturing diagnostics (uncaught exceptions, V8 warnings, etc.) for debugging.
import { createWriteStream, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const stderrLogDir = path.join(projectRoot, "logs");
try { mkdirSync(stderrLogDir, { recursive: true }); } catch {}
const stderrStream = createWriteStream(path.join(stderrLogDir, "stderr.log"), { flags: "a" });
process.stderr.write = (chunk: any) => {
  stderrStream.write(chunk);
  return true;
};

import { FastMCP } from "fastmcp";
import dotenv from "dotenv";
import { registerTools } from "./tools/index.js";
import packageJson from "../package.json" assert { type: "json" };

// Load .env from the project root (where this script is located)
dotenv.config({ path: path.join(projectRoot, ".env") });

const server = new FastMCP({
  name: "workflowy",
  version: packageJson.version
});

registerTools(server);

server.start({
  transportType: "stdio"
});
