// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title ZUSD - ZeroCredits USD Stablecoin
/// @notice A simple ERC20 token for the ZeroCredits testnet demo.
///         Users can mint freely via the faucet for testing purposes.
contract ZUSD is ERC20 {
    constructor() ERC20("ZeroCredits USD", "ZUSD") {}

    /// @notice Free faucet for testnet demo - anyone can mint tokens to themselves
    /// @param amount The amount of ZUSD to mint (in wei, 18 decimals)
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    /// @notice Mint tokens to a specific address (used by lending contract or server)
    /// @param to The address to receive tokens
    /// @param amount The amount of ZUSD to mint
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
