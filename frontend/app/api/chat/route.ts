import { NextRequest, NextResponse } from "next/server";

const GROK_API_KEY = process.env.GROQ_API_KEY;
const GROK_BASE_URL = "https://api.groq.com/openai/v1";

const tools = [
  {
    type: "function",
    function: {
      name: "get_encrypted_health_factor",
      description: "Retrieves the encrypted health factor (collateral/debt ratio) for a user. This triggers an FHE division (collateral ÷ debt) on encrypted on-chain data.",
      parameters: {
        type: "object",
        properties: {
          userAddress: { type: "string", description: "Ethereum address of the user" },
        },
        required: ["userAddress"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_confidential_repayment",
      description: "Executes an encrypted repayment to reduce a user's debt. The amount is encrypted via FHE before being subtracted from on-chain encrypted debt.",
      parameters: {
        type: "object",
        properties: {
          userAddress: { type: "string", description: "Ethereum address of the user" },
          amount: { type: "number", description: "Repayment amount in tokens" },
        },
        required: ["userAddress", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "originate_confidential_loan",
      description: "Originates a new encrypted loan for a user. The loan amount is encrypted via FHE and added to the user's on-chain encrypted debt.",
      parameters: {
        type: "object",
        properties: {
          userAddress: { type: "string", description: "Ethereum address of the user" },
          amount: { type: "number", description: "Loan amount in tokens" },
        },
        required: ["userAddress", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compute_credit_line",
      description: "Computes a user's encrypted credit line using the weighted formula: ((repaymentScore × 3) + (collateralRatio × 2) + activityScore) / 6. All arithmetic is done on encrypted data via FHE.",
      parameters: {
        type: "object",
        properties: {
          repaymentScore: { type: "number", description: "Repayment reliability score (0-100)" },
          collateralRatio: { type: "number", description: "Collateral ratio score (0-100)" },
          activityScore: { type: "number", description: "On-chain activity score (0-100)" },
        },
        required: ["repaymentScore", "collateralRatio", "activityScore"],
      },
    },
  },
];

// Simulate tool execution results (in production, these would call the actual contract)
function executeToolCall(name: string, input: Record<string, any>): string {
  const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const encHandle = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  switch (name) {
    case "get_encrypted_health_factor":
      return JSON.stringify({
        success: true,
        userAddress: input.userAddress,
        transactionHash: txHash,
        encryptedResult: encHandle,
        message: `Health factor computed for ${input.userAddress}. Result is encrypted euint32 on-chain (FHE.div(collateral, debt)). Encrypted handle: ${encHandle.slice(0, 20)}...`,
      });
    case "execute_confidential_repayment":
      return JSON.stringify({
        success: true,
        userAddress: input.userAddress,
        amount: input.amount,
        transactionHash: txHash,
        message: `Repayment of ${input.amount} tokens executed. Amount was encrypted via FHE before on-chain subtraction from encrypted debt. Tx: ${txHash.slice(0, 20)}...`,
      });
    case "originate_confidential_loan":
      return JSON.stringify({
        success: true,
        userAddress: input.userAddress,
        amount: input.amount,
        transactionHash: txHash,
        message: `Loan of ${input.amount} tokens originated. Amount encrypted via FHE and added to on-chain encrypted debt. Tx: ${txHash.slice(0, 20)}...`,
      });
    case "compute_credit_line":
      const expected = Math.floor((input.repaymentScore * 3 + input.collateralRatio * 2 + input.activityScore) / 6);
      return JSON.stringify({
        success: true,
        transactionHash: txHash,
        encryptedResult: encHandle,
        message: `Credit line computed using FHE weighted formula. All 5 arithmetic operations (2× mul, 2× add, 1× div) executed on encrypted data. Expected plaintext result: ${expected}. Encrypted handle: ${encHandle.slice(0, 20)}...`,
      });
    default:
      return JSON.stringify({ success: false, error: `Unknown tool: ${name}` });
  }
}

export async function POST(request: NextRequest) {
  if (!GROK_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not set in environment. Add it to frontend/.env.local" },
      { status: 500 }
    );
  }

  const { message } = await request.json();

  try {
    const messages: any[] = [
      {
        role: "system",
        content: "You are an AI assistant for ZeroCredits, a privacy-preserving lending protocol on Fhenix blockchain. All financial data (debt, collateral, credit scores) is encrypted using Fully Homomorphic Encryption (FHE). When users ask about loans, repayments, health factors, or credit lines, use the available tools. Always mention that the operations happen on encrypted data and that no plaintext values are visible on-chain. Be concise and helpful.",
      },
      { role: "user", content: message },
    ];

    let toolCalls: any[] = [];

    // First call to Grok
    let response = await fetch(`${GROK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        tools: tools,
        tool_choice: "auto",
      }),
    });

    let data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ error: data.error.message || JSON.stringify(data.error) }, { status: 500 });
    }
    
    let assistantMsg = data.choices?.[0]?.message;

    // Agentic loop: handle tool calls
    while (assistantMsg?.tool_calls && assistantMsg.tool_calls.length > 0) {
      messages.push(assistantMsg);

      for (const toolCall of assistantMsg.tool_calls) {
        const fnName = toolCall.function.name;
        const fnArgs = JSON.parse(toolCall.function.arguments);
        const result = executeToolCall(fnName, fnArgs);

        toolCalls.push({
          name: fnName,
          input: fnArgs,
          result: JSON.parse(result),
        });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Call again with tool results
      response = await fetch(`${GROK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: messages,
          tools: tools,
          tool_choice: "auto",
        }),
      });

      data = await response.json();
      if (data.error) {
        return NextResponse.json({ error: data.error.message || JSON.stringify(data.error) }, { status: 500 });
      }
      assistantMsg = data.choices?.[0]?.message;
    }

    const finalText = assistantMsg?.content || 
      (toolCalls.length > 0 
        ? `✅ Executed ${toolCalls.length} tool${toolCalls.length > 1 ? 's' : ''}: ${toolCalls.map(t => t.name).join(', ')}. ${toolCalls.map(t => t.result.message || '').join(' ')}`
        : "No response generated.");

    return NextResponse.json({
      response: finalText,
      toolCalls: toolCalls,
    });
  } catch (error: any) {
    console.error("Chat API error:", JSON.stringify(error));
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
