"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { getLendingContract, simulateEncryption, generateEncryptedHandle } from "@/lib/contracts";
import { getTxLink } from "@/lib/config";

interface LoanPanelProps {
  signer: ethers.Signer | null;
}

type Status = "idle" | "encrypting" | "sending" | "confirming" | "success" | "error";

export default function LoanPanel({ signer }: LoanPanelProps) {
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [encryptedHandle, setEncryptedHandle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOriginateLoan = async () => {
    if (!signer || !amount) return;
    setError(null);
    setTxHash(null);
    setEncryptedHandle(null);

    try {
      // Step 1: Simulate encryption
      setStatus("encrypting");
      await new Promise((r) => setTimeout(r, 2000)); // Simulate encryption delay
      const handle = generateEncryptedHandle();
      setEncryptedHandle(handle);

      // Step 2: Send REAL transaction via MetaMask
      setStatus("sending");
      const { getFrontendContract } = await import("@/lib/contracts");
      const contract = getFrontendContract(signer);
      const tx = await contract.demoOriginateLoan(parseInt(amount));
      setTxHash(tx.hash);

      // Step 3: Wait for real confirmation
      setStatus("confirming");
      await tx.wait();

      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setError(err?.reason || err?.message || "Transaction failed");
    }
  };

  return (
    <div className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-6 card-hover">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Originate Loan</h3>
          <p className="text-xs text-gray-400">Encrypt amount → Add to encrypted debt</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Loan Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount (e.g., 1000)"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg 
                       text-white placeholder-gray-500 transition-all"
            disabled={status !== "idle" && status !== "success" && status !== "error"}
          />
        </div>

        <button
          onClick={handleOriginateLoan}
          disabled={!signer || !amount || (status !== "idle" && status !== "success" && status !== "error")}
          className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 
                     disabled:text-gray-500 text-white font-semibold rounded-lg transition-all
                     glow-purple-sm hover:glow-purple disabled:shadow-none"
        >
          {status === "idle" || status === "success" || status === "error"
            ? "🔐 Encrypt & Send"
            : status === "encrypting"
            ? "🔄 Encrypting via CoFHE..."
            : status === "sending"
            ? "📡 Sending Transaction..."
            : "⏳ Confirming..."}
        </button>

        {/* Status Display */}
        {status === "encrypting" && (
          <div className="p-3 bg-primary-900/30 border border-primary-700/30 rounded-lg animate-pulse">
            <p className="text-sm text-primary-300 font-mono">
              Encrypting {amount} → FHE ciphertext...
            </p>
            <div className="mt-2 h-1 bg-primary-900 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full animate-[pulse_1s_ease-in-out_infinite] w-2/3" />
            </div>
          </div>
        )}

        {encryptedHandle && status !== "idle" && (
          <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Encrypted Handle:</p>
            <p className="text-xs font-mono text-primary-300 break-all">
              {encryptedHandle.slice(0, 42)}...
            </p>
          </div>
        )}

        {txHash && (
          <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
            <p className="text-xs text-green-400 mb-1">
              {status === "confirming" ? "⏳ Pending..." : "✅ Confirmed!"}
            </p>
            <a
              href={getTxLink(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-green-300 hover:text-green-200 underline break-all"
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

      <p className="mt-4 text-[10px] text-gray-500 italic">
        ℹ️ In production, amounts are encrypted client-side via CoFHE SDK before submission
      </p>
    </div>
  );
}
