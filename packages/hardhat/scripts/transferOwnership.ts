import { ethers } from "hardhat";

async function main() {
  const newOwner = "0x5c36dc671a38971C233b77e791D0C30275Da647f"; // Your address
  
  console.log("Transferring ownership to:", newOwner);
  
  // Get the deployed contract
  const ghostDAGLottery = await ethers.getContract("GhostDAGLottery");
  
  console.log("Current owner:", await ghostDAGLottery.owner());
  console.log("Contract address:", await ghostDAGLottery.getAddress());
  
  // Transfer ownership
  const tx = await ghostDAGLottery.transferOwnership(newOwner);
  await tx.wait();
  
  console.log("✅ Ownership transferred successfully!");
  console.log("New owner:", await ghostDAGLottery.owner());
  console.log("Transaction hash:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });