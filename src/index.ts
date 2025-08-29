#!/usr/bin/env node
import { FastMCP } from "fastmcp";
import  dotenv from "dotenv";
import { registerTools } from "./tools/index.js";

import { z } from "zod"; // Or any validation library that supports Standard Schema

const server = new FastMCP({
  name: "workflowy",
  version: "0.1.3",
});

dotenv.config();
registerTools(server);

server.start({
  transportType: "stdio"
});
