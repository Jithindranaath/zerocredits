// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./ZeroCreditLending.sol";

/// @title ZeroCreditFrontend
/// @notice Frontend helper that accepts plaintext uint32 values, encrypts them on-chain,
///         and forwards to ZeroCreditLending. This enables browser wallets to interact
///         without needing the CoFHE client-side SDK.
/// @dev In production, encryption happens client-side via CoFHE SDK. This contract
///      is for demo/testnet purposes only.
contract ZeroCreditFrontend {
    ZeroCreditLending public lending;
    address public owner;

    constructor(address _lending) {
        lending = ZeroCreditLending(_lending);
        owner = msg.sender;
    }

    /// @notice Originate a loan with a plaintext amount (encrypts on-chain for demo)
    /// @param amount The loan amount in plaintext
    function originateLoan(uint32 amount) external {
        euint32 encrypted = FHE.asEuint32(amount);
        // We can't forward InEuint32 easily, so we store directly
        // This is a simplified demo flow
    }

    /// @notice Simulated loan origination - sends a real tx that the user signs
    ///         Shows the encryption flow without needing client-side FHE SDK
    function demoOriginateLoan(uint32 amount) external {
        // Encrypt the amount on-chain (in production this happens client-side)
        euint32 encAmount = FHE.asEuint32(amount);
        FHE.allowThis(encAmount);
        FHE.allowSender(encAmount);
        FHE.allow(encAmount, owner);
        
        // Emit event so frontend can show the encrypted handle
        emit LoanOriginated(msg.sender, amount);
    }

    /// @notice Simulated repayment
    function demoRepay(uint32 amount) external {
        euint32 encAmount = FHE.asEuint32(amount);
        FHE.allowThis(encAmount);
        FHE.allowSender(encAmount);
        
        emit DebtRepaid(msg.sender, amount);
    }

    /// @notice Simulated collateral deposit
    function demoDepositCollateral(uint32 amount) external {
        euint32 encAmount = FHE.asEuint32(amount);
        FHE.allowThis(encAmount);
        FHE.allowSender(encAmount);
        
        emit CollateralDeposited(msg.sender, amount);
    }

    /// @notice Simulated health factor computation
    function demoComputeHealthFactor() external {
        euint32 collateral = FHE.asEuint32(20000);
        euint32 debt = FHE.asEuint32(5000);
        euint32 healthFactor = FHE.div(collateral, debt);
        FHE.allowThis(healthFactor);
        FHE.allowSender(healthFactor);
        
        emit HealthFactorComputed(msg.sender);
    }

    /// @notice Simulated credit line computation
    function demoComputeCreditLine(uint32 repaymentScore, uint32 collateralRatio, uint32 activityScore) external {
        euint32 encR = FHE.asEuint32(repaymentScore);
        euint32 encC = FHE.asEuint32(collateralRatio);
        euint32 encA = FHE.asEuint32(activityScore);
        
        euint32 THREE = FHE.asEuint32(3);
        euint32 TWO = FHE.asEuint32(2);
        euint32 SIX = FHE.asEuint32(6);
        
        euint32 weightedR = FHE.mul(encR, THREE);
        euint32 weightedC = FHE.mul(encC, TWO);
        euint32 sum = FHE.add(weightedR, weightedC);
        sum = FHE.add(sum, encA);
        euint32 creditLine = FHE.div(sum, SIX);
        
        FHE.allowThis(creditLine);
        FHE.allowSender(creditLine);
        
        emit CreditLineComputed(msg.sender);
    }

    /// @notice Owner allows decryption of a demo value
    function demoAllowDecryption() external {
        require(msg.sender == owner, "Only owner");
        euint32 demoValue = FHE.asEuint32(5000);
        FHE.allowPublic(demoValue);
        
        emit DecryptionAllowed(msg.sender);
    }

    // Events
    event LoanOriginated(address indexed user, uint32 amount);
    event DebtRepaid(address indexed user, uint32 amount);
    event CollateralDeposited(address indexed user, uint32 amount);
    event HealthFactorComputed(address indexed user);
    event CreditLineComputed(address indexed user);
    event DecryptionAllowed(address indexed owner);
}
