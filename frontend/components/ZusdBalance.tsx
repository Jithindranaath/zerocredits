"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getZusdContract } from "@/lib/contracts";

interface ZusdBalanceProps {
  signer: ethers.Signer | null;
  userAddress: string | null;
}

export default function ZusdBalance({ signer, userAddress }: ZusdBalanceProps) {
  const [balance, setBalance] = useState<string>("0");
  const [isMinting, setIsMinting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!signer || !userAddress) return;
    try {
      const contract = getZusdContract(signer);
      const bal = await contract.balanceOf(userAddress);
      setBalance(ethers.formatEther(bal));
    } catch {
      setBalance("0");
    }
  }, [signer, userAddress]);

  useEffect(() => {
    fetchBalance();
    // Poll every 15s
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const handleFaucet = async () => {
    if (!signer) return;
    setIsMinting(true);
    setTxHash(null);
    try {
      const contract = getZusdContract(signer);
      // Mint 10,000 ZUSD
      const tx = await contract.faucet(ethers.parseEther("10000"));
      setTxHash(tx.hash);
      await tx.wait();
      await fetchBalance();
    } catch (err: any) {
      console.error("Faucet error:", err);
    }
    setIsMinting(false);
  };

  if (!userAddress) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-900/20 border border-yellow-700/30 rounded-full">
        <span className="text-yellow-400 text-xs font-bold">💰</span>
        <span className="text-xs text-yellow-300 font-medium">
          {balance === "—" ? "ZUSD (not deployed)" : `${parseFloat(balance).toLocaleString()} ZUSD`}
        </span>
      </div>
      <button
        onClick={handleFaucet}
        disabled={isMinting}
        className="px-2 py-1 text-[10px] bg-yellow-600/20 border border-yellow-600/40 text-yellow-300 
                   rounded hover:bg-yellow-600/30 transition-all disabled:opacity-50"
        title="Get 10,000 ZUSD from faucet"
      >
        {isMinting ? "Minting..." : "🚰 Faucet"}
      </button>
    </div>
  );
}
