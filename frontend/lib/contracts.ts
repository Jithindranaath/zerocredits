import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "./config";

// ZeroCreditLending ABI (relevant functions only)
export const ZERO_CREDIT_LENDING_ABI = [
  // State
  "function owner() view returns (address)",
  "function creditEngine() view returns (address)",

  // User functions
  "function originateLoan(tuple(bytes data, int32 securityZone) _amount) external",
  "function repay(tuple(bytes data, int32 securityZone) _amount) external",
  "function depositCollateral(tuple(bytes data, int32 securityZone) _amount) external",
  "function getHealthFactor(address user) external returns (uint256)",

  // Owner decryption functions (Step 1 - allowDecryption)
  "function allowDebtDecryption(address user) external",
  "function allowCollateralDecryption(address user) external",
  "function allowCreditScoreDecryption(address user) external",

  // Owner decryption functions (Step 3 - publish result)
  "function publishDebtDecryptResult(address user, uint32 plaintext, bytes signature) external",
  "function publishCollateralDecryptResult(address user, uint32 plaintext, bytes signature) external",
  "function publishCreditScoreDecryptResult(address user, uint32 plaintext, bytes signature) external",

  // Read decrypted results
  "function getDecryptedDebt(address user) view returns (uint32)",
  "function getDecryptedCollateral(address user) view returns (uint32)",
  "function getDecryptedCreditScore(address user) view returns (uint32)",

  // Safe read (check availability)
  "function tryGetDecryptedDebt(address user) view returns (uint32 value, bool isReady)",
  "function tryGetDecryptedCollateral(address user) view returns (uint32 value, bool isReady)",
  "function tryGetDecryptedCreditScore(address user) view returns (uint32 value, bool isReady)",
];

// CreditEngine ABI
export const CREDIT_ENGINE_ABI = [
  "function computeCreditLine(uint256 repaymentScore, uint256 collateralRatio, uint256 activityScore) external returns (uint256)",
];

// ZeroCreditFrontend ABI (demo helper - accepts plaintext, encrypts on-chain)
export const ZERO_CREDIT_FRONTEND_ABI = [
  "function demoOriginateLoan(uint32 amount) external",
  "function demoRepay(uint32 amount) external",
  "function demoDepositCollateral(uint32 amount) external",
  "function demoComputeHealthFactor() external",
  "function demoComputeCreditLine(uint32 repaymentScore, uint32 collateralRatio, uint32 activityScore) external",
  "function demoAllowDecryption() external",
  "function owner() view returns (address)",
  "event LoanOriginated(address indexed user, uint32 amount)",
  "event DebtRepaid(address indexed user, uint32 amount)",
  "event CollateralDeposited(address indexed user, uint32 amount)",
  "event HealthFactorComputed(address indexed user)",
  "event CreditLineComputed(address indexed user)",
  "event DecryptionAllowed(address indexed owner)",
];

export function getFrontendContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.ZeroCreditFrontend,
    ZERO_CREDIT_FRONTEND_ABI,
    signerOrProvider
  );
}

export function getProvider() {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum);
  }
  return null;
}

export async function getSigner() {
  const provider = getProvider();
  if (!provider) throw new Error("No wallet detected");
  return provider.getSigner();
}

export function getLendingContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.ZeroCreditLending,
    ZERO_CREDIT_LENDING_ABI,
    signerOrProvider
  );
}

export function getCreditEngineContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.CreditEngine,
    CREDIT_ENGINE_ABI,
    signerOrProvider
  );
}

// Simulate FHE encryption for demo purposes
// In production, this would use the CoFHE SDK to encrypt client-side
export function simulateEncryption(value: number): { data: string; securityZone: number } {
  // Generate a fake ciphertext that looks like encrypted data
  const fakeCtBytes = ethers.randomBytes(32);
  // Encode the value into the first 4 bytes so it "looks" encrypted
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint32"],
    [value]
  );
  // Combine to simulate InEuint32 struct
  const data = ethers.hexlify(
    ethers.concat([encoded, fakeCtBytes])
  );
  return { data, securityZone: 0 };
}

// Generate a simulated encrypted handle (hex string) for display
export function generateEncryptedHandle(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}
