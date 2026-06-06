// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title CreditEngine
/// @notice Computes encrypted credit lines using a weighted formula over FHE-encrypted inputs.
/// @dev Formula: ((repaymentScore * 3) + (collateralRatio * 2) + activityScore) / 6
contract CreditEngine {
    euint32 private THREE;
    euint32 private TWO;
    euint32 private ONE;
    euint32 private SIX;

    constructor() {
        THREE = FHE.asEuint32(3);
        TWO = FHE.asEuint32(2);
        ONE = FHE.asEuint32(1);
        SIX = FHE.asEuint32(6);
        FHE.allowThis(THREE);
        FHE.allowThis(TWO);
        FHE.allowThis(ONE);
        FHE.allowThis(SIX);
    }

    /// @notice Computes the weighted credit line from three encrypted input scores.
    /// @param repaymentScore Encrypted repayment score (weight: 3)
    /// @param collateralRatio Encrypted collateral ratio (weight: 2)
    /// @param activityScore Encrypted activity score (weight: 1)
    /// @return creditLine The encrypted weighted average credit line
    function computeCreditLine(
        euint32 repaymentScore,
        euint32 collateralRatio,
        euint32 activityScore
    ) external returns (euint32 creditLine) {
        // (repaymentScore * 3)
        euint32 weightedRepayment = FHE.mul(repaymentScore, THREE);
        // (collateralRatio * 2)
        euint32 weightedCollateral = FHE.mul(collateralRatio, TWO);
        // (repaymentScore * 3) + (collateralRatio * 2)
        euint32 sum = FHE.add(weightedRepayment, weightedCollateral);
        // (repaymentScore * 3) + (collateralRatio * 2) + activityScore
        sum = FHE.add(sum, activityScore);
        // Divide by 6 for weighted average
        creditLine = FHE.div(sum, SIX);

        FHE.allowThis(creditLine);
        FHE.allowSender(creditLine);
    }
}
