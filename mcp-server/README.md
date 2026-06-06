# ZeroCredits MCP Server

An MCP (Model Context Protocol) server that exposes the ZeroCredits lending protocol's on-chain functions as AI-consumable tools. It communicates over stdio using JSON-RPC, allowing AI agents to interact with encrypted DeFi state through a standard protocol.

## Prerequisites

- **Node.js** >= 18
- **pnpm** (package manager)
- **Compiled contracts** — the server loads the `ZeroCreditLending` ABI from `artifacts/`
- **Deployed contracts** — either via a deployment file in `deployments/` or a manual contract address

Make sure you've installed dependencies and compiled at the project root:

```bash
pnpm install
npx hardhat compile
```

And inside the `mcp-server/` directory:

```bash
cd mcp-server
pnpm install
```

## Environment Variables

The MCP server reads the following environment variables (can be set in the root `.env` file):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PRIVATE_KEY` | Yes (for write operations) | — | Private key of the signer wallet |
| `RPC_URL` | No | `http://localhost:8545` | JSON-RPC endpoint of the target network |
| `NETWORK` | No | `localcofhe` | Network name used to locate `deployments/<network>.json` |
| `ZEROCREDIT_CONTRACT_ADDRESS` | No | — | Override: explicit contract address (skips deployment file lookup) |
| `ANTHROPIC_API_KEY` | Only for agent script | — | Required if testing via `scripts/agent.ts` |

Create a `.env` file in the project root (see `.env.example`):

```env
PRIVATE_KEY=your_private_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Local Testing Workflow

### Step 1: Start the local CoFHE network

This spins up a local Hardhat node with FHE mock support:

```bash
npx hardhat localcofhe:start --clean true
```

Wait until you see the node is ready (accounts listed, listening on `http://localhost:8545`).

### Step 2: Deploy contracts

In a separate terminal, deploy both `CreditEngine` and `ZeroCreditLending` to the local network:

```bash
npx hardhat deploy-zerocredits --network localcofhe
```

This saves the deployed addresses to `deployments/localcofhe.json`. The MCP server will automatically pick them up from there.

### Step 3: Start the MCP server

```bash
cd mcp-server
npx tsx index.ts
```

The server runs on **stdio** (standard input/output) using JSON-RPC. You'll see a message on stderr:

```
ZeroCredits MCP Server running on stdio
```

The server is now ready to receive JSON-RPC requests on stdin and respond on stdout.

### Step 4: Test the server

You can test using any of the following methods:

#### Option A: Pipe JSON-RPC messages to stdin

Send raw MCP protocol messages directly:

```bash
# List available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | cd mcp-server && npx tsx index.ts
```

Or interactively:

```bash
cd mcp-server
npx tsx index.ts
```

Then type JSON-RPC messages line by line:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
```

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_encrypted_health_factor","arguments":{"userAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}}}
```

#### Option B: Test with the AI agent script

The `scripts/agent.ts` script connects to Claude and routes tool calls directly to the contract (same logic as the MCP server). This validates the full round-trip:

```bash
npx ts-node scripts/agent.ts "Check the health factor for 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
```

```bash
npx ts-node scripts/agent.ts "Originate a loan of 1000 for 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
```

> **Note:** The agent script requires a valid `ANTHROPIC_API_KEY` in your `.env`.

#### Option C: Use an MCP client library

You can write a quick test client using the MCP SDK:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "index.ts"],
  cwd: "./mcp-server",
});

const client = new Client({ name: "test-client", version: "1.0.0" }, {});
await client.connect(transport);

// List tools
const tools = await client.listTools();
console.log(tools);

// Call a tool
const result = await client.callTool({
  name: "get_encrypted_health_factor",
  arguments: { userAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
});
console.log(result);
```

## Connecting Claude Desktop (or other MCP clients)

To use the ZeroCredits MCP server with Claude Desktop, add it to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "zerocredits": {
      "command": "npx",
      "args": ["tsx", "index.ts"],
      "cwd": "/absolute/path/to/cofhe-hardhat-starter/mcp-server",
      "env": {
        "PRIVATE_KEY": "your_private_key_here",
        "RPC_URL": "http://localhost:8545",
        "NETWORK": "localcofhe"
      }
    }
  }
}
```

After adding this config and restarting Claude Desktop, the three ZeroCredits tools will appear in Claude's tool list:

- **get_encrypted_health_factor** — retrieve a user's encrypted collateral/debt ratio
- **execute_confidential_repayment** — execute an encrypted repayment
- **originate_confidential_loan** — originate a new encrypted loan

## Available Tools

| Tool | Description | Inputs |
|------|-------------|--------|
| `get_encrypted_health_factor` | Retrieves the encrypted health factor for a user | `userAddress` (string) |
| `execute_confidential_repayment` | Executes an encrypted repayment | `userAddress` (string), `encryptedAmount` (string) |
| `originate_confidential_loan` | Originates a new encrypted loan | `userAddress` (string), `encryptedAmount` (string) |

Full tool schemas are defined in [`tools.json`](./tools.json).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Contract artifact not found` | Run `npx hardhat compile` from the project root |
| `Contract address not found` | Deploy first with `npx hardhat deploy-zerocredits --network localcofhe` or set `ZEROCREDIT_CONTRACT_ADDRESS` |
| `Connection refused on port 8545` | Make sure `npx hardhat localcofhe:start --clean true` is running |
| `PRIVATE_KEY not set` | Add your private key to `.env` (use a Hardhat test account for local dev) |
