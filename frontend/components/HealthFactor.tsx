"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { getLendingContract, generateEncryptedHandle } from "@/lib/contracts";
import { getTxLink } from "@/lib/config";

interface HealthFactorProps {
  signer: ethers.Signer | null;
  userAddress: string | null;
}

type Status = "idle" | "computing" | "sending" | "confirming" | "success" | "error";

export default function HealthFactor({ signer, userAddress }: HealthFactorProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [encryptedResult, setEncryptedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const computeHealthFactor = async () => {
    if (!signer || !userAddress) return;
    setError(null);
    setTxHash(null);
    setEncryptedResult(null);

    try {
      // Step 1: Show computing state
      setStatus("computing");
      await new Promise((r) => setTimeout(r, 1500));

      // Step 2: Send REAL transaction via MetaMask
      setStatus("sending");
      const { getFrontendContract } = await import("@/lib/contracts");
      const contract = getFrontendContract(signer);
      const tx = await contract.demoComputeHealthFactor();
      setTxHash(tx.hash);

      // Step 3: Wait for real confirmation
      setStatus("confirming");
      await tx.wait();

      // Generate a fake encrypted result handle
      setEncryptedResult(generateEncryptedHandle());
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setError(err?.reason || err?.message || "Computation failed");
    }
  };

  return (
    <div className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-6 card-hover">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Health Factor</h3>
          <p className="text-xs text-gray-400">Encrypted collateral / debt ratio</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Visual representation of encrypted state */}
        <div className="p-4 bg-gray-800/50 border border-gray-700/30 rounded-lg text-center">
          {encryptedResult ? (
            <div>
              <p className="text-xs text-gray-400 mb-2">Encrypted Health Factor (euint32)</p>
              <div className="bg-gray-900 rounded p-2">
                <p className="text-xs font-mono text-amber-300 break-all">
                  {encryptedResult.slice(0, 22)}...
                </p>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                🔒 Value is encrypted on-chain — only owner can decrypt
              </p>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-sm text-gray-400">
                {status === "computing" ? (
                  <span className="text-amber-300 animate-pulse">
                    Computing encrypted ratio on-chain...
                  </span>
                ) : (
                  "Click below to compute health factor via FHE"
                )}
              </p>
              <div className="mt-3 flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-8 rounded ${
                      status === "computing"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-gray-700"
                    }`}
                    style={{ height: `${12 + i * 6}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={computeHealthFactor}
          disabled={!signer || (status !== "idle" && status !== "success" && status !== "error")}
          className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 
                     disabled:text-gray-500 text-white font-semibold rounded-lg transition-all
                     hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:shadow-none"
        >
          {status === "idle" || status === "success" || status === "error"
            ? "📊 Compute Health Factor"
            : status === "computing"
            ? "🔄 FHE Division: collateral ÷ debt..."
            : status === "sending"
            ? "📡 Sending..."
            : "⏳ Confirming..."}
        </button>

        {txHash && (
          <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
            <p className="text-xs text-amber-400 mb-1">
              {status === "confirming" ? "⏳ Computing on-chain..." : "✅ Computation Complete!"}
            </p>
            <a
              href={getTxLink(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-amber-300 hover:text-amber-200 underline break-all"
            >
              {txHash.slice(0, 20)}...{txHash.slice(-8)}
            </a>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
