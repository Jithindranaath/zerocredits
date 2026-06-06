# ZeroCredits

**Privacy-Preserving, AI-Driven Lending Protocol on Fhenix**

ZeroCredits is a DeFi lending protocol where all financial data — debt, collateral, credit scores, and health factors — is encrypted on-chain using Fully Homomorphic Encryption (FHE). Nobody can read your financial data, not even blockchain validators. An AI agent powered by the Model Context Protocol (MCP) enables natural language interaction with the encrypted protocol.

## What Makes This Different

| Traditional DeFi | ZeroCredits |
|------------------|-------------|
| Debt balances visible on Etherscan | Debt stored as encrypted `euint32` handles |
| MEV bots can front-run liquidations | Positions are invisible to observers |
| Credit scores are public | Scores computed on encrypted data |
| Anyone can see your positions | Only you (and the admin) can decrypt |

## Architecture

```
User (natural language)
    │
    ▼
AI Agent (Groq LLM + MCP Tools)
    │
    ▼
ZeroCreditFrontend Contract (Sepolia)
    │
    ▼
FHE Operations (CoFHE Coprocessor)
    │
    ▼
Encrypted State (euint32 handles on-chain)
```

**Key Flow:**
1. User enters a loan amount in the frontend
2. Amount is encrypted via FHE (`FHE.asEuint32`)
3. Encrypted amount is added to encrypted debt (`FHE.add`)
4. Result stored as an opaque handle — nobody can read the actual number
5. Owner can selectively decrypt via a 3-step threshold process

## Project Structure

```
ZeroCredits/
├── contracts/
│   ├── core/
│   │   ├── ZeroCreditLending.sol    # Main lending contract (FHE state)
│   │   ├── ZeroCreditFrontend.sol   # Demo helper (plaintext → on-chain encryption)
│   │   └── ZUSD.sol                 # Test ERC20 token
│   ├── fhe/
│   │   └── CreditEngine.sol         # Weighted credit line computation via FHE
│   └── test/
│       └── CreditEngineHelper.sol   # Test helper for cross-contract FHE calls
├── frontend/                         # Next.js 14 dashboard
│   ├── app/
│   │   ├── page.tsx                 # Main dashboard
│   │   ├── layout.tsx               # Root layout with RainbowKit
│   │   └── api/chat/route.ts       # AI agent API (Groq + real contract execution)
│   ├── components/
│   │   ├── LoanPanel.tsx            # Originate loan with MetaMask
│   │   ├── RepayPanel.tsx           # Repay debt
│   │   ├── HealthFactor.tsx         # Compute encrypted health factor
│   │   ├── CreditScore.tsx          # Credit line from on-chain history
│   │   ├── OwnerDecrypt.tsx         # Admin decryption panel
│   │   ├── AiChat.tsx               # AI chat interface
│   │   ├── ZusdBalance.tsx          # ZUSD token balance + faucet
│   │   ├── WalletConnect.tsx        # RainbowKit wallet connection
│   │   └── Providers.tsx            # wagmi + RainbowKit providers
│   └── lib/
│       ├── config.ts                # Contract addresses, chain config
│       ├── contracts.ts             # ABIs, ethers helpers
│       └── wagmi.ts                 # wagmi/RainbowKit config
├── mcp-server/                       # MCP server (stdio-based)
│   ├── index.ts                     # Server entry point
│   ├── tools.json                   # Tool schema manifest
│   └── README.md                    # Local testing instructions
├── scripts/
│   └── agent.ts                     # CLI AI agent (standalone)
├── tasks/
│   ├── deploy-zerocredits.ts        # Deploy CreditEngine + ZeroCreditLending
│   ├── deploy-zusd.ts               # Deploy ZUSD token
│   └── ...                          # Other Hardhat tasks
├── test/
│   ├── ZeroCredit.test.ts           # FHE lending tests (16 passing)
│   └── Counter.test.ts              # Original counter tests
├── hardhat.config.ts                 # Hardhat config with CoFHE plugin
└── .env.example                      # Environment template
```

## How FHE is Used

| Category | What Happens | Example |
|----------|-------------|---------|
| **Encrypted Storage** | All financial state stored as `euint32` | `mapping(address => euint32) private encryptedDebt` |
| **Encrypted Input** | Users encrypt amounts before sending | `FHE.asEuint32(amount)` |
| **Encrypted Arithmetic** | Math on ciphertext | `FHE.add(debt, amount)`, `FHE.div(collateral, debt)` |
| **Access Control** | Granular decryption permissions | `FHE.allowSender()`, `FHE.allow(value, owner)` |
| **Threshold Decryption** | Multi-step reveal process | `allowPublic → SDK decrypt → publishDecryptResult` |

## Use Cases

1. **Just-in-Time Loans** — Borrow instantly based on encrypted credit score, no collateral required
2. **Private Credit Scoring** — Score computed from on-chain history (nonce, balance) via weighted FHE formula
3. **Confidential Debt Management** — Repay debt without anyone knowing your balance
4. **AI-Powered Interaction** — Natural language commands routed to encrypted contract operations
5. **Selective Disclosure** — Owner can audit specific users through threshold decryption

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm (package manager)
- MetaMask browser extension
- Sepolia ETH for gas ([sepoliafaucet.com](https://sepoliafaucet.com))

### Installation

```bash
# Clone the repo
git clone https://github.com/Jithindranaath/zerocredits.git
cd zerocredits

# Install root dependencies
pnpm install

# Install frontend dependencies
cd frontend
pnpm install
cd ..

# Install MCP server dependencies
cd mcp-server
pnpm install
cd ..
```

### Environment Setup

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env`:
```env
PRIVATE_KEY=0xyour_private_key_here
ETHERSCAN_API_KEY=your_etherscan_key
```

Create `frontend/.env.local`:
```env
GROQ_API_KEY=your_groq_api_key_from_console.groq.com
PRIVATE_KEY=0xyour_private_key_here
RPC_URL=https://sepolia.drpc.org
```

### Compile & Test

```bash
# Compile all Solidity contracts
npx hardhat compile

# Run all tests (16 passing)
npx hardhat test
```

### Deploy to Sepolia

```bash
# Deploy CreditEngine + ZeroCreditLending
npx hardhat deploy-zerocredits --network eth-sepolia

# Deploy ZUSD token
npx hardhat deploy-zusd --network eth-sepolia
```

### Run the Frontend

```bash
cd frontend
pnpm run dev
# Open http://localhost:3000
```

### Run the AI Agent (CLI)

```bash
npx ts-node scripts/agent.ts "Originate a loan of 5000 for 0xYourAddress"
```

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| CreditEngine | `0x51C4b05abe0BDc1A2D6f53Ae0944EC272c28f619` |
| ZeroCreditLending | `0x12bd31887C0853757B6D5DAB2e892D880E75887f` |
| ZeroCreditFrontend | `0x5E6356B7F69c02E9d4012147B06d1Da4Ca715969` |
| ZUSD Token | `0x0d209453Ec504Fb1c01DbB40D543B4B0650A598E` |

All contracts are verified on [Sepolia Etherscan](https://sepolia.etherscan.io/address/0x12bd31887C0853757B6D5DAB2e892D880E75887f#code).

## Demo Workflow

1. **Connect Wallet** — RainbowKit modal, switch to Sepolia
2. **Get ZUSD** — Click faucet button to mint test tokens
3. **Originate Loan** — Enter amount → MetaMask confirms → FHE encrypts on-chain
4. **Repay Debt** — Enter amount → encrypted subtraction from debt
5. **Compute Health Factor** — FHE division (collateral ÷ debt) on-chain
6. **Credit Line** — Click "Calculate from History" → reads real nonce/balance → FHE weighted formula
7. **AI Chat** — Type natural language → AI calls MCP tools → real Sepolia transactions
8. **Owner Decrypt** — 3-step threshold decryption (admin only)

## Tech Stack

- **Blockchain**: Ethereum Sepolia (with Fhenix CoFHE coprocessor)
- **FHE Library**: `@fhenixprotocol/cofhe-contracts` (euint32, FHE.add/sub/mul/div)
- **Smart Contracts**: Solidity 0.8.25, Hardhat, TypeScript
- **Frontend**: Next.js 14, Tailwind CSS, RainbowKit, ethers.js v6
- **AI Agent**: Groq (Llama 3.3 70B) with MCP tool calling
- **Testing**: Mocha + Chai + @cofhe/sdk mock infrastructure

## Privacy Guarantees

- All state variables use FHE types (`euint32`) — no plain `uint256`
- No debt, collateral, or credit scores are ever publicly readable
- Access control via `FHE.allowThis/allowSender/allow` — granular permissions
- Owner decryption requires 3 separate transactions (threshold process)
- AI chat enforces access control — only your own credit score is visible to you

## License

MIT
