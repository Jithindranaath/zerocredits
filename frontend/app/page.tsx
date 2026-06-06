"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import WalletConnect from "@/components/WalletConnect";
import LoanPanel from "@/components/LoanPanel";
import RepayPanel from "@/components/RepayPanel";
import HealthFactor from "@/components/HealthFactor";
import CreditScore from "@/components/CreditScore";
import OwnerDecrypt from "@/components/OwnerDecrypt";
import AiChat from "@/components/AiChat";
import ZusdBalance from "@/components/ZusdBalance";
import { CONTRACT_ADDRESSES, getEtherscanLink } from "@/lib/config";
import { getLendingContract } from "@/lib/contracts";

export default function Home() {
  const { address, isConnected } = useAccount();
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function setupSigner() {
      if (isConnected && address && typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const s = await provider.getSigner();
          setSigner(s);

          // Check if connected wallet is the contract owner
          try {
            const contract = getLendingContract(s);
            const owner = await contract.owner();
            setIsOwner(owner.toLowerCase() === address.toLowerCase());
          } catch {
            const KNOWN_OWNER = "0xccEF39b7e2081b9c814DBbf0e51D450DdaBB64a2".toLowerCase();
            setIsOwner(address.toLowerCase() === KNOWN_OWNER);
          }
        } catch {
          setSigner(null);
          setIsOwner(false);
        }
      } else {
        setSigner(null);
        setIsOwner(false);
      }
    }
    setupSigner();
  }, [address, isConnected]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/50 backdrop-blur-sm bg-gray-950/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Zero<span className="text-primary-400">Credits</span>
              </h1>
              <p className="text-[10px] text-gray-500 -mt-0.5">
                Privacy-Preserving Lending on Fhenix
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* ZUSD Balance */}
            <ZusdBalance signer={signer} userAddress={address || null} />
            {/* FHE Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary-900/30 border border-primary-700/30 rounded-full">
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse-slow" />
              <span className="text-xs text-primary-300 font-medium">FHE Encrypted</span>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      {!address && (
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900/30 border border-primary-700/30 rounded-full mb-6">
            <span className="text-primary-300 text-sm">🔐 Powered by Fully Homomorphic Encryption</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            DeFi Lending with
            <br />
            <span className="text-primary-400">Complete Privacy</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            All loan amounts, debt positions, collateral, and credit scores are encrypted on-chain. 
            No one can see your financial data — not even the blockchain validators.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 rounded-lg border border-gray-800">
              <span>🔒</span> Encrypted Debt
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 rounded-lg border border-gray-800">
              <span>🛡️</span> Private Collateral
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 rounded-lg border border-gray-800">
              <span>📊</span> Confidential Credit Scores
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 rounded-lg border border-gray-800">
              <span>⚡</span> CoFHE Coprocessor
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        {address && (
          <>
            {/* Connected status */}
            <div className="mb-8 p-4 bg-gray-900/50 border border-gray-800 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Connected as</p>
                <p className="font-mono text-sm text-white">{address}</p>
              </div>
              {isOwner && (
                <span className="px-3 py-1 bg-primary-900/50 border border-primary-600/50 rounded-full text-xs text-primary-300 font-medium">
                  Contract Owner
                </span>
              )}
            </div>

            {/* 2x2 Grid of Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <LoanPanel signer={signer} />
              <RepayPanel signer={signer} />
              <HealthFactor signer={signer} userAddress={address || null} />
              <CreditScore signer={signer} />
            </div>

            {/* Owner Panel */}
            {isOwner && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Admin: Decryption Controls
                </h2>
                <OwnerDecrypt signer={signer} isOwner={isOwner} />
              </div>
            )}

            {/* AI Agent Chat */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <span className="text-xl">🤖</span>
                AI Agent (Claude + MCP)
              </h2>
              <AiChat />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 bg-gray-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm text-gray-400 font-medium mb-1">Deployed Contracts (Sepolia)</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs">
                <a
                  href={getEtherscanLink(CONTRACT_ADDRESSES.CreditEngine)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 font-mono transition-colors"
                >
                  CreditEngine: {CONTRACT_ADDRESSES.CreditEngine.slice(0, 10)}...
                </a>
                <a
                  href={getEtherscanLink(CONTRACT_ADDRESSES.ZeroCreditLending)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 font-mono transition-colors"
                >
                  ZeroCreditLending: {CONTRACT_ADDRESSES.ZeroCreditLending.slice(0, 10)}...
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600">Built with</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-gray-800 rounded text-[10px] text-gray-400 border border-gray-700">Fhenix CoFHE</span>
                <span className="px-2 py-1 bg-gray-800 rounded text-[10px] text-gray-400 border border-gray-700">Next.js</span>
                <span className="px-2 py-1 bg-gray-800 rounded text-[10px] text-gray-400 border border-gray-700">ethers.js</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
