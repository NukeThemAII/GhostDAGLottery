"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useScaffoldContract, useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { formatEther, parseEther } from "viem";
import { notification } from "~~/utils/scaffold-eth";

const AdminPanel: React.FC = () => {
  const { address: connectedAddress } = useAccount();
  const [isOwner, setIsOwner] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Contract instance
  const { data: contract } = useScaffoldContract({
    contractName: "GhostDAGLottery",
  });
  
  // Prevent unused variable warning
  console.log("Contract loaded:", contract?.address);

  // Read contract state
  const { data: owner } = useScaffoldContractRead({
    contractName: "GhostDAGLottery",
    functionName: "owner",
  });

  const { data: isPaused } = useScaffoldContractRead({
    contractName: "GhostDAGLottery",
    functionName: "paused",
  });

  const { data: excessFunds } = useScaffoldContractRead({
    contractName: "GhostDAGLottery",
    functionName: "getExcessFunds",
  });

  const { data: contractBalance } = useScaffoldContractRead({
    contractName: "GhostDAGLottery",
    functionName: "getAnalytics",
  });

  // Write functions
  const { writeAsync: pauseLottery, isMining: isPausing } = useScaffoldContractWrite({
    contractName: "GhostDAGLottery",
    functionName: "pause",
  });

  const { writeAsync: unpauseLottery, isMining: isUnpausing } = useScaffoldContractWrite({
    contractName: "GhostDAGLottery",
    functionName: "unpause",
  });

  const { writeAsync: withdrawExcessFunds, isMining: isWithdrawing } = useScaffoldContractWrite({
    contractName: "GhostDAGLottery",
    functionName: "withdrawExcessFunds",
  });

  const { writeAsync: executeDraw, isMining: isExecutingDraw } = useScaffoldContractWrite({
    contractName: "GhostDAGLottery",
    functionName: "executeDraw",
  });

  // Check if connected address is owner
  useEffect(() => {
    if (connectedAddress && owner) {
      setIsOwner(connectedAddress.toLowerCase() === owner.toLowerCase());
    }
  }, [connectedAddress, owner]);

  const handlePause = async () => {
    try {
      await pauseLottery();
      notification.success("Lottery paused successfully!");
    } catch (error) {
      console.error("Error pausing lottery:", error);
      notification.error("Failed to pause lottery");
    }
  };

  const handleUnpause = async () => {
    try {
      await unpauseLottery();
      notification.success("Lottery unpaused successfully!");
    } catch (error) {
      console.error("Error unpausing lottery:", error);
      notification.error("Failed to unpause lottery");
    }
  };

  const handleWithdrawExcess = async () => {
    try {
      const amount = withdrawAmount ? parseEther(withdrawAmount) : undefined;
      await withdrawExcessFunds({
        args: amount ? [amount] : [],
      });
      notification.success("Excess funds withdrawn successfully!");
      setWithdrawAmount("");
    } catch (error) {
      console.error("Error withdrawing excess funds:", error);
      notification.error("Failed to withdraw excess funds");
    }
  };

  const handleExecuteDraw = async () => {
    try {
      await executeDraw();
      notification.success("Draw executed successfully!");
    } catch (error) {
      console.error("Error executing draw:", error);
      notification.error("Failed to execute draw");
    }
  };

  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-4">Admin Panel</h2>
          <p className="text-white/80">Please connect your wallet to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white/80">You are not authorized to access the admin panel.</p>
          <p className="text-white/60 text-sm mt-2">Only the contract owner can access this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-white/80">Manage the GhostDAG Lottery system</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">Lottery Status</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="text-white/90">{isPaused ? 'Paused' : 'Active'}</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">Excess Funds</h3>
            <p className="text-2xl font-bold text-white">
              {excessFunds ? formatEther(excessFunds) : '0'} KAS
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">Total Revenue</h3>
            <p className="text-2xl font-bold text-white">
              {contractBalance?.totalRevenue ? formatEther(contractBalance.totalRevenue) : '0'} KAS
            </p>
          </div>
        </div>

        {/* Control Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lottery Controls */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Lottery Controls</h2>
            
            <div className="space-y-4">
              {isPaused ? (
                <button
                  onClick={handleUnpause}
                  disabled={isUnpausing}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isUnpausing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Unpausing...</span>
                    </div>
                  ) : (
                    '▶️ Unpause Lottery'
                  )}
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  disabled={isPausing}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isPausing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Pausing...</span>
                    </div>
                  ) : (
                    '⏸️ Pause Lottery'
                  )}
                </button>
              )}

              <button
                onClick={handleExecuteDraw}
                disabled={isExecutingDraw || isPaused}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isExecutingDraw ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Executing Draw...</span>
                  </div>
                ) : (
                  '🎲 Execute Draw Now'
                )}
              </button>
            </div>

            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <h4 className="text-white font-semibold mb-2">⚠️ Important Notes</h4>
              <ul className="text-white/80 text-sm space-y-1">
                <li>• Pausing stops all ticket purchases</li>
                <li>• Draws can only be executed when unpaused</li>
                <li>• Manual draw execution overrides the timer</li>
              </ul>
            </div>
          </div>

          {/* Financial Controls */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Financial Controls</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">
                  Withdraw Amount (KAS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Leave empty to withdraw all excess"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleWithdrawExcess}
                disabled={isWithdrawing || !excessFunds || excessFunds === 0n}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isWithdrawing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Withdrawing...</span>
                  </div>
                ) : (
                  '💰 Withdraw Excess Funds'
                )}
              </button>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-white font-semibold mb-2">💡 Withdrawal Info</h4>
                <ul className="text-white/80 text-sm space-y-1">
                  <li>• Available: {excessFunds ? formatEther(excessFunds) : '0'} KAS</li>
                  <li>• Only excess funds can be withdrawn</li>
                  <li>• Prize pool funds are protected</li>
                  <li>• Specify amount or leave empty for all</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">System Analytics</h2>
          
          {contractBalance && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-white/60 text-sm">Total Draws</p>
                <p className="text-2xl font-bold text-white">{contractBalance.totalDraws?.toString() || '0'}</p>
              </div>
              <div className="text-center">
                <p className="text-white/60 text-sm">Total Tickets</p>
                <p className="text-2xl font-bold text-white">{contractBalance.totalTicketsSold?.toString() || '0'}</p>
              </div>
              <div className="text-center">
                <p className="text-white/60 text-sm">Total Players</p>
                <p className="text-2xl font-bold text-white">{contractBalance.totalPlayers?.toString() || '0'}</p>
              </div>
              <div className="text-center">
                <p className="text-white/60 text-sm">Total Prizes</p>
                <p className="text-2xl font-bold text-white">
                  {contractBalance.totalPrizesDistributed ? formatEther(contractBalance.totalPrizesDistributed) : '0'} KAS
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;