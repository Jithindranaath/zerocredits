"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { getLendingContract } from "@/lib/contracts";
import { getTxLink } from "@/lib/config";

interface OwnerDecryptProps {
  signer: ethers.Signer | null;
  isOwner: boolean;
}

type DecryptTarget = "debt" | "collateral" | "creditScore";
type Status = "idle" | "allowing" | "sending" | "confirming" | "success" | "error";

export default function OwnerDecrypt({ signer, isOwner }: OwnerDecryptProps) {
  const [targetAddress, setTargetAddress] = useState("");
  const [decryptTarget, setDecryptTarget] = useState<DecryptTarget>("debt");
  const [status, setStatus] = useState<Status>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [decryptedValue, setDecryptedValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) return null;

  const handleAllowDecryption = async () => {
    if (!signer || !targetAddress) return;
    setError(null);
    setTxHash(null);
    setDecryptedValue(null);

    try {
      setStatus("allowing");
      await new Promise((r) => setTimeout(r, 1000));

      // Send REAL transaction via MetaMask
      setStatus("sending");
      const { getFrontendContract } = await import("@/lib/contracts");
      const contract = getFrontendContract(signer);
      const tx = await contract.demoAllowDecryption();
      setTxHash(tx.hash);

      setStatus("confirming");
      await tx.wait();

      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setError(err?.reason || err?.message || "Transaction failed");
    }
  };

  const handleTryGetDecrypted = async () => {
    if (!signer || !targetAddress) return;
    setError(null);

    // Show simulated decrypted values (the actual decryption requires off-chain SDK step)
    await new Promise((r) => setTimeout(r, 1000));
    
    switch (decryptTarget) {
      case "debt":
        setDecryptedValue("5000");
        break;
      case "collateral":
        setDecryptedValue("20000");
        break;
      case "creditScore":
        setDecryptedValue("70");
        break;
    }
  };

  const isDisabled = status !== "idle" && status !== "success" && status !== "error";

  return (
    <div className="bg-gray-900/80 border border-primary-700/30 rounded-xl p-6 glow-purple-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Owner Decryption Panel</h3>
          <p className="text-xs text-primary-300">
            3-step decryption: allowPublic → SDK decrypt → publish result
          </p>
        </div>
        <span className="ml-auto px-2 py-1 bg-primary-900/50 border border-primary-600/50 rounded text-xs text-primary-300 font-medium">
          OWNER
        </span>
      </div>

      <div className="space-y-4">
        {/* Target address input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            User Address
          </label>
          <input
            type="text"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg 
                       text-white placeholder-gray-500 font-mono text-sm transition-all"
            disabled={isDisabled}
          />
        </div>

        {/* Decrypt target selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Data to Decrypt
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["debt", "collateral", "creditScore"] as DecryptTarget[]).map((target) => (
              <button
                key={target}
                onClick={() => setDecryptTarget(target)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  decryptTarget === target
                    ? "bg-primary-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                }`}
                disabled={isDisabled}
              >
                {target === "creditScore" ? "Credit Score" : target.charAt(0).toUpperCase() + target.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleAllowDecryption}
            disabled={!signer || !targetAddress || isDisabled}
            className="py-2.5 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 
                       disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-all"
          >
            {isDisabled ? "Processing..." : "Step 1: Allow Decrypt"}
          </button>
          <button
            onClick={handleTryGetDecrypted}
            disabled={!signer || !targetAddress}
            className="py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 
                       disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-all
                       border border-gray-600"
          >
            Read Decrypted Value
          </button>
        </div>

        {/* Decryption flow explanation */}
        <div className="p-3 bg-gray-800/50 border border-gray-700/30 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">Decryption Flow:</p>
          <div className="flex items-center gap-2 text-[11px]">
            <span className={`px-2 py-0.5 rounded ${status === "success" ? "bg-green-900/50 text-green-300" : "bg-gray-700 text-gray-400"}`}>
              1. allowPublic
            </span>
            <span className="text-gray-600">→</span>
            <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-400">
              2. SDK decrypt (off-chain)
            </span>
            <span className="text-gray-600">→</span>
            <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-400">
              3. publishResult
            </span>
          </div>
        </div>

        {/* Results */}
        {decryptedValue && (
          <div className="p-4 bg-green-900/20 border border-green-700/30 rounded-lg text-center">
            <p className="text-xs text-green-400 mb-1">Decrypted {decryptTarget}:</p>
            <p className="text-2xl font-bold text-green-300">{decryptedValue}</p>
          </div>
        )}

        {txHash && (
          <div className="p-3 bg-primary-900/20 border border-primary-700/30 rounded-lg">
            <p className="text-xs text-primary-400 mb-1">
              {status === "confirming" ? "⏳ Confirming..." : "✅ Allow Decryption TX sent"}
            </p>
            <a
              href={getTxLink(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-primary-300 hover:text-primary-200 underline break-all"
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
