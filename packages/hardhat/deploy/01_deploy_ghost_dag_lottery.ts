import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the GhostDAGLottery contract using the deployer account
 * This contract implements a decentralized lottery system with configurable parameters
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployGhostDAGLottery: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying GhostDAGLottery with deployer:", deployer);

  // Deploy the GhostDAGLottery contract
  const deployment = await deploy("GhostDAGLottery", {
    from: deployer,
    // No constructor arguments needed as the contract uses initialize pattern
    args: [],
    log: true,
    autoMine: true,
  });

  // Get the deployed contract instance
  const ghostDAGLottery = await hre.ethers.getContract<Contract>("GhostDAGLottery", deployer);
  
  console.log("✅ GhostDAGLottery deployed at:", deployment.address);
  console.log("📊 Contract version:", await ghostDAGLottery.getVersion());
  
  // Get initial lottery info
  const lotteryInfo = await ghostDAGLottery.getLotteryInfo();
  console.log("🎲 Initial lottery state:");
  console.log("  - Current Draw ID:", lotteryInfo[0].toString());
  console.log("  - Next Draw Time:", new Date(Number(lotteryInfo[1]) * 1000).toISOString());
  console.log("  - Prize Pool:", hre.ethers.formatEther(lotteryInfo[2]), "KAS");
  console.log("  - Tickets Sold:", lotteryInfo[3].toString());
};

export default deployGhostDAGLottery;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags GhostDAGLottery
deployGhostDAGLottery.tags = ["GhostDAGLottery"];