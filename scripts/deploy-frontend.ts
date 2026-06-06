import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ZeroCreditFrontend with:", deployer.address);

  const ZeroCreditFrontend = await ethers.getContractFactory("ZeroCreditFrontend");
  const frontend = await ZeroCreditFrontend.deploy("0x12bd31887C0853757B6D5DAB2e892D880E75887f");
  await frontend.waitForDeployment();

  const address = await frontend.getAddress();
  console.log("ZeroCreditFrontend deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
