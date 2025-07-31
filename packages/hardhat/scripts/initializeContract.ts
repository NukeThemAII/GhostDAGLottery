import { ethers } from "hardhat";

async function main() {
  console.log("Initializing GhostDAGLottery contract...");
  
  // Get the deployed contract
  const ghostDAGLottery = await ethers.getContract("GhostDAGLottery");
  
  console.log("Contract address:", await ghostDAGLottery.getAddress());
  console.log("Current owner before init:", await ghostDAGLottery.owner().catch(() => "Not initialized"));
  
  try {
    // Initialize the contract
    const tx = await ghostDAGLottery.initialize();
    await tx.wait();
    
    console.log("✅ Contract initialized successfully!");
    console.log("Transaction hash:", tx.hash);
    console.log("New owner:", await ghostDAGLottery.owner());
    
    // Now transfer ownership to your address
    const newOwner = "0x5c36dc671a38971C233b77e791D0C30275Da647f";
    console.log("\nTransferring ownership to:", newOwner);
    
    const transferTx = await ghostDAGLottery.transferOwnership(newOwner);
    await transferTx.wait();
    
    console.log("✅ Ownership transferred successfully!");
    console.log("Final owner:", await ghostDAGLottery.owner());
    console.log("Transfer transaction hash:", transferTx.hash);
    
  } catch (error: any) {
    if (error.message.includes("Initializable: contract is already initialized")) {
      console.log("Contract is already initialized, proceeding with ownership transfer...");
      
      const newOwner = "0x5c36dc671a38971C233b77e791D0C30275Da647f";
      console.log("Transferring ownership to:", newOwner);
      
      const transferTx = await ghostDAGLottery.transferOwnership(newOwner);
      await transferTx.wait();
      
      console.log("✅ Ownership transferred successfully!");
      console.log("Final owner:", await ghostDAGLottery.owner());
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });