## [2.0.6](https://github.com/dseeker/mcp-workflowy-remote/compare/v2.0.5...v2.0.6) (2025-09-26)

## [2.0.5](https://github.com/dseeker/mcp-workflowy-remote/compare/v2.0.4...v2.0.5) (2025-09-26)

## [2.0.4](https://github.com/dseeker/mcp-workflowy-remote/compare/v2.0.3...v2.0.4) (2025-09-26)


### Bug Fixes

* Update wrangler.toml observability and config vars ([7daf5e0](https://github.com/dseeker/mcp-workflowy-remote/commit/7daf5e08cd0ae5502eee1ea757cd5d5a862a1c5d))

## [2.0.3](https://github.com/dseeker/mcp-workflowy-remote/compare/v2.0.2...v2.0.3) (2025-09-26)

## [2.0.2](https://github.com/dseeker/mcp-workflowy-remote/compare/v2.0.1...v2.0.2) (2025-09-26)


### Bug Fixes

* Add endpoints for Claude Desktop debug and OAuth registration ([d5b92c4](https://github.com/dseeker/mcp-workflowy-remote/commit/d5b92c4ad1e7c3b309b615e0400edc270f936f5a))

## [2.0.1](https://github.com/dseeker/mcp-workflowy-remote/compare/v2.0.0...v2.0.1) (2025-09-26)


### Bug Fixes

* Add MCP-level authentication for tool calls ([ecc047b](https://github.com/dseeker/mcp-workflowy-remote/commit/ecc047b290cd46ddca0562e71dbcc5b488e059f9))

# [2.0.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v1.1.0...v2.0.0) (2025-09-26)


### Bug Fixes

* Add support for authorization token in credential extraction ([4e06c53](https://github.com/dseeker/mcp-workflowy-remote/commit/4e06c5343c12e107f3a41a6f64c119dc2d6869e7))
* make GitHub Actions log parsing deployment-agnostic ([cf833eb](https://github.com/dseeker/mcp-workflowy-remote/commit/cf833ebd537118f7e7e8a30bac91c2ebfe33f782))
* rename project from mcp-workflowy to mcp-workflowy-remote and fix test failures ([efad2c6](https://github.com/dseeker/mcp-workflowy-remote/commit/efad2c6a3036866c58105511237c37a837ae27ed))
* resolve 429 rate limiting issues by removing redundant retry logic ([6b3e103](https://github.com/dseeker/mcp-workflowy-remote/commit/6b3e10348327c1aba5a9477c82b3aa725093e4aa))
* restore batch operations functionality after merge ([e104d1b](https://github.com/dseeker/mcp-workflowy-remote/commit/e104d1b99679be4eaf417205e9a4933fc8e572ad))


### Features

* Add robust retry logic and batch node creation to Workflowy tools ([5501798](https://github.com/dseeker/mcp-workflowy-remote/commit/5501798cc4297e55271db097a3608716523aeee7))
* integrate enhanced retry logic with upstream OAuth and metadata features ([8c02ff9](https://github.com/dseeker/mcp-workflowy-remote/commit/8c02ff9aba540334b866770d257f441eee2cc42c))
* restore local development changes after remote filter ([f4848e4](https://github.com/dseeker/mcp-workflowy-remote/commit/f4848e46b112b1e85eb1982f10dbce4e5daf2db5))


### BREAKING CHANGES

* Enhanced retry logic now uses ultra-persistent presets that may change operation timing behavior for rate-limited scenarios.

- Merge upstream OAuth 2.0 authentication (v0.10.7)
- Integrate enhanced retry logic with rate limiting
- Preserve batch operations with atomic transactions
- Add BATCH and RATE_LIMIT_PERSISTENT retry presets
- Enhance error handling with configurable OverloadError
- Maintain backwards compatibility for all MCP tools

This release combines the latest upstream features with our enhanced
retry infrastructure for production-grade rate limit handling.

# [1.1.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v1.0.1...v1.1.0) (2025-09-26)


### Bug Fixes

* make GitHub Actions log parsing deployment-agnostic ([f226ffa](https://github.com/dseeker/mcp-workflowy-remote/commit/f226ffa59301204e641e3fb2a5a1934a7e509540))
* resolve 429 rate limiting issues by removing redundant retry logic ([b679374](https://github.com/dseeker/mcp-workflowy-remote/commit/b6793748edd18027097ee7687db1c96aaeca5591))


### Features

* restore local development changes after remote filter ([f26195b](https://github.com/dseeker/mcp-workflowy-remote/commit/f26195bf3875e5ae9a5c7a9b4554344f6d17935c))

## [1.0.1](https://github.com/dseeker/mcp-workflowy-remote/compare/v1.0.0...v1.0.1) (2025-09-21)


### Bug Fixes

* rename project from mcp-workflowy to mcp-workflowy-remote and fix test failures ([9f87124](https://github.com/dseeker/mcp-workflowy-remote/commit/9f871247d68f70b2306c4343062266e503c58ad2))

# [1.0.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.8.2...v1.0.0) (2025-09-21)


### Bug Fixes

* add KV namespace creation to main deployment step ([a9f206a](https://github.com/dseeker/mcp-workflowy-remote/commit/a9f206ae65131e70c526089aacd0c29b5b442ff0))
* add version validation to deployment verification tests ([5b44d5f](https://github.com/dseeker/mcp-workflowy-remote/commit/5b44d5fa5071b87a2b43c6890b97ccd91e5f1117))
* correct OAuth provider library dependency ([1c80b3a](https://github.com/dseeker/mcp-workflowy-remote/commit/1c80b3a61c6a34ad869c546a4b055f689a954d6e))
* deploy worker before uploading secrets to avoid Cloudflare API error ([2deb3a5](https://github.com/dseeker/mcp-workflowy-remote/commit/2deb3a5de12931fc3b3d128d5da3e0bf2aabbcb6))
* improve error reporting in GitHub Actions deployment ([a493575](https://github.com/dseeker/mcp-workflowy-remote/commit/a49357504155ff35b4ec54d9ff4e489172e05f68))
* improve KV namespace detection and parsing in deployment ([6957664](https://github.com/dseeker/mcp-workflowy-remote/commit/695766418196bca76a804d3e6df68532cee4afd8))
* move OAuth endpoints before authentication check ([415b6f8](https://github.com/dseeker/mcp-workflowy-remote/commit/415b6f8753bce4fcc676c691543911e8a810aedb))
* pull semantic-release changes before production deployment ([ddf63d1](https://github.com/dseeker/mcp-workflowy-remote/commit/ddf63d14c962f2fe40a3662810c2f66b4f6973fd))
* remove global scope timer from RequestDeduplicator ([4030665](https://github.com/dseeker/mcp-workflowy-remote/commit/403066568cb1d634e146f2d7b67738b99ef3e314))
* resolve deployment issues and enhance log collection ([2690cac](https://github.com/dseeker/mcp-workflowy-remote/commit/2690cac52d3c78abfa2d8b3d6ab7ed860a3de9ff))
* resolve GitHub Actions deployment verification issues ([b7dd1cb](https://github.com/dseeker/mcp-workflowy-remote/commit/b7dd1cbef91cab8f635559832fa3c4f22a9d9ad1))
* resolve remaining bash syntax error in log statistics calculation ([dbe9cd9](https://github.com/dseeker/mcp-workflowy-remote/commit/dbe9cd934df53928fe300e9f2cf3d25223103176))
* resolve worker log collection issues in GitHub Actions ([119c7b7](https://github.com/dseeker/mcp-workflowy-remote/commit/119c7b7d66c7732df7ef418df21ec2a8482c7955))
* resolve wrangler PATH issue in log collection ([9d52348](https://github.com/dseeker/mcp-workflowy-remote/commit/9d523487db854d1479b7e96baa8c20d4263151fb))
* restore batch operations functionality after merge ([29ac070](https://github.com/dseeker/mcp-workflowy-remote/commit/29ac070c3e1bcbb00cde7a9f35d352c56ed0fb58))
* simplify deployment by removing problematic KV namespace detection ([834b281](https://github.com/dseeker/mcp-workflowy-remote/commit/834b281f7f5f96e29fbe619e21f2911da77367aa))
* update OAuth deployment wrangler commands to use new CLI syntax ([ad2411f](https://github.com/dseeker/mcp-workflowy-remote/commit/ad2411f203d07654f4f6e0a9e3565a56ffadaa10))
* update wrangler KV namespace commands to use new CLI syntax ([e745dd0](https://github.com/dseeker/mcp-workflowy-remote/commit/e745dd071c419466e238c3a48dd205e6d0069b19))
* use worker build from semantic-release for correct version ([87954bf](https://github.com/dseeker/mcp-workflowy-remote/commit/87954bfbbc5f681c7522356d3381d2706a611fdd))


### Features

* add Anthropic custom connector support with token-based authentication ([651b0ba](https://github.com/dseeker/mcp-workflowy-remote/commit/651b0ba74e25cc04b5b6e651df98734a5a469434))
* Add robust retry logic and batch node creation to Workflowy tools ([040c212](https://github.com/dseeker/mcp-workflowy-remote/commit/040c2125a21224fe137ecac3c75e244b301de052))
* comprehensive performance and resilience improvements with log collection ([9228c22](https://github.com/dseeker/mcp-workflowy-remote/commit/9228c22756d2127e92ec53429a9b96844b6b5727))
* enhance ADRs with Workflowy compound operations ([2f3e1c7](https://github.com/dseeker/mcp-workflowy-remote/commit/2f3e1c7047a73ead0329d1778d843d97430e4d1d))
* enhance remaining ADRs with compound operations ([143bcd3](https://github.com/dseeker/mcp-workflowy-remote/commit/143bcd3ea2719f01609f6a8cdd7012925caa12a9))
* enhance worker log collection with real-time output ([d36beca](https://github.com/dseeker/mcp-workflowy-remote/commit/d36becada47310586d8bfd1b5972a042633e2b4b))
* implement metadata hydration architecture in client and tools ([de0870e](https://github.com/dseeker/mcp-workflowy-remote/commit/de0870e6770b360d36764a0b75c0f9fcd8d02b3e))
* integrate enhanced retry logic with upstream OAuth and metadata features ([aad25ad](https://github.com/dseeker/mcp-workflowy-remote/commit/aad25ad405f740c46a95054a901aa81bad1d44ae))
* integrate OAuth 2.0 authentication directly into existing worker ([452f335](https://github.com/dseeker/mcp-workflowy-remote/commit/452f33595409d80e3808f6174dacc7e3c143eaf8))
* optimize worker log output for GitHub Actions readability ([32dc666](https://github.com/dseeker/mcp-workflowy-remote/commit/32dc6666f41cde89804edc7be657e3a9a12be608))


### Performance Improvements

* optimize post-deployment workflow for faster execution ([8cdfe4c](https://github.com/dseeker/mcp-workflowy-remote/commit/8cdfe4cd2575d66ea98cb0bda1bb3f8aea70be05))


### BREAKING CHANGES

* Enhanced retry logic now uses ultra-persistent presets that may change operation timing behavior for rate-limited scenarios.

- Merge upstream OAuth 2.0 authentication (v0.10.7)
- Integrate enhanced retry logic with rate limiting
- Preserve batch operations with atomic transactions
- Add BATCH and RATE_LIMIT_PERSISTENT retry presets
- Enhance error handling with configurable OverloadError
- Maintain backwards compatibility for all MCP tools

This release combines the latest upstream features with our enhanced
retry infrastructure for production-grade rate limit handling.

# [0.9.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.8.2...v0.9.0) (2025-09-21)


### Bug Fixes

* add KV namespace creation to main deployment step ([a9f206a](https://github.com/dseeker/mcp-workflowy-remote/commit/a9f206ae65131e70c526089aacd0c29b5b442ff0))
* add version validation to deployment verification tests ([5b44d5f](https://github.com/dseeker/mcp-workflowy-remote/commit/5b44d5fa5071b87a2b43c6890b97ccd91e5f1117))
* correct OAuth provider library dependency ([1c80b3a](https://github.com/dseeker/mcp-workflowy-remote/commit/1c80b3a61c6a34ad869c546a4b055f689a954d6e))
* deploy worker before uploading secrets to avoid Cloudflare API error ([2deb3a5](https://github.com/dseeker/mcp-workflowy-remote/commit/2deb3a5de12931fc3b3d128d5da3e0bf2aabbcb6))
* improve error reporting in GitHub Actions deployment ([a493575](https://github.com/dseeker/mcp-workflowy-remote/commit/a49357504155ff35b4ec54d9ff4e489172e05f68))
* improve KV namespace detection and parsing in deployment ([6957664](https://github.com/dseeker/mcp-workflowy-remote/commit/695766418196bca76a804d3e6df68532cee4afd8))
* move OAuth endpoints before authentication check ([415b6f8](https://github.com/dseeker/mcp-workflowy-remote/commit/415b6f8753bce4fcc676c691543911e8a810aedb))
* pull semantic-release changes before production deployment ([ddf63d1](https://github.com/dseeker/mcp-workflowy-remote/commit/ddf63d14c962f2fe40a3662810c2f66b4f6973fd))
* remove global scope timer from RequestDeduplicator ([4030665](https://github.com/dseeker/mcp-workflowy-remote/commit/403066568cb1d634e146f2d7b67738b99ef3e314))
* resolve deployment issues and enhance log collection ([2690cac](https://github.com/dseeker/mcp-workflowy-remote/commit/2690cac52d3c78abfa2d8b3d6ab7ed860a3de9ff))
* resolve GitHub Actions deployment verification issues ([b7dd1cb](https://github.com/dseeker/mcp-workflowy-remote/commit/b7dd1cbef91cab8f635559832fa3c4f22a9d9ad1))
* resolve remaining bash syntax error in log statistics calculation ([dbe9cd9](https://github.com/dseeker/mcp-workflowy-remote/commit/dbe9cd934df53928fe300e9f2cf3d25223103176))
* resolve worker log collection issues in GitHub Actions ([119c7b7](https://github.com/dseeker/mcp-workflowy-remote/commit/119c7b7d66c7732df7ef418df21ec2a8482c7955))
* resolve wrangler PATH issue in log collection ([9d52348](https://github.com/dseeker/mcp-workflowy-remote/commit/9d523487db854d1479b7e96baa8c20d4263151fb))
* restore batch operations functionality after merge ([29ac070](https://github.com/dseeker/mcp-workflowy-remote/commit/29ac070c3e1bcbb00cde7a9f35d352c56ed0fb58))
* simplify deployment by removing problematic KV namespace detection ([834b281](https://github.com/dseeker/mcp-workflowy-remote/commit/834b281f7f5f96e29fbe619e21f2911da77367aa))
* update OAuth deployment wrangler commands to use new CLI syntax ([ad2411f](https://github.com/dseeker/mcp-workflowy-remote/commit/ad2411f203d07654f4f6e0a9e3565a56ffadaa10))
* update wrangler KV namespace commands to use new CLI syntax ([e745dd0](https://github.com/dseeker/mcp-workflowy-remote/commit/e745dd071c419466e238c3a48dd205e6d0069b19))
* use worker build from semantic-release for correct version ([87954bf](https://github.com/dseeker/mcp-workflowy-remote/commit/87954bfbbc5f681c7522356d3381d2706a611fdd))


### Features

* add Anthropic custom connector support with token-based authentication ([651b0ba](https://github.com/dseeker/mcp-workflowy-remote/commit/651b0ba74e25cc04b5b6e651df98734a5a469434))
* Add robust retry logic and batch node creation to Workflowy tools ([040c212](https://github.com/dseeker/mcp-workflowy-remote/commit/040c2125a21224fe137ecac3c75e244b301de052))
* comprehensive performance and resilience improvements with log collection ([9228c22](https://github.com/dseeker/mcp-workflowy-remote/commit/9228c22756d2127e92ec53429a9b96844b6b5727))
* enhance ADRs with Workflowy compound operations ([2f3e1c7](https://github.com/dseeker/mcp-workflowy-remote/commit/2f3e1c7047a73ead0329d1778d843d97430e4d1d))
* enhance remaining ADRs with compound operations ([143bcd3](https://github.com/dseeker/mcp-workflowy-remote/commit/143bcd3ea2719f01609f6a8cdd7012925caa12a9))
* enhance worker log collection with real-time output ([d36beca](https://github.com/dseeker/mcp-workflowy-remote/commit/d36becada47310586d8bfd1b5972a042633e2b4b))
* implement metadata hydration architecture in client and tools ([de0870e](https://github.com/dseeker/mcp-workflowy-remote/commit/de0870e6770b360d36764a0b75c0f9fcd8d02b3e))
* integrate OAuth 2.0 authentication directly into existing worker ([452f335](https://github.com/dseeker/mcp-workflowy-remote/commit/452f33595409d80e3808f6174dacc7e3c143eaf8))
* optimize worker log output for GitHub Actions readability ([32dc666](https://github.com/dseeker/mcp-workflowy-remote/commit/32dc6666f41cde89804edc7be657e3a9a12be608))


### Performance Improvements

* optimize post-deployment workflow for faster execution ([8cdfe4c](https://github.com/dseeker/mcp-workflowy-remote/commit/8cdfe4cd2575d66ea98cb0bda1bb3f8aea70be05))

# [0.9.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.8.2...v0.9.0) (2025-09-21)


### Bug Fixes

* add KV namespace creation to main deployment step ([a9f206a](https://github.com/dseeker/mcp-workflowy-remote/commit/a9f206ae65131e70c526089aacd0c29b5b442ff0))
* add version validation to deployment verification tests ([5b44d5f](https://github.com/dseeker/mcp-workflowy-remote/commit/5b44d5fa5071b87a2b43c6890b97ccd91e5f1117))
* correct OAuth provider library dependency ([1c80b3a](https://github.com/dseeker/mcp-workflowy-remote/commit/1c80b3a61c6a34ad869c546a4b055f689a954d6e))
* deploy worker before uploading secrets to avoid Cloudflare API error ([2deb3a5](https://github.com/dseeker/mcp-workflowy-remote/commit/2deb3a5de12931fc3b3d128d5da3e0bf2aabbcb6))
* improve error reporting in GitHub Actions deployment ([a493575](https://github.com/dseeker/mcp-workflowy-remote/commit/a49357504155ff35b4ec54d9ff4e489172e05f68))
* improve KV namespace detection and parsing in deployment ([6957664](https://github.com/dseeker/mcp-workflowy-remote/commit/695766418196bca76a804d3e6df68532cee4afd8))
* move OAuth endpoints before authentication check ([415b6f8](https://github.com/dseeker/mcp-workflowy-remote/commit/415b6f8753bce4fcc676c691543911e8a810aedb))
* pull semantic-release changes before production deployment ([ddf63d1](https://github.com/dseeker/mcp-workflowy-remote/commit/ddf63d14c962f2fe40a3662810c2f66b4f6973fd))
* remove global scope timer from RequestDeduplicator ([4030665](https://github.com/dseeker/mcp-workflowy-remote/commit/403066568cb1d634e146f2d7b67738b99ef3e314))
* resolve deployment issues and enhance log collection ([2690cac](https://github.com/dseeker/mcp-workflowy-remote/commit/2690cac52d3c78abfa2d8b3d6ab7ed860a3de9ff))
* resolve GitHub Actions deployment verification issues ([b7dd1cb](https://github.com/dseeker/mcp-workflowy-remote/commit/b7dd1cbef91cab8f635559832fa3c4f22a9d9ad1))
* resolve remaining bash syntax error in log statistics calculation ([dbe9cd9](https://github.com/dseeker/mcp-workflowy-remote/commit/dbe9cd934df53928fe300e9f2cf3d25223103176))
* resolve worker log collection issues in GitHub Actions ([119c7b7](https://github.com/dseeker/mcp-workflowy-remote/commit/119c7b7d66c7732df7ef418df21ec2a8482c7955))
* resolve wrangler PATH issue in log collection ([9d52348](https://github.com/dseeker/mcp-workflowy-remote/commit/9d523487db854d1479b7e96baa8c20d4263151fb))
* simplify deployment by removing problematic KV namespace detection ([834b281](https://github.com/dseeker/mcp-workflowy-remote/commit/834b281f7f5f96e29fbe619e21f2911da77367aa))
* update OAuth deployment wrangler commands to use new CLI syntax ([ad2411f](https://github.com/dseeker/mcp-workflowy-remote/commit/ad2411f203d07654f4f6e0a9e3565a56ffadaa10))
* update wrangler KV namespace commands to use new CLI syntax ([e745dd0](https://github.com/dseeker/mcp-workflowy-remote/commit/e745dd071c419466e238c3a48dd205e6d0069b19))
* use worker build from semantic-release for correct version ([87954bf](https://github.com/dseeker/mcp-workflowy-remote/commit/87954bfbbc5f681c7522356d3381d2706a611fdd))


### Features

* add Anthropic custom connector support with token-based authentication ([651b0ba](https://github.com/dseeker/mcp-workflowy-remote/commit/651b0ba74e25cc04b5b6e651df98734a5a469434))
* Add robust retry logic and batch node creation to Workflowy tools ([040c212](https://github.com/dseeker/mcp-workflowy-remote/commit/040c2125a21224fe137ecac3c75e244b301de052))
* comprehensive performance and resilience improvements with log collection ([9228c22](https://github.com/dseeker/mcp-workflowy-remote/commit/9228c22756d2127e92ec53429a9b96844b6b5727))
* enhance ADRs with Workflowy compound operations ([2f3e1c7](https://github.com/dseeker/mcp-workflowy-remote/commit/2f3e1c7047a73ead0329d1778d843d97430e4d1d))
* enhance remaining ADRs with compound operations ([143bcd3](https://github.com/dseeker/mcp-workflowy-remote/commit/143bcd3ea2719f01609f6a8cdd7012925caa12a9))
* enhance worker log collection with real-time output ([d36beca](https://github.com/dseeker/mcp-workflowy-remote/commit/d36becada47310586d8bfd1b5972a042633e2b4b))
* implement metadata hydration architecture in client and tools ([de0870e](https://github.com/dseeker/mcp-workflowy-remote/commit/de0870e6770b360d36764a0b75c0f9fcd8d02b3e))
* integrate OAuth 2.0 authentication directly into existing worker ([452f335](https://github.com/dseeker/mcp-workflowy-remote/commit/452f33595409d80e3808f6174dacc7e3c143eaf8))
* optimize worker log output for GitHub Actions readability ([32dc666](https://github.com/dseeker/mcp-workflowy-remote/commit/32dc6666f41cde89804edc7be657e3a9a12be608))


### Performance Improvements

* optimize post-deployment workflow for faster execution ([8cdfe4c](https://github.com/dseeker/mcp-workflowy-remote/commit/8cdfe4cd2575d66ea98cb0bda1bb3f8aea70be05))

## [0.10.7](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.10.6...v0.10.7) (2025-09-16)


### Bug Fixes

* simplify deployment by removing problematic KV namespace detection ([7cd0d57](https://github.com/dseeker/mcp-workflowy-remote/commit/7cd0d571c7095c572d809c3ff499b554b0369b6a))

## [0.10.6](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.10.5...v0.10.6) (2025-09-16)


### Bug Fixes

* improve KV namespace detection and parsing in deployment ([833d293](https://github.com/dseeker/mcp-workflowy-remote/commit/833d2931ffd189e11b3fee79a85c7aa57da9128c))

## [0.10.5](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.10.4...v0.10.5) (2025-09-16)

## [0.10.4](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.10.3...v0.10.4) (2025-09-15)


### Bug Fixes

* update OAuth deployment wrangler commands to use new CLI syntax ([7991605](https://github.com/dseeker/mcp-workflowy-remote/commit/79916056e849e373df57e5508903c80bb8340e12))

## [0.10.3](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.10.2...v0.10.3) (2025-09-15)


### Bug Fixes

* update wrangler KV namespace commands to use new CLI syntax ([3db52bc](https://github.com/dseeker/mcp-workflowy-remote/commit/3db52bc9d527d0a58a731da6a02163878d3a8193))

## [0.10.2](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.10.1...v0.10.2) (2025-09-15)


### Bug Fixes

* add KV namespace creation to main deployment step ([a5453c4](https://github.com/dseeker/mcp-workflowy-remote/commit/a5453c43d4e54630a36ce50318eef5942e201f45))

## [0.10.1](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.10.0...v0.10.1) (2025-09-15)


### Bug Fixes

* move OAuth endpoints before authentication check ([b9e2cbc](https://github.com/dseeker/mcp-workflowy-remote/commit/b9e2cbc924f34fe416fce61a27ef74f50b86ef05))

# [0.10.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.9.1...v0.10.0) (2025-09-15)


### Bug Fixes

* correct OAuth provider library dependency ([d31c04f](https://github.com/dseeker/mcp-workflowy-remote/commit/d31c04f5d5307e5420aebfb994c7a6db965abd27))


### Features

* integrate OAuth 2.0 authentication directly into existing worker ([ccaf677](https://github.com/dseeker/mcp-workflowy-remote/commit/ccaf677c37ba965752a5c960c1f3f2971879b3f1))

## [0.9.1](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.9.0...v0.9.1) (2025-09-12)

# [0.9.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.8.3...v0.9.0) (2025-09-11)


### Features

* add Anthropic custom connector support with token-based authentication ([ca8203e](https://github.com/dseeker/mcp-workflowy-remote/commit/ca8203e48544c05ed23ef915c8f3a775c6c54985))

## [0.8.3](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.8.2...v0.8.3) (2025-09-01)

## [0.8.2](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.8.1...v0.8.2) (2025-09-01)

## [0.8.1](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.8.0...v0.8.1) (2025-09-01)

# [0.8.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.7.3...v0.8.0) (2025-09-01)


### Features

* enhance ADRs with Workflowy compound operations ([2a5c392](https://github.com/dseeker/mcp-workflowy-remote/commit/2a5c392df107d9e4921f7b3a40c2c4f6636cea56))
* enhance remaining ADRs with compound operations ([defa058](https://github.com/dseeker/mcp-workflowy-remote/commit/defa058b4b1a443ed025808f045597d846219dbc))
* implement metadata hydration architecture in client and tools ([71b0e81](https://github.com/dseeker/mcp-workflowy-remote/commit/71b0e81d27ee0fe282d83b94bc3979b594499c0f))

## [0.7.3](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.7.2...v0.7.3) (2025-08-30)


### Performance Improvements

* optimize post-deployment workflow for faster execution ([f23db29](https://github.com/dseeker/mcp-workflowy-remote/commit/f23db29b3945728d6fe5c5783d2d5b5dbd4a4979))

## [0.7.2](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.7.1...v0.7.2) (2025-08-30)


### Bug Fixes

* resolve remaining bash syntax error in log statistics calculation ([9f87d86](https://github.com/dseeker/mcp-workflowy-remote/commit/9f87d8646c97be8e61f6862ce982c637406b6bdc))

## [0.7.1](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.7.0...v0.7.1) (2025-08-30)


### Bug Fixes

* resolve deployment issues and enhance log collection ([b77e58f](https://github.com/dseeker/mcp-workflowy-remote/commit/b77e58f3045bb2704b523fd3e4f944d91605504b))

# [0.7.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.6.1...v0.7.0) (2025-08-30)


### Features

* optimize worker log output for GitHub Actions readability ([1afb939](https://github.com/dseeker/mcp-workflowy-remote/commit/1afb9395c8d4fcddbb4775033fde2345da39b509))

## [0.6.1](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.6.0...v0.6.1) (2025-08-30)


### Bug Fixes

* resolve worker log collection issues in GitHub Actions ([72d9004](https://github.com/dseeker/mcp-workflowy-remote/commit/72d9004b5e4d731181316cc308f7deaa9060dd26))

# [0.6.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.5.4...v0.6.0) (2025-08-30)


### Features

* enhance worker log collection with real-time output ([0b3dae7](https://github.com/dseeker/mcp-workflowy-remote/commit/0b3dae7110380200d5e7bd823fbc8cfeece5ca08))

## [0.5.4](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.5.3...v0.5.4) (2025-08-30)


### Bug Fixes

* resolve wrangler PATH issue in log collection ([d0395db](https://github.com/dseeker/mcp-workflowy-remote/commit/d0395dbafd91971b4d156400310868abab3bb663))

## [0.5.3](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.5.2...v0.5.3) (2025-08-30)


### Bug Fixes

* resolve GitHub Actions deployment verification issues ([876bb60](https://github.com/dseeker/mcp-workflowy-remote/commit/876bb604bb534a46a3b485e178306388410c9a39))

## [0.5.2](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.5.1...v0.5.2) (2025-08-30)


### Bug Fixes

* remove global scope timer from RequestDeduplicator ([39890ac](https://github.com/dseeker/mcp-workflowy-remote/commit/39890ac218c9fc696536af98b88e65f0edbab58e))

## [0.5.1](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.5.0...v0.5.1) (2025-08-30)


### Bug Fixes

* improve error reporting in GitHub Actions deployment ([94bdd10](https://github.com/dseeker/mcp-workflowy-remote/commit/94bdd1086306089c7f5323adbc0f5ee515e95ffe))

# [0.5.0](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.4.6...v0.5.0) (2025-08-30)


### Features

* comprehensive performance and resilience improvements with log collection ([2c68d74](https://github.com/dseeker/mcp-workflowy-remote/commit/2c68d74a2ade1a515bdd648c23086fe6977a70de))

## [0.4.6](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.4.5...v0.4.6) (2025-08-30)

## [0.4.5](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.4.4...v0.4.5) (2025-08-30)

## [0.4.4](https://github.com/dseeker/mcp-workflowy-remote/compare/v0.4.3...v0.4.4) (2025-08-30)


### Bug Fixes

* pull semantic-release changes before production deployment ([e5d6094](https://github.com/dseeker/mcp-workflowy-remote/commit/e5d60944f866f8e3cc35a4f3b38248d1fd2d9cda))

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
