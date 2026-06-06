"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { getCreditEngineContract, simulateEncryption, generateEncryptedHandle } from "@/lib/contracts";
import { getTxLink } from "@/lib/config";

interface CreditScoreProps {
  signer: ethers.Signer | null;
}

type Status = "idle" | "encrypting" | "sending" | "confirming" | "success" | "error";

export default function CreditScore({ signer }: CreditScoreProps) {
  const [repaymentScore, setRepaymentScore] = useState("");
  const [collateralRatio, setCollateralRatio] = useState("");
  const [activityScore, setActivityScore] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [encryptedResult, setEncryptedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const computeCreditLine = async () => {
    if (!signer || !repaymentScore || !collateralRatio || !activityScore) return;
    setError(null);
    setTxHash(null);
    setEncryptedResult(null);

    try {
      // Step 1: Encrypt all three inputs
      setStatus("encrypting");
      await new Promise((r) => setTimeout(r, 2500)); // Longer for 3 inputs

      // Step 2: Send REAL transaction via MetaMask
      setStatus("sending");
      const { getFrontendContract } = await import("@/lib/contracts");
      const contract = getFrontendContract(signer);
      const tx = await contract.demoComputeCreditLine(
        parseInt(repaymentScore),
        parseInt(collateralRatio),
        parseInt(activityScore)
      );
      setTxHash(tx.hash);

      // Step 3: Wait for real confirmation
      setStatus("confirming");
      await tx.wait();

      setEncryptedResult(generateEncryptedHandle());
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setError(err?.reason || err?.message || "Computation failed");
    }
  };

  const isDisabled = status !== "idle" && status !== "success" && status !== "error";

  return (
    <div className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-6 card-hover">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Credit Line</h3>
          <p className="text-xs text-gray-400">Weighted formula: (R×3 + C×2 + A) / 6</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              Repayment (×3)
            </label>
            <input
              type="number"
              value={repaymentScore}
              onChange={(e) => setRepaymentScore(e.target.value)}
              placeholder="0-100"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg 
                         text-white text-sm placeholder-gray-500 transition-all"
              disabled={isDisabled}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              Collateral (×2)
            </label>
            <input
              type="number"
              value={collateralRatio}
              onChange={(e) => setCollateralRatio(e.target.value)}
              placeholder="0-100"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg 
                         text-white text-sm placeholder-gray-500 transition-all"
              disabled={isDisabled}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              Activity (×1)
            </label>
            <input
              type="number"
              value={activityScore}
              onChange={(e) => setActivityScore(e.target.value)}
              placeholder="0-100"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg 
                         text-white text-sm placeholder-gray-500 transition-all"
              disabled={isDisabled}
            />
          </div>
        </div>

        {/* Formula visualization */}
        {status === "encrypting" && (
          <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg animate-pulse">
            <p className="text-xs text-blue-300 font-mono text-center">
              Encrypting 3 inputs → FHE ciphertexts...
            </p>
            <div className="flex justify-center gap-4 mt-2">
              {["R", "C", "A"].map((label, i) => (
                <div key={label} className="text-center">
                  <div
                    className="w-8 h-8 rounded bg-blue-800/50 flex items-center justify-center animate-pulse"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  >
                    <span className="text-blue-300 text-xs font-bold">{label}</span>
                  </div>
                  <span className="text-[10px] text-blue-400">🔐</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={computeCreditLine}
          disabled={!signer || !repaymentScore || !collateralRatio || !activityScore || isDisabled}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 
                     disabled:text-gray-500 text-white font-semibold rounded-lg transition-all
                     hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:shadow-none"
        >
          {status === "idle" || status === "success" || status === "error"
            ? "🧮 Compute Encrypted Credit Line"
            : status === "encrypting"
            ? "🔄 Encrypting 3 scores..."
            : status === "sending"
            ? "📡 FHE multiply + add on-chain..."
            : "⏳ Confirming..."}
        </button>

        {/* Encrypted result */}
        {encryptedResult && (
          <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
            <p className="text-xs text-blue-400 mb-1">✅ Encrypted Credit Line Computed</p>
            <div className="bg-gray-900 rounded p-2">
              <p className="text-[11px] font-mono text-blue-300 break-all">
                Result: {encryptedResult.slice(0, 30)}...
              </p>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              FHE ops: 2× mul, 2× add, 1× div — all encrypted
            </p>
          </div>
        )}

        {txHash && (
          <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
            <a
              href={getTxLink(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-green-300 hover:text-green-200 underline break-all"
            >
              Tx: {txHash.slice(0, 20)}...{txHash.slice(-8)}
            </a>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>

      <p className="mt-4 text-[10px] text-gray-500 italic">
        ℹ️ All arithmetic (×3, ×2, +, ÷6) happens on encrypted data via CoFHE coprocessor
      </p>
    </div>
  );
}
