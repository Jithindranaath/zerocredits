"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CHAIN_CONFIG } from "@/lib/config";

interface WalletConnectProps {
  onConnect: (address: string, signer: ethers.Signer) => void;
  onDisconnect: () => void;
}

export default function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    checkConnection();
    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum.on("accountsChanged", handleAccountsChanged);
      (window as any).ethereum.on("chainChanged", handleChainChanged);
    }
    return () => {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        (window as any).ethereum.removeListener("accountsChanged", handleAccountsChanged);
        (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        const network = await provider.getNetwork();
        setAddress(addr);
        setChainId(Number(network.chainId));
        setWrongNetwork(Number(network.chainId) !== CHAIN_CONFIG.chainId);
        onConnect(addr, signer);
      }
    } catch (err) {
      console.error("Check connection error:", err);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAddress(null);
      onDisconnect();
    } else {
      setAddress(accounts[0]);
      checkConnection();
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const connect = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const network = await provider.getNetwork();
      setAddress(addr);
      setChainId(Number(network.chainId));
      setWrongNetwork(Number(network.chainId) !== CHAIN_CONFIG.chainId);
      onConnect(addr, signer);
    } catch (err) {
      console.error("Connect error:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const switchNetwork = async () => {
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${CHAIN_CONFIG.chainId.toString(16)}` }],
      });
    } catch (err) {
      console.error("Switch network error:", err);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setChainId(null);
    onDisconnect();
  };

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!address) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-800 
                   text-white font-medium rounded-lg transition-all duration-200
                   glow-purple-sm hover:glow-purple"
      >
        {isConnecting ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting...
          </span>
        ) : (
          "Connect Wallet"
        )}
      </button>
    );
  }

  if (wrongNetwork) {
    return (
      <button
        onClick={switchNetwork}
        className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-all"
      >
        Switch to Sepolia
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="px-3 py-1.5 bg-primary-900/50 border border-primary-700/50 rounded-lg text-sm">
        <span className="text-primary-300">{CHAIN_CONFIG.chainName}</span>
      </div>
      <button
        onClick={disconnect}
        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 
                   text-white font-medium rounded-lg transition-all group"
      >
        <span className="group-hover:hidden">{truncateAddress(address)}</span>
        <span className="hidden group-hover:inline text-red-400">Disconnect</span>
      </button>
    </div>
  );
}
