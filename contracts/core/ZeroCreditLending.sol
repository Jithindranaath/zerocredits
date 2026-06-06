// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title ZeroCreditLending
/// @notice Privacy-preserving lending protocol using FHE to keep all financial state encrypted on-chain.
/// @dev All debt, collateral, and credit score values are stored as euint32 encrypted types.
contract ZeroCreditLending {
    // State - all encrypted
    mapping(address => euint32) private encryptedDebt;
    mapping(address => euint32) private encryptedCollateral;
    mapping(address => euint32) private encryptedCreditScore;

    // Reference to the credit engine
    address public creditEngine;

    // Owner for administrative decryption
    address public owner;

    // Encrypted zero constant for initial FHE operations
    euint32 private ZERO;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _creditEngine) {
        creditEngine = _creditEngine;
        owner = msg.sender;
        ZERO = FHE.asEuint32(0);
        FHE.allowThis(ZERO);
    }

    /// @notice Originate a new loan by adding the encrypted amount to the user's debt.
    /// @param _amount The encrypted loan amount provided by the user.
    function originateLoan(InEuint32 calldata _amount) external {
        euint32 amount = FHE.asEuint32(_amount);
        euint32 currentDebt = encryptedDebt[msg.sender];

        // Handle uninitialized mapping (zero handle) by using ZERO constant
        if (euint32.unwrap(currentDebt) == 0) {
            currentDebt = ZERO;
        }

        euint32 newDebt = FHE.add(currentDebt, amount);
        encryptedDebt[msg.sender] = newDebt;

        FHE.allowThis(newDebt);
        FHE.allowSender(newDebt);
        FHE.allow(newDebt, owner); // Owner can decrypt user debt
    }

    /// @notice Repay debt by subtracting the encrypted amount from the user's debt.
    /// @param _amount The encrypted repayment amount provided by the user.
    function repay(InEuint32 calldata _amount) external {
        euint32 amount = FHE.asEuint32(_amount);
        euint32 currentDebt = encryptedDebt[msg.sender];

        // Handle uninitialized mapping (zero handle) by using ZERO constant
        if (euint32.unwrap(currentDebt) == 0) {
            currentDebt = ZERO;
        }

        euint32 newDebt = FHE.sub(currentDebt, amount);
        encryptedDebt[msg.sender] = newDebt;

        FHE.allowThis(newDebt);
        FHE.allowSender(newDebt);
        FHE.allow(newDebt, owner); // Owner can decrypt user debt
    }

    /// @notice Deposit collateral by adding the encrypted amount to the user's collateral.
    /// @param _amount The encrypted collateral amount provided by the user.
    function depositCollateral(InEuint32 calldata _amount) external {
        euint32 amount = FHE.asEuint32(_amount);
        euint32 currentCollateral = encryptedCollateral[msg.sender];

        // Handle uninitialized mapping (zero handle) by using ZERO constant
        if (euint32.unwrap(currentCollateral) == 0) {
            currentCollateral = ZERO;
        }

        euint32 newCollateral = FHE.add(currentCollateral, amount);
        encryptedCollateral[msg.sender] = newCollateral;

        FHE.allowThis(newCollateral);
        FHE.allowSender(newCollateral);
        FHE.allow(newCollateral, owner); // Owner can decrypt user collateral
    }

    /// @notice Compute the health factor for a user (collateral / debt).
    /// @dev Not a view function because FHE operations are stateful.
    /// @param user The address of the user to compute the health factor for.
    /// @return healthFactor The encrypted health factor (collateral divided by debt).
    function getHealthFactor(address user) external returns (euint32 healthFactor) {
        euint32 collateral = encryptedCollateral[user];
        euint32 debt = encryptedDebt[user];

        // Handle uninitialized mappings
        if (euint32.unwrap(collateral) == 0) {
            collateral = ZERO;
        }
        if (euint32.unwrap(debt) == 0) {
            debt = ZERO;
        }

        healthFactor = FHE.div(collateral, debt);

        FHE.allowThis(healthFactor);
        FHE.allowSender(healthFactor);
        FHE.allow(healthFactor, owner);
    }

    // ========== OWNER DECRYPTION FUNCTIONS ==========
    // Decryption in CoFHE follows a 3-step process:
    // 1. allowPublic(value) — grant public decryption permission on-chain
    // 2. Off-chain: SDK decryptForTx(ctHash).withoutPermit().execute() — get plaintext + signature
    // 3. publishDecryptResult(value, plaintext, signature) — store result on-chain
    // After step 3, getDecryptResult/getDecryptResultSafe can retrieve plaintext on-chain.

    /// @notice Owner grants public decryption permission for a user's debt (Step 1)
    /// @param user The address whose debt to allow decryption of
    function allowDebtDecryption(address user) external onlyOwner {
        euint32 debt = encryptedDebt[user];
        require(euint32.unwrap(debt) != 0, "No debt data for user");
        FHE.allowPublic(debt);
    }

    /// @notice Owner publishes the decrypted debt value on-chain (Step 3)
    /// @dev Called after off-chain decryption via the CoFHE SDK
    /// @param user The address whose debt was decrypted
    /// @param plaintext The decrypted plaintext value
    /// @param signature The threshold network signature proving correctness
    function publishDebtDecryptResult(address user, uint32 plaintext, bytes memory signature) external onlyOwner {
        euint32 debt = encryptedDebt[user];
        FHE.publishDecryptResult(debt, plaintext, signature);
    }

    /// @notice Read the decrypted debt value after publishDecryptResult was called
    /// @param user The address whose debt to read
    function getDecryptedDebt(address user) external view returns (uint32) {
        euint32 debt = encryptedDebt[user];
        return FHE.getDecryptResult(debt);
    }

    /// @notice Safely check if debt decryption result is available
    /// @param user The address whose debt to check
    function tryGetDecryptedDebt(address user) external view returns (uint32 value, bool isReady) {
        euint32 debt = encryptedDebt[user];
        if (euint32.unwrap(debt) == 0) {
            return (0, false);
        }
        (value, isReady) = FHE.getDecryptResultSafe(debt);
    }

    /// @notice Owner grants public decryption permission for a user's collateral (Step 1)
    /// @param user The address whose collateral to allow decryption of
    function allowCollateralDecryption(address user) external onlyOwner {
        euint32 collateral = encryptedCollateral[user];
        require(euint32.unwrap(collateral) != 0, "No collateral data for user");
        FHE.allowPublic(collateral);
    }

    /// @notice Owner publishes the decrypted collateral value on-chain (Step 3)
    /// @param user The address whose collateral was decrypted
    /// @param plaintext The decrypted plaintext value
    /// @param signature The threshold network signature proving correctness
    function publishCollateralDecryptResult(address user, uint32 plaintext, bytes memory signature) external onlyOwner {
        euint32 collateral = encryptedCollateral[user];
        FHE.publishDecryptResult(collateral, plaintext, signature);
    }

    /// @notice Read the decrypted collateral value after publishDecryptResult was called
    /// @param user The address whose collateral to read
    function getDecryptedCollateral(address user) external view returns (uint32) {
        euint32 collateral = encryptedCollateral[user];
        return FHE.getDecryptResult(collateral);
    }

    /// @notice Safely check if collateral decryption result is available
    /// @param user The address whose collateral to check
    function tryGetDecryptedCollateral(address user) external view returns (uint32 value, bool isReady) {
        euint32 collateral = encryptedCollateral[user];
        if (euint32.unwrap(collateral) == 0) {
            return (0, false);
        }
        (value, isReady) = FHE.getDecryptResultSafe(collateral);
    }

    /// @notice Owner grants public decryption permission for a user's credit score (Step 1)
    /// @param user The address whose credit score to allow decryption of
    function allowCreditScoreDecryption(address user) external onlyOwner {
        euint32 score = encryptedCreditScore[user];
        require(euint32.unwrap(score) != 0, "No credit score for user");
        FHE.allowPublic(score);
    }

    /// @notice Owner publishes the decrypted credit score on-chain (Step 3)
    /// @param user The address whose credit score was decrypted
    /// @param plaintext The decrypted plaintext value
    /// @param signature The threshold network signature proving correctness
    function publishCreditScoreDecryptResult(address user, uint32 plaintext, bytes memory signature) external onlyOwner {
        euint32 score = encryptedCreditScore[user];
        FHE.publishDecryptResult(score, plaintext, signature);
    }

    /// @notice Read the decrypted credit score after publishDecryptResult was called
    /// @param user The address whose credit score to read
    function getDecryptedCreditScore(address user) external view returns (uint32) {
        euint32 score = encryptedCreditScore[user];
        return FHE.getDecryptResult(score);
    }

    /// @notice Safely check if credit score decryption result is available
    /// @param user The address whose credit score to check
    function tryGetDecryptedCreditScore(address user) external view returns (uint32 value, bool isReady) {
        euint32 score = encryptedCreditScore[user];
        if (euint32.unwrap(score) == 0) {
            return (0, false);
        }
        (value, isReady) = FHE.getDecryptResultSafe(score);
    }
}
