# Requirements Document

## Introduction

ZeroCredits is a privacy-preserving, AI-driven lending protocol built on top of the Fhenix CoFHE platform. It uses Fully Homomorphic Encryption (FHE) to keep all sensitive financial data (debt, collateral, credit scores) encrypted on-chain while still performing meaningful computations. An AI agent communicates with the protocol through an MCP (Model Context Protocol) server, enabling natural language interactions with encrypted DeFi primitives.

## Glossary

- **ZeroCreditLending**: The core Solidity smart contract managing encrypted debt, collateral, and loan state for all users.
- **CreditEngine**: A Solidity smart contract that computes encrypted credit lines using a weighted formula over FHE-encrypted inputs.
- **MCP_Server**: A Node.js server implementing the Model Context Protocol, exposing on-chain lending functions as tools for AI agents.
- **AI_Agent**: A TypeScript script using the Anthropic SDK that accepts natural language input and routes actions to the MCP_Server tools.
- **FHE**: Fully Homomorphic Encryption — cryptographic technique allowing computation on encrypted data without decrypting it.
- **euint32**: An encrypted unsigned 32-bit integer type provided by the Fhenix CoFHE library.
- **InEuint32**: A calldata struct used to pass user-encrypted input values into FHE smart contracts.
- **Health_Factor**: The ratio of a user's encrypted collateral to their encrypted debt, computed entirely in FHE.
- **Credit_Line**: An encrypted score representing a user's borrowing capacity, computed by the CreditEngine using weighted FHE arithmetic.
- **Deploy_Task**: A Hardhat task that compiles and deploys smart contracts to the configured network.

## Requirements

### Requirement 1: Project Structure

**User Story:** As a developer, I want the project organized into clear directories for core contracts, FHE contracts, MCP server, and frontend, so that the codebase is maintainable and each concern is separated.

#### Acceptance Criteria

1. THE Project SHALL contain a `contracts/core/` directory for the main lending contract
2. THE Project SHALL contain a `contracts/fhe/` directory for the FHE credit engine contract
3. THE Project SHALL contain an `mcp-server/` directory with its own `package.json` for the MCP server
4. THE Project SHALL contain a `frontend/` directory for future UI integration

### Requirement 2: Dependencies

**User Story:** As a developer, I want the necessary packages installed, so that the AI agent, MCP server, and HTTP utilities are available for development.

#### Acceptance Criteria

1. THE Project SHALL include `@anthropic-ai/sdk` as a dependency for AI agent communication
2. THE Project SHALL include `@modelcontextprotocol/sdk` as a dependency in the mcp-server package for MCP protocol support
3. THE Project SHALL include `axios` as a dependency for HTTP calls

### Requirement 3: Core Lending Contract

**User Story:** As a borrower, I want to originate loans, repay debt, and deposit collateral with all my financial data kept encrypted, so that my positions are never publicly visible on-chain.

#### Acceptance Criteria

1. THE ZeroCreditLending SHALL store all user debt as `euint32` in an `encryptedDebt` mapping keyed by address
2. THE ZeroCreditLending SHALL store all user collateral as `euint32` in an `encryptedCollateral` mapping keyed by address
3. THE ZeroCreditLending SHALL store all user credit scores as `euint32` in an `encryptedCreditScore` mapping keyed by address
4. WHEN a user calls `originateLoan(InEuint32 calldata _amount)` THEN THE ZeroCreditLending SHALL add the encrypted amount to the user's `encryptedDebt` using FHE.add
5. WHEN a user calls `repay(InEuint32 calldata _amount)` THEN THE ZeroCreditLending SHALL subtract the encrypted amount from the user's `encryptedDebt` using FHE.sub
6. WHEN a user calls `depositCollateral(InEuint32 calldata _amount)` THEN THE ZeroCreditLending SHALL add the encrypted amount to the user's `encryptedCollateral` using FHE.add
7. WHEN a user calls `getHealthFactor(address user)` THEN THE ZeroCreditLending SHALL return an `euint32` representing the encrypted collateral divided by encrypted debt
8. THE ZeroCreditLending SHALL call `FHE.allowThis()` on all stored encrypted values to maintain contract access
9. THE ZeroCreditLending SHALL call `FHE.allowSender()` on returned or updated encrypted values to grant caller access

### Requirement 4: FHE Credit Engine

**User Story:** As a protocol operator, I want an on-chain credit scoring engine that computes credit lines using encrypted inputs, so that borrowing capacity is determined without revealing individual scores.

#### Acceptance Criteria

1. THE CreditEngine SHALL expose a `computeCreditLine(euint32 repaymentScore, euint32 collateralRatio, euint32 activityScore)` function
2. WHEN `computeCreditLine` is called THEN THE CreditEngine SHALL compute `((repaymentScore * 3) + (collateralRatio * 2) + activityScore) / 6` using FHE.mul, FHE.add, and FHE.div
3. THE CreditEngine SHALL return an `euint32` creditLine that is never publicly decryptable without authorization
4. THE CreditEngine SHALL call `FHE.allowThis()` and `FHE.allowSender()` on the computed creditLine to grant proper access

### Requirement 5: MCP Server

**User Story:** As an AI agent developer, I want an MCP server that exposes the lending protocol's functions as tools, so that AI agents can interact with encrypted on-chain state through a standard protocol.

#### Acceptance Criteria

1. THE MCP_Server SHALL use `@modelcontextprotocol/sdk` with `StdioServerTransport` for communication
2. THE MCP_Server SHALL expose a `get_encrypted_health_factor` tool that accepts a user address and calls `getHealthFactor()` on-chain
3. THE MCP_Server SHALL expose an `execute_confidential_repayment` tool that accepts a user address and encrypted amount and calls `repay()` on-chain
4. THE MCP_Server SHALL expose an `originate_confidential_loan` tool that accepts a user address and encrypted amount and calls `originateLoan()` on-chain
5. THE MCP_Server SHALL route all tool calls through ethers.js to the deployed ZeroCreditLending contract
6. THE MCP_Server SHALL have its own `package.json` in the `mcp-server/` directory

### Requirement 6: Tool Schemas

**User Story:** As an MCP client developer, I want a JSON manifest describing all available tools with their input schemas, so that clients can discover and validate tool parameters.

#### Acceptance Criteria

1. THE MCP_Server SHALL provide a `tools.json` file containing tool definitions for all three exposed tools
2. WHEN describing each tool THEN THE MCP_Server SHALL include `name`, `description`, and `input_schema` fields following JSON Schema format

### Requirement 7: AI Agent

**User Story:** As a user, I want to interact with the lending protocol using natural language, so that I can manage loans without understanding the underlying encrypted contract calls.

#### Acceptance Criteria

1. THE AI_Agent SHALL use `@anthropic-ai/sdk` to communicate with the Claude API
2. THE AI_Agent SHALL accept natural language input describing a lending action
3. THE AI_Agent SHALL pass the three MCP tool definitions to Claude via the `messages.create()` API
4. WHEN Claude responds with a `tool_use` block THEN THE AI_Agent SHALL route the tool call to the MCP_Server for execution
5. THE AI_Agent SHALL return a final natural language response summarizing the action taken

### Requirement 8: Deployment

**User Story:** As a deployer, I want a Hardhat task that deploys both contracts in the correct order, so that the protocol is ready for use on any supported network.

#### Acceptance Criteria

1. THE Deploy_Task SHALL deploy the CreditEngine contract first
2. THE Deploy_Task SHALL deploy the ZeroCreditLending contract with the CreditEngine address as a constructor argument
3. THE Deploy_Task SHALL log both deployed addresses to the console
4. THE Deploy_Task SHALL save both deployments using the existing `saveDeployment` utility
5. THE Deploy_Task SHALL follow the existing Hardhat task pattern used in `deploy-counter.ts`

### Requirement 9: Environment Configuration

**User Story:** As a developer, I want a documented environment file template, so that I know which secrets and API keys are required to run the project.

#### Acceptance Criteria

1. THE Project SHALL provide a `.env.example` file containing a `PRIVATE_KEY` placeholder
2. THE Project SHALL provide a `.env.example` file containing an `ANTHROPIC_API_KEY` placeholder
3. THE Project SHALL ensure `.env` is listed in `.gitignore`

### Requirement 10: Testing

**User Story:** As a developer, I want automated tests that verify loan origination, repayment, collateral deposit, health factor computation, and credit line calculation, so that I can confidently iterate on the protocol.

#### Acceptance Criteria

1. WHEN testing loan origination THEN THE test SHALL encrypt an amount using the CoFHE SDK, call `originateLoan()`, and verify the user's encrypted debt state is updated
2. WHEN testing repayment THEN THE test SHALL encrypt an amount, call `repay()`, and verify the user's encrypted debt is reduced
3. WHEN testing collateral deposit THEN THE test SHALL encrypt an amount, call `depositCollateral()`, then call `getHealthFactor()`, and verify a valid `euint32` is returned
4. WHEN testing credit line computation THEN THE test SHALL provide mock encrypted scores to `computeCreditLine()` and verify the result matches the expected weighted formula output
5. THE tests SHALL use `@cofhe/sdk` patterns including `hre.cofhe.createClientWithBatteries()`, `Encryptable`, and `FheTypes`
6. THE tests SHALL follow the deployment fixture pattern from `Counter.test.ts`

### Requirement 11: MCP Server Local Testing

**User Story:** As a developer, I want instructions and a script for testing the MCP server locally, so that I can validate tool execution without deploying to a live network.

#### Acceptance Criteria

1. THE Project SHALL include documentation or a script for starting and testing the MCP server locally
2. WHEN testing locally THEN THE MCP_Server SHALL connect to a local Hardhat network or localcofhe network

