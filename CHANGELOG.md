## [0.4.3](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.4.2...v0.4.3) (2025-08-30)


### Bug Fixes

* use worker build from semantic-release for correct version ([3ecf0e1](https://github.com/dseeker/mcp-workflowy-remote/commit/3ecf0e1b5bba5bcde7d183e0ea097f67e9783fae))

## [0.4.2](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.4.1...v0.4.2) (2025-08-30)


### Bug Fixes

* add version validation to deployment verification tests ([8e988cd](https://github.com/dseeker/mcp-workflowy-remote/commit/8e988cd7a2f9f773353669da9467548750970336))

## [0.4.1](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.4.0...v0.4.1) (2025-08-30)


### Bug Fixes

* deploy worker before uploading secrets to avoid Cloudflare API error ([ace4a40](https://github.com/dseeker/mcp-workflowy-remote/commit/ace4a401330fcd01013c9755a936ab7209f13acb))

# [0.4.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.3.0...v0.4.0) (2025-08-30)


### Bug Fixes

* correct preview deployment to use worker versions instead of separate workers ([5f73113](https://github.com/dseeker/mcp-workflowy-remote/commit/5f73113012ef578ce0af47e82bb4734701f1241a))
* remove secret upload from preview deployment ([a0a96eb](https://github.com/dseeker/mcp-workflowy-remote/commit/a0a96eb5d1849f33d2eeaacdc71f9f5a03d8f218))
* upload secrets in preview deployment workflow ([6706e8a](https://github.com/dseeker/mcp-workflowy-remote/commit/6706e8aba47f22c734019ea3d60d1818ea8d6617))
* use clean branch prefix for preview URLs ([e505858](https://github.com/dseeker/mcp-workflowy-remote/commit/e50585847c19bfbf06b17ee7e3d7110d9d3a1d75))


### Features

* add persistent preview alias for stable preview URL ([665f45e](https://github.com/dseeker/mcp-workflowy-remote/commit/665f45e2228607c4334b44331adfeadbdfd5a48b))
* implement Phase 0 critical missing operations ([875a88d](https://github.com/dseeker/mcp-workflowy-remote/commit/875a88db0254e236d83e4f07b018e5d78d377a79))

# [0.3.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.2.3...v0.3.0) (2025-08-29)


### Features

* enhance list_nodes and search_nodes with advanced filtering and preview ([3fb1092](https://github.com/dseeker/mcp-workflowy-remote/commit/3fb109241fb3103d424c961984b42a5b2d3898ea))
* implement two-environment deployment with preview and production ([ec39f39](https://github.com/dseeker/mcp-workflowy-remote/commit/ec39f3996b1dbd0f738a3fbf55bef6ba560efbbc))

## [0.2.3](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.2.2...v0.2.3) (2025-08-29)

## [0.2.2](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.2.1...v0.2.2) (2025-08-29)


### Bug Fixes

* specify production environment in GitHub Action to eliminate wrangler warnings ([0acbbe2](https://github.com/dseeker/mcp-workflowy-remote/commit/0acbbe24da7fafb5bf7195593ff756f56bea491b))

## [0.2.1](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.2.0...v0.2.1) (2025-08-29)

# [0.2.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.1.6...v0.2.0) (2025-08-29)


### Features

* add advanced search parameters with comprehensive filtering ([e3bcc8c](https://github.com/dseeker/mcp-workflowy-remote/commit/e3bcc8c3ce6e93fc88bb41d7cc45a2b2e60adc60))
* add Cloudflare Workers remote deployment with 100% feature parity ([7dc57c3](https://github.com/dseeker/mcp-workflowy-remote/commit/7dc57c3f5d5d9edb64fb5cb665d634c333755db0))

## [0.1.6](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.1.5...v0.1.6) (2025-08-28)

## [0.1.5](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.1.4...v0.1.5) (2025-08-28)

# 0.1.4 (2025-08-28)


### Bug Fixes

* change worker build target from bun to browser for Cloudflare Workers compatibility ([4020e19](https://github.com/dseeker/mcp-workflowy-remote/commit/4020e19c83963daecd6b3e1633696911ac0c2087))
* improve server info test in deployment verification ([6dc469d](https://github.com/dseeker/mcp-workflowy-remote/commit/6dc469d69a36a2d996554c52b86335aa70bd697f))
* Invalid workflow file: .github/workflows/cloudflare-publish.yml ([300520b](https://github.com/dseeker/mcp-workflowy-remote/commit/300520b568aae8e886fc302cd90128ba2c5e55de))
* node and npm ci ([1b43ede](https://github.com/dseeker/mcp-workflowy-remote/commit/1b43ede8a8aa3612331e670a155c098d95eede27))
* resolve deployment job skip issue in GitHub Action ([69f718c](https://github.com/dseeker/mcp-workflowy-remote/commit/69f718c92101e904b2b5d2aa91ed2057cb9fd617))
* update repository URLs to point to correct repo ([0b32ed7](https://github.com/dseeker/mcp-workflowy-remote/commit/0b32ed7af8150eb7090ae2d703bcdc12b6d2f14d))


### Features

* add secure remote MCP server deployment to Cloudflare Workers ([4bfb47f](https://github.com/dseeker/mcp-workflowy-remote/commit/4bfb47f4c3c9a2c2e0a45941115c7e8126afb59e))
* implement Cloudflare MCP best practices and enhanced features ([d1849de](https://github.com/dseeker/mcp-workflowy-remote/commit/d1849dee2b22f805c0d26d8123b208f0ee624ea3))
* semantic versioning ([58f6e2d](https://github.com/dseeker/mcp-workflowy-remote/commit/58f6e2dd832a2dab24cceae795b1984a6ff0a969))
