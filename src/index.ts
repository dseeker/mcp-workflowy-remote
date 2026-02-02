#!/usr/bin/env node
import { FastMCP } from "fastmcp";
import  dotenv from "dotenv";
import { registerTools } from "./tools/index.js";
import packageJson from "../package.json" assert { type: "json" };

import { z } from "zod"; // Or any validation library that supports Standard Schema

const server = new FastMCP({
  name: "workflowy",
  version: packageJson.version
});

dotenv.config();
registerTools(server);

server.start({
  transportType: "stdio"
});
