import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "ZeroCredits",
  projectId: "64371fb4bac9290ec89ca284d71d0cbc", // Get from https://cloud.walletconnect.com
  chains: [sepolia],
  ssr: true,
});
