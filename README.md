# Financial Research MCP Server

[![npm version](https://img.shields.io/npm/v/@financial-research/mcp-server.svg)](https://www.npmjs.com/package/@financial-research/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

Model Context Protocol (MCP) server for the **Nvidia Computer Ledger** financial research system. Provides AI agents with access to a curated financial knowledge graph, research tools, and development utilities.

## Features

- 🧠 **Financial Research** - RAG-powered research with Nemotron 3 Ultra streaming
- 📊 **Knowledge Graph Access** - 17 entity types, cross-references, gap analysis
- 🛠️ **Dev Tools** - Terminal execution, API testing, build/test automation
- 🔐 **Secure** - Header-based auth, rate limiting, audit logging
- 🌐 **Dual Transport** - stdio (Claude Desktop) + HTTP+SSE (Web)
- 📚 **5 Research Modes** - General, Chat, Code, Plan, Check

## Quick Start

### Prerequisites
- Node.js 20+
- NVIDIA API Key from [build.nvidia.com](https://build.nvidia.com)

### Installation

```bash
# Global install
npm install -g @financial-research/mcp-server

# Or use npx (recommended)
npx @financial-research/mcp-server
```

### Configuration

Create `.env.local`:
```bash
# Required
NVIDIA_API_KEY=nvapi-your-key-here

# Optional: Enable dev tools
ENABLE_DEV_PAGE=true
DEV_API_TOKEN=$(openssl rand -hex 32)

# Optional: HTTP server
MCP_HTTP_PORT=3011
MCP_CORS_ORIGINS=http://localhost:5174,http://127.0.0.1:5174,http://localhost:5180,http://127.0.0.1:5180
```

### Run

```bash
# Stdio mode (Claude Desktop, Cursor)
npx @financial-research/mcp-server

# HTTP + SSE mode (Web clients)
npx @financial-research/mcp-server-http
```

## Claude Desktop Setup

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "financial-research": {
      "command": "npx",
      "args": ["@financial-research/mcp-server"],
      "env": {
        "NVIDIA_API_KEY": "nvapi-your-key",
        "ENABLE_DEV_PAGE": "true",
        "DEV_API_TOKEN": "your-secure-token"
      }
    }
  }
}
```

## Available Capabilities

### Tools (12)
| Tool | Description | Auth |
|------|-------------|------|
| `financial.research` | RAG + streaming research | No |
| `financial.entity.search` | Search entities | No |
| `financial.entity.get` | Get entity by ID | No |
| `financial.entity.list` | List entities with filters | No |
| `financial.crossref.check` | Validate cross-references | No |
| `financial.gaps.analyze` | Research gaps analysis | No |
| `system.health.check` | 6 deterministic checks | No |
| `system.config.get` | Masked env config | ✅ |
| `terminal.execute` | Allow-listed commands | ✅ |
| `api.test` | HTTP endpoint tester | ✅ |
| `dev.build` | Run npm build | ✅ |
| `dev.test` | Run npm test | ✅ |

### Resources (22)
- 17 entity types (`financial://entities/{type}`)
- `financial://config` - Masked env config
- `financial://logs/ai` - AI chat logs
- `financial://logs/terminal` - Terminal logs
- `financial://schema` - Combined schemas

### Prompts (5)
- `financial.research.general` - General research
- `financial.research.chat` - Conversational Q&A
- `financial.research.code` - Engineering help
- `financial.research.plan` - Strategic planning
- `financial.research.check` - Evidence audits

## Architecture

```
src/mcp/
├── index.ts              # Stdio entry
├── http.ts               # HTTP+SSE entry
├── server.ts             # Core server
├── capabilities.ts       # Registration
├── errors.ts             # Error codes
├── auth.ts               # Header auth
├── rate-limiter.ts       # Token bucket
├── audit-logger.ts       # JSONL logging
├── tools/                # 12 tools
├── resources/            # 22 resources
├── prompts/              # 5 prompts
├── transport/            # stdio + HTTP+SSE
├── schema/               # Zod → JSON Schema
└── reuse/                # Existing code adapters
```

## Development

```bash
# Install dependencies
npm ci

# Build
npm run build:mcp

# Test
npm run test:mcp          # Unit + integration
npm run test:mcp:e2e      # E2E with Claude Desktop

# Lint
npm run lint:mcp

# Publish
npm publish
```

## Security

- **Auth**: `X-Dev-Token` header for dev tools
- **Rate Limit**: 10 req/min per IP (dev tools)
- **Audit Log**: JSONL structured logging
- **Command Allow-list**: Only 7 pre-approved commands
- **CSP Headers**: Applied when `ENABLE_DEV_PAGE=true`

## License

MIT License - see [LICENSE](../LICENSE)

## Credits

- NVIDIA Nemotron 3 Ultra
- Model Context Protocol SDK
- OpenCode TUI
- Astryx Design System
