// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface ICreditEngine {
    function computeCreditLine(
        euint32 repaymentScore,
        euint32 collateralRatio,
        euint32 activityScore
    ) external returns (euint32 creditLine);
}

/// @title CreditEngineHelper
/// @notice Test helper that wraps CreditEngine.computeCreditLine with InEuint32 inputs
/// @dev Only used in tests to bridge encrypted client inputs to euint32 params
contract CreditEngineHelper {
    address public creditEngine;

    constructor(address _creditEngine) {
        creditEngine = _creditEngine;
    }

    function computeCreditLine(
        InEuint32 calldata _repaymentScore,
        InEuint32 calldata _collateralRatio,
        InEuint32 calldata _activityScore
    ) external returns (euint32) {
        euint32 repaymentScore = FHE.asEuint32(_repaymentScore);
        euint32 collateralRatio = FHE.asEuint32(_collateralRatio);
        euint32 activityScore = FHE.asEuint32(_activityScore);

        // Grant CreditEngine permission to use these handles
        FHE.allow(repaymentScore, creditEngine);
        FHE.allow(collateralRatio, creditEngine);
        FHE.allow(activityScore, creditEngine);

        euint32 result = ICreditEngine(creditEngine).computeCreditLine(
            repaymentScore,
            collateralRatio,
            activityScore
        );

        FHE.allowThis(result);
        FHE.allowSender(result);

        return result;
    }
}
