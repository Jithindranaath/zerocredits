import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// --- Configuration ---

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is required.");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// --- Contract Setup ---

const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/core/ZeroCreditLending.sol/ZeroCreditLending.json"
);

function loadContractABI(): any[] {
  if (!fs.existsSync(artifactPath)) {
    console.error(
      "Error: Contract artifact not found. Run `npx hardhat compile` first."
    );
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  return artifact.abi;
}

function getContractAddress(): string {
  // First try environment variable
  if (process.env.ZEROCREDIT_CONTRACT_ADDRESS) {
    return process.env.ZEROCREDIT_CONTRACT_ADDRESS;
  }

  // Fall back to deployments file
  const network = process.env.NETWORK || "localcofhe";
  const deploymentsPath = path.join(
    __dirname,
    `../deployments/${network}.json`
  );

  if (fs.existsSync(deploymentsPath)) {
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
    if (deployments.ZeroCreditLending) {
      return deployments.ZeroCreditLending;
    }
  }

  throw new Error(
    "Contract address not found. Set ZEROCREDIT_CONTRACT_ADDRESS env var or deploy the contract first."
  );
}

function getContract(): ethers.Contract {
  const abi = loadContractABI();
  const address = getContractAddress();
  const rpcUrl = process.env.RPC_URL || "http://localhost:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  let signerOrProvider: ethers.Wallet | ethers.JsonRpcProvider = provider;
  if (process.env.PRIVATE_KEY) {
    signerOrProvider = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  }

  return new ethers.Contract(address, abi, signerOrProvider);
}

// --- Tool Definitions (Anthropic format) ---

const tools: Anthropic.Tool[] = [
  {
    name: "get_encrypted_health_factor",
    description:
      "Retrieves the encrypted health factor (collateral/debt ratio) for a user",
    input_schema: {
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
    input_schema: {
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
    input_schema: {
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

// --- Tool Execution ---

async function executeTool(
  name: string,
  input: Record<string, string>
): Promise<string> {
  const contract = getContract();

  switch (name) {
    case "get_encrypted_health_factor": {
      const { userAddress } = input;
      if (!ethers.isAddress(userAddress)) {
        return JSON.stringify({
          success: false,
          error: `Invalid Ethereum address: ${userAddress}`,
        });
      }

      const tx = await contract.getHealthFactor(userAddress);
      const receipt = await tx.wait();

      return JSON.stringify({
        success: true,
        userAddress,
        transactionHash: receipt.hash,
        message: `Health factor retrieved for ${userAddress}. The result is an encrypted euint32 value on-chain.`,
      });
    }

    case "execute_confidential_repayment": {
      const { userAddress, encryptedAmount } = input;
      if (!ethers.isAddress(userAddress)) {
        return JSON.stringify({
          success: false,
          error: `Invalid Ethereum address: ${userAddress}`,
        });
      }

      const inEuint32 = JSON.parse(encryptedAmount);
      const tx = await contract.repay(inEuint32);
      const receipt = await tx.wait();

      return JSON.stringify({
        success: true,
        userAddress,
        transactionHash: receipt.hash,
        message: `Confidential repayment executed for ${userAddress}.`,
      });
    }

    case "originate_confidential_loan": {
      const { userAddress, encryptedAmount } = input;
      if (!ethers.isAddress(userAddress)) {
        return JSON.stringify({
          success: false,
          error: `Invalid Ethereum address: ${userAddress}`,
        });
      }

      const inEuint32 = JSON.parse(encryptedAmount);
      const tx = await contract.originateLoan(inEuint32);
      const receipt = await tx.wait();

      return JSON.stringify({
        success: true,
        userAddress,
        transactionHash: receipt.hash,
        message: `Confidential loan originated for ${userAddress}.`,
      });
    }

    default:
      return JSON.stringify({
        success: false,
        error: `Unknown tool: ${name}`,
      });
  }
}

// --- Agent Loop ---

async function runAgent(userInput: string): Promise<string> {
  // Initial message to Claude with tools and user input
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userInput },
  ];

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    tools: tools,
    messages: messages,
  });

  // Agentic loop: handle tool_use blocks until we get a final text response
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ContentBlock & { type: "tool_use" } =>
        block.type === "tool_use"
    );

    // Execute each tool call and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      let result: string;
      try {
        result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, string>
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        result = JSON.stringify({
          success: false,
          error: `Tool execution failed: ${errorMessage}`,
        });
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    // Send tool results back to Claude
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools: tools,
      messages: messages,
    });
  }

  // Extract final text response
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  if (textBlocks.length > 0) {
    return textBlocks.map((block) => block.text).join("\n");
  }

  return "No response generated.";
}

// --- Entry Point ---

async function main() {
  const userInput = process.argv.slice(2).join(" ");

  if (!userInput) {
    console.error("Usage: npx ts-node scripts/agent.ts <your message>");
    console.error('Example: npx ts-node scripts/agent.ts "Check health factor for 0x123..."');
    process.exit(1);
  }

  try {
    const response = await runAgent(userInput);
    console.log(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`Agent error: ${errorMessage}`);
    process.exit(1);
  }
}

main();
