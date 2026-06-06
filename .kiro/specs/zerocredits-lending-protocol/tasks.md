# Implementation Plan: ZeroCredits Lending Protocol

## Overview

This plan implements a privacy-preserving lending protocol using Fhenix CoFHE FHE contracts, an MCP server for AI tool integration, and a Claude-powered agent for natural language interaction. All implementation builds on top of the existing cofhe-hardhat-starter project structure.

## Tasks

- [x] 1. Set up project structure and dependencies
  - [x] 1.1 Create directory structure
    - Create `contracts/core/`, `contracts/fhe/`, `mcp-server/`, and `frontend/` directories
    - Create `mcp-server/package.json` with `@modelcontextprotocol/sdk` and `ethers` dependencies
    - Add `@anthropic-ai/sdk` and `axios` to root `package.json` devDependencies
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_

  - [x] 1.2 Create environment configuration
    - Create `.env.example` with `PRIVATE_KEY` and `ANTHROPIC_API_KEY` placeholders
    - Verify `.env` is already in `.gitignore` (it is), add if missing
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. Implement CreditEngine contract
  - [x] 2.1 Create contracts/fhe/CreditEngine.sol
    - Implement constructor that creates encrypted constants (THREE, TWO, ONE, SIX) with FHE.allowThis
    - Implement `computeCreditLine(euint32 repaymentScore, euint32 collateralRatio, euint32 activityScore)` function
    - Formula: `((repaymentScore * 3) + (collateralRatio * 2) + activityScore) / 6`
    - Use FHE.mul, FHE.add, FHE.div for all arithmetic
    - Apply FHE.allowThis() and FHE.allowSender() on the result
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 2.2 Write property test for CreditEngine weighted formula
    - **Property 5: Credit line formula correctness (model-based)**
    - Generate random (repaymentScore, collateralRatio, activityScore) triples
    - Verify decrypted result matches plaintext `((r*3)+(c*2)+a)/6`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 4.2**

- [x] 3. Implement ZeroCreditLending contract
  - [x] 3.1 Create contracts/core/ZeroCreditLending.sol
    - Define private mappings: `encryptedDebt`, `encryptedCollateral`, `encryptedCreditScore` (all `mapping(address => euint32)`)
    - Implement constructor taking `address _creditEngine`, create ZERO constant with FHE.allowThis
    - Implement `originateLoan(InEuint32 calldata _amount)` — FHE.add to encryptedDebt, FHE.allowThis + FHE.allowSender
    - Implement `repay(InEuint32 calldata _amount)` — FHE.sub from encryptedDebt, FHE.allowThis + FHE.allowSender
    - Implement `depositCollateral(InEuint32 calldata _amount)` — FHE.add to encryptedCollateral, FHE.allowThis + FHE.allowSender
    - Implement `getHealthFactor(address user)` — FHE.div(collateral, debt), FHE.allowSender on result
    - Follow patterns from Counter.sol and core.md reference
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ]* 3.2 Write property tests for ZeroCreditLending
    - **Property 1: Loan origination increases debt by exact amount**
    - **Property 2: Repayment decreases debt by exact amount**
    - **Property 3: Collateral deposit increases collateral by exact amount**
    - **Property 4: Health factor equals collateral divided by debt**
    - Generate random uint32 amounts via fast-check
    - Use @cofhe/sdk createClientWithBatteries for encrypt/decrypt
    - Minimum 100 iterations per property
    - **Validates: Requirements 3.4, 3.5, 3.6, 3.7**

- [x] 4. Checkpoint - Contracts compile and tests pass
  - Ensure contracts compile with `npx hardhat compile`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement deployment task
  - [x] 5.1 Create tasks/deploy-zerocredits.ts
    - Create Hardhat task `deploy-zerocredits` following the pattern from `deploy-counter.ts`
    - Deploy CreditEngine first, await deployment
    - Deploy ZeroCreditLending with CreditEngine address as constructor arg
    - Call `saveDeployment(network.name, 'CreditEngine', address)` and `saveDeployment(network.name, 'ZeroCreditLending', address)`
    - Log both addresses to console
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 5.2 Register task in tasks/index.ts
    - Add `export * from './deploy-zerocredits'` to `tasks/index.ts`
    - _Requirements: 8.5_

- [x] 6. Implement MCP server
  - [x] 6.1 Create mcp-server/package.json and tools.json
    - Create `package.json` with name `zerocredits-mcp-server`, dependencies on `@modelcontextprotocol/sdk`, `ethers`
    - Create `tools.json` manifest with all 3 tool definitions (name, description, input_schema)
    - _Requirements: 5.6, 6.1, 6.2_

  - [x] 6.2 Create mcp-server/index.ts
    - Import Server from `@modelcontextprotocol/sdk/server/index.js` and StdioServerTransport from `@modelcontextprotocol/sdk/server/stdio.js`
    - Set up ethers.js provider and contract instance (load ABI from artifacts, address from deployments or env)
    - Implement `get_encrypted_health_factor` tool handler — calls `getHealthFactor(userAddress)` on contract
    - Implement `execute_confidential_repayment` tool handler — calls `repay(encryptedAmount)` on contract
    - Implement `originate_confidential_loan` tool handler — calls `originateLoan(encryptedAmount)` on contract
    - Register tools with the MCP server and start with StdioServerTransport
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Implement AI Agent
  - [x] 7.1 Create scripts/agent.ts
    - Import and initialize `@anthropic-ai/sdk` with API key from environment
    - Define the 3 MCP tool definitions matching tools.json schema
    - Accept natural language input (from command line args or stdin)
    - Call `anthropic.messages.create()` with tools and user message
    - Handle `tool_use` response blocks by routing to the appropriate contract function via ethers.js
    - Return final `text` block as natural language response
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Write contract tests
  - [x] 8.1 Create test/ZeroCredit.test.ts
    - Create `deployZeroCreditFixture` following Counter.test.ts pattern:
      - Run `task:cofhe-mocks:deploy`
      - Deploy CreditEngine, then ZeroCreditLending with CreditEngine address
      - Create client via `hre.cofhe.createClientWithBatteries(signer)`
    - Test 1: Encrypt amount, call `originateLoan()`, decrypt and verify debt equals amount
    - Test 2: Originate loan first, then encrypt repayment amount, call `repay()`, verify debt reduced
    - Test 3: Encrypt amount, call `depositCollateral()`, then `getHealthFactor()`, verify valid euint32 returned
    - Test 4: Encrypt three scores, call `computeCreditLine()`, decrypt and verify matches `((r*3)+(c*2)+a)/6`
    - Use `Encryptable.uint32()`, `FheTypes.Uint32`, `client.decryptForView().execute()`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 9. Checkpoint - Full test suite passes
  - Ensure all tests pass with `npx hardhat test`
  - Ensure contracts compile cleanly
  - Ensure deployment task runs on hardhat network
  - Ask the user if questions arise.

- [x] 10. MCP server local testing documentation
  - [x] 10.1 Create local testing instructions
    - Add instructions to README or a dedicated `mcp-server/README.md`
    - Document: start localcofhe with `npx hardhat localcofhe:start --clean true`
    - Document: deploy contracts with `npx hardhat deploy-zerocredits --network localcofhe`
    - Document: start MCP server with `node mcp-server/index.ts`
    - Document: test with an MCP client or pipe JSON-RPC to stdin
    - _Requirements: 11.1, 11.2_

- [x] 11. Final checkpoint - Everything integrated
  - Ensure all contracts compile
  - Ensure all tests pass
  - Ensure deployment task works
  - Ensure MCP server starts without errors
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- All contract code uses Solidity 0.8.28 with cancun EVM
- The correct FHE import is: `import "@fhenixprotocol/cofhe-contracts/FHE.sol";`
- Tests use @cofhe/sdk with `hre.cofhe.createClientWithBatteries()` for the mock environment
- Property-based tests use fast-check library (needs to be added to devDependencies)
- The MCP server has its own package.json and runs as a separate Node.js process
- The AI agent is a script, not a persistent server — handles one query per invocation

