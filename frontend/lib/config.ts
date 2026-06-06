export const CHAIN_CONFIG = {
  chainId: 11155111,
  chainName: "Ethereum Sepolia",
  rpcUrl: "https://rpc.sepolia.org",
  blockExplorer: "https://sepolia.etherscan.io",
  nativeCurrency: {
    name: "SepoliaETH",
    symbol: "ETH",
    decimals: 18,
  },
};

export const CONTRACT_ADDRESSES = {
  CreditEngine: "0x51C4b05abe0BDc1A2D6f53Ae0944EC272c28f619",
  ZeroCreditLending: "0x12bd31887C0853757B6D5DAB2e892D880E75887f",
  ZeroCreditFrontend: "0x5E6356B7F69c02E9d4012147B06d1Da4Ca715969",
  ZUSD: "0x0d209453Ec504Fb1c01DbB40D543B4B0650A598E",
} as const;

export const getEtherscanLink = (address: string) =>
  `${CHAIN_CONFIG.blockExplorer}/address/${address}`;

export const getTxLink = (hash: string) =>
  `${CHAIN_CONFIG.blockExplorer}/tx/${hash}`;
