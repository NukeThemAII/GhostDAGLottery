"use client";

import React, { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Address } from "~~/components/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const AdminPanel: React.FC = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [newTicketPrice, setNewTicketPrice] = useState("");
  const [newDrawInterval, setNewDrawInterval] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [emergencyWithdrawAmount, setEmergencyWithdrawAmount] = useState("");

  // Contract interactions
  const { writeContractAsync: conductDraw, isMining: isConductingDraw } = useScaffoldWriteContract("GhostDAGLottery");
  const { writeContractAsync: setTicketPrice, isMining: isSettingPrice } = useScaffoldWriteContract("GhostDAGLottery");
  const { writeContractAsync: setDrawInterval, isMining: isSettingInterval } = useScaffoldWriteContract("GhostDAGLottery");
  const { writeContractAsync: pause, isMining: isPausing } = useScaffoldWriteContract("GhostDAGLottery");
  const { writeContractAsync: unpause, isMining: isUnpausing } = useScaffoldWriteContract("GhostDAGLottery");
  const { writeContractAsync: donate, isMining: isDonating } = useScaffoldWriteContract("GhostDAGLottery");
  const { writeContractAsync: emergencyWithdraw, isMining: isWithdrawing } = useScaffoldWriteContract("GhostDAGLottery");

  // Get contract info
  const { data: owner } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "owner",
  });

  const { data: lotteryInfo } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "getLotteryInfo",
  });

  const { data: ticketPrice } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "ticketPrice",
  });

  const { data: drawInterval } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "drawInterval",
  });

  const { data: isPaused } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "paused",
  });

  const { data: contractBalance } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "getContractBalance",
  });

  const { data: totalDonations } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "totalDonationsReceived",
  });

  const isOwner = connectedAddress && owner && connectedAddress.toLowerCase() === owner.toLowerCase();
  const currentDrawId = lotteryInfo?.[0] || 0n;
  const nextDrawTime = lotteryInfo?.[1] || 0n;
  const prizePool = lotteryInfo?.[2] || 0n;
  const ticketsSold = lotteryInfo?.[3] || 0n;

  const canConductDraw = () => {
    if (!nextDrawTime) return false;
    const now = Math.floor(Date.now() / 1000);
    return now >= Number(nextDrawTime) && Number(ticketsSold) > 0;
  };

  const handleConductDraw = async () => {
    if (!isOwner) {
      notification.error("Only the contract owner can conduct draws");
      return;
    }

    if (!canConductDraw()) {
      notification.error("Cannot conduct draw yet. Either time hasn't passed or no tickets sold.");
      return;
    }

    try {
      await conductDraw({
        functionName: "conductDraw",
      });

      notification.success(`Draw #${currentDrawId} conducted successfully!`);
    } catch (error) {
      console.error("Error conducting draw:", error);
      notification.error("Failed to conduct draw");
    }
  };

  const handleSetTicketPrice = async () => {
    if (!isOwner || !newTicketPrice) {
      notification.error("Invalid input or insufficient permissions");
      return;
    }

    try {
      const priceInWei = parseEther(newTicketPrice);
      await setTicketPrice({
        functionName: "setTicketPrice",
        args: [priceInWei],
      });

      notification.success(`Ticket price updated to ${newTicketPrice} KAS`);
      setNewTicketPrice("");
    } catch (error) {
      console.error("Error setting ticket price:", error);
      notification.error("Failed to update ticket price");
    }
  };

  const handleSetDrawInterval = async () => {
    if (!isOwner || !newDrawInterval) {
      notification.error("Invalid input or insufficient permissions");
      return;
    }

    try {
      const intervalInSeconds = BigInt(parseInt(newDrawInterval) * 3600); // Convert hours to seconds
      await setDrawInterval({
        functionName: "setDrawInterval",
        args: [intervalInSeconds],
      });

      notification.success(`Draw interval updated to ${newDrawInterval} hours`);
      setNewDrawInterval("");
    } catch (error) {
      console.error("Error setting draw interval:", error);
      notification.error("Failed to update draw interval");
    }
  };

  const handlePauseToggle = async () => {
    if (!isOwner) {
      notification.error("Only the contract owner can pause/unpause");
      return;
    }

    try {
      if (isPaused) {
        await unpause({
          functionName: "unpause",
        });
        notification.success("Contract unpaused successfully!");
      } else {
        await pause({
          functionName: "pause",
        });
        notification.success("Contract paused successfully!");
      }
    } catch (error) {
      console.error("Error toggling pause:", error);
      notification.error("Failed to toggle pause state");
    }
  };

  const handleDonate = async () => {
    if (!donationAmount) {
      notification.error("Please enter a donation amount");
      return;
    }

    try {
      const donationInWei = parseEther(donationAmount);
      await donate({
        functionName: "donate",
        value: donationInWei,
      });

      notification.success(`Donated ${donationAmount} KAS to the lottery!`);
      setDonationAmount("");
    } catch (error) {
      console.error("Error donating:", error);
      notification.error("Failed to donate");
    }
  };

  const handleEmergencyWithdraw = async () => {
    if (!isOwner || !emergencyWithdrawAmount) {
      notification.error("Invalid input or insufficient permissions");
      return;
    }

    try {
      const withdrawInWei = parseEther(emergencyWithdrawAmount);
      await emergencyWithdraw({
        functionName: "emergencyWithdraw",
        args: [withdrawInWei],
      });

      notification.success(`Emergency withdrawal of ${emergencyWithdrawAmount} KAS completed`);
      setEmergencyWithdrawAmount("");
    } catch (error) {
      console.error("Error with emergency withdrawal:", error);
      notification.error("Failed to perform emergency withdrawal");
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔌</div>
        <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Please connect your wallet to access admin features</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🚫</div>
        <h3 className="text-2xl font-bold text-white mb-2">Access Denied</h3>
        <p className="text-gray-400 mb-4">Only the contract owner can access this panel</p>
        <div className="inline-flex items-center space-x-2 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-full px-4 py-2">
          <span className="text-red-400 font-medium">Contract Owner:</span>
          <Address address={owner} size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">⚙️ Admin Panel</h2>
        <p className="text-gray-400">Manage lottery operations and settings</p>
        <div className="mt-4">
          <div className="inline-flex items-center space-x-2 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-full px-4 py-2">
            <span className="text-green-400 font-medium">👑 Owner Access</span>
          </div>
        </div>
      </div>

      {/* Contract Status */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">📊 Contract Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 ${
              isPaused ? "text-red-400" : "text-green-400"
            }`}>
              {isPaused ? "⏸️" : "▶️"}
            </div>
            <div className="text-gray-400">
              {isPaused ? "Paused" : "Active"}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {contractBalance ? formatEther(contractBalance) : "0"}
            </div>
            <div className="text-gray-400">Contract Balance (KAS)</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {ticketPrice ? formatEther(ticketPrice) : "0"}
            </div>
            <div className="text-gray-400">Ticket Price (KAS)</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {drawInterval ? Math.floor(Number(drawInterval) / 3600) : "0"}
            </div>
            <div className="text-gray-400">Draw Interval (Hours)</div>
          </div>
        </div>
      </div>

      {/* Draw Management */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">🎲 Draw Management</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-white mb-2">Current Draw Info</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Draw ID:</span>
                <span className="text-white font-semibold">#{currentDrawId.toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Prize Pool:</span>
                <span className="text-green-400 font-semibold">{formatEther(prizePool)} KAS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tickets Sold:</span>
                <span className="text-blue-400 font-semibold">{ticketsSold.toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Next Draw:</span>
                <span className="text-purple-400 font-semibold">
                  {nextDrawTime ? new Date(Number(nextDrawTime) * 1000).toLocaleString() : "Not set"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-white mb-2">Draw Actions</h4>
            <div className="space-y-3">
              <button
                onClick={handleConductDraw}
                disabled={isConductingDraw || !canConductDraw()}
                className={`
                  w-full px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105
                  ${
                    canConductDraw() && !isConductingDraw
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }
                `}
              >
                {isConductingDraw ? "🔄 Conducting..." : "🎲 Conduct Draw"}
              </button>
              
              <div className="text-xs text-gray-400 text-center">
                {!canConductDraw() && (
                  Number(ticketsSold) === 0 
                    ? "No tickets sold yet"
                    : "Draw time not reached"
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Management */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">⚙️ Lottery Settings</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket Price */}
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-white mb-3">💰 Ticket Price</h4>
            <div className="space-y-3">
              <input
                type="number"
                step="0.01"
                placeholder="New price in KAS"
                value={newTicketPrice}
                onChange={(e) => setNewTicketPrice(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleSetTicketPrice}
                disabled={isSettingPrice || !newTicketPrice}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-600 transition-all"
              >
                {isSettingPrice ? "🔄 Updating..." : "💰 Update Price"}
              </button>
            </div>
          </div>
          
          {/* Draw Interval */}
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-white mb-3">⏰ Draw Interval</h4>
            <div className="space-y-3">
              <input
                type="number"
                placeholder="Interval in hours"
                value={newDrawInterval}
                onChange={(e) => setNewDrawInterval(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleSetDrawInterval}
                disabled={isSettingInterval || !newDrawInterval}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                {isSettingInterval ? "🔄 Updating..." : "⏰ Update Interval"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Controls */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">🔧 Contract Controls</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pause/Unpause */}
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-white mb-3">
              {isPaused ? "▶️ Unpause Contract" : "⏸️ Pause Contract"}
            </h4>
            <p className="text-gray-400 text-sm mb-3">
              {isPaused 
                ? "Resume lottery operations and ticket sales"
                : "Temporarily halt all lottery operations"}
            </p>
            <button
              onClick={handlePauseToggle}
              disabled={isPausing || isUnpausing}
              className={`
                w-full px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105
                ${
                  isPaused
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                    : "bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600"
                }
              `}
            >
              {(isPausing || isUnpausing) ? "🔄 Processing..." : 
               isPaused ? "▶️ Unpause" : "⏸️ Pause"}
            </button>
          </div>
          
          {/* Emergency Withdraw */}
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-white mb-3">🚨 Emergency Withdraw</h4>
            <div className="space-y-3">
              <input
                type="number"
                step="0.01"
                placeholder="Amount in KAS"
                value={emergencyWithdrawAmount}
                onChange={(e) => setEmergencyWithdrawAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleEmergencyWithdraw}
                disabled={isWithdrawing || !emergencyWithdrawAmount}
                className="w-full px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-red-600 hover:to-orange-600 transition-all"
              >
                {isWithdrawing ? "🔄 Withdrawing..." : "🚨 Emergency Withdraw"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Donation Section */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">💝 Support the Lottery</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-white mb-2">Donation Stats</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Donations:</span>
                <span className="text-yellow-400 font-semibold">
                  {totalDonations ? formatEther(totalDonations) : "0"} KAS
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-white mb-3">💝 Make a Donation</h4>
            <div className="space-y-3">
              <input
                type="number"
                step="0.01"
                placeholder="Donation amount in KAS"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
              />
              <button
                onClick={handleDonate}
                disabled={isDonating || !donationAmount}
                className="w-full px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-yellow-600 hover:to-orange-600 transition-all"
              >
                {isDonating ? "🔄 Donating..." : "💝 Donate"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};