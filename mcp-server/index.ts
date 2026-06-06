import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ethers } from "ethers";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Resolve paths relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load contract ABI from artifacts
const artifactPath = join(
  __dirname,
  "../artifacts/contracts/core/ZeroCreditLending.sol/ZeroCreditLending.json"
);
const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
const CONTRACT_ABI = artifact.abi;

// Load contract address from environment or deployments file
function getContractAddress(): string {
  // First try environment variable
  if (process.env.ZEROCREDIT_CONTRACT_ADDRESS) {
    return process.env.ZEROCREDIT_CONTRACT_ADDRESS;
  }

  // Fall back to deployments file
  const network = process.env.NETWORK || "localcofhe";
  const deploymentsPath = join(__dirname, `../deployments/${network}.json`);

  if (existsSync(deploymentsPath)) {
    const deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));
    if (deployments.ZeroCreditLending) {
      return deployments.ZeroCreditLending;
    }
  }

  throw new Error(
    "Contract address not found. Set ZEROCREDIT_CONTRACT_ADDRESS env var or deploy the contract first."
  );
}

// Set up ethers provider and signer
const rpcUrl = process.env.RPC_URL || "http://localhost:8545";
const provider = new ethers.JsonRpcProvider(rpcUrl);

let signer: ethers.Wallet | undefined;
if (process.env.PRIVATE_KEY) {
  signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
}

// Create contract instance (lazy — defers address resolution until first tool call)
function getContract(): ethers.Contract {
  const address = getContractAddress();
  const signerOrProvider = signer || provider;
  return new ethers.Contract(address, CONTRACT_ABI, signerOrProvider);
}

// Tool definitions matching tools.json schema
const TOOLS = [
  {
    name: "get_encrypted_health_factor",
    description:
      "Retrieves the encrypted health factor (collateral/debt ratio) for a user",
    inputSchema: {
      type: "object" as const,
      properties: {
        userAddress: {
          type: "string",
          description: "Ethereum address of the user",
        },
      },
      required: ["userAddress"],
    },
  },
  {
    name: "execute_confidential_repayment",
    description: "Executes an encrypted repayment to reduce a user's debt",
    inputSchema: {
      type: "object" as const,
      properties: {
        userAddress: {
          type: "string",
          description: "Ethereum address of the user",
        },
        encryptedAmount: {
          type: "string",
          description: "Encrypted repayment amount",
        },
      },
      required: ["userAddress", "encryptedAmount"],
    },
  },
  {
    name: "originate_confidential_loan",
    description: "Originates a new encrypted loan for a user",
    inputSchema: {
      type: "object" as const,
      properties: {
        userAddress: {
          type: "string",
          description: "Ethereum address of the user",
        },
        encryptedAmount: {
          type: "string",
          description: "Encrypted loan amount",
        },
      },
      required: ["userAddress", "encryptedAmount"],
    },
  },
];

// Create MCP server instance
const server = new Server(
  {
    name: "zerocredits-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools/list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Register tools/call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const contract = getContract();

    switch (name) {
      case "get_encrypted_health_factor": {
        const userAddress = (args as Record<string, string>)?.userAddress;

        if (!ethers.isAddress(userAddress)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Invalid Ethereum address: ${userAddress}`,
              },
            ],
            isError: true,
          };
        }

        const tx = await contract.getHealthFactor(userAddress);
        const receipt = await tx.wait();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                userAddress,
                transactionHash: receipt.hash,
                message: `Health factor retrieved for ${userAddress}. The result is an encrypted euint32 value on-chain.`,
              }),
            },
          ],
        };
      }

      case "execute_confidential_repayment": {
        const userAddress = (args as Record<string, string>)?.userAddress;
        const encryptedAmount = (args as Record<string, string>)
          ?.encryptedAmount;

        if (!ethers.isAddress(userAddress)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Invalid Ethereum address: ${userAddress}`,
              },
            ],
            isError: true,
          };
        }

        // The encryptedAmount is expected to be a JSON-encoded InEuint32 struct
        const inEuint32 = JSON.parse(encryptedAmount);
        const tx = await contract.repay(inEuint32);
        const receipt = await tx.wait();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                userAddress,
                transactionHash: receipt.hash,
                message: `Confidential repayment executed for ${userAddress}.`,
              }),
            },
          ],
        };
      }

      case "originate_confidential_loan": {
        const userAddress = (args as Record<string, string>)?.userAddress;
        const encryptedAmount = (args as Record<string, string>)
          ?.encryptedAmount;

        if (!ethers.isAddress(userAddress)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Invalid Ethereum address: ${userAddress}`,
              },
            ],
            isError: true,
          };
        }

        // The encryptedAmount is expected to be a JSON-encoded InEuint32 struct
        const inEuint32 = JSON.parse(encryptedAmount);
        const tx = await contract.originateLoan(inEuint32);
        const receipt = await tx.wait();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                userAddress,
                transactionHash: receipt.hash,
                message: `Confidential loan originated for ${userAddress}.`,
              }),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `Error executing ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ZeroCredits MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});
