"use client";

import React from "react";
import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const LotteryOverview: React.FC = () => {
  // Fetch lottery info
  const { data: lotteryInfo, isLoading: lotteryInfoLoading } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "getLotteryInfo",
  });

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "getAnalytics",
  });

  // Fetch contract version
  const { data: version } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "getVersion",
  });

  const formatTimeRemaining = (timestamp: bigint) => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = Number(timestamp) - now;
    
    if (timeLeft <= 0) return "Draw Available";
    
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (lotteryInfoLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const currentDrawId = lotteryInfo?.[0] || 0n;
  const nextDrawTime = lotteryInfo?.[1] || 0n;
  const prizePool = lotteryInfo?.[2] || 0n;
  const ticketsSold = lotteryInfo?.[3] || 0n;

  const totalDraws = analytics?.[0] || 0n;
  const totalTicketsSold = analytics?.[1] || 0n;
  const totalPrizesDistributed = analytics?.[2] || 0n;
  const totalDonationsReceived = analytics?.[3] || 0n;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Lottery Overview</h2>
        <p className="text-gray-400">Current lottery status and statistics</p>
        {version && (
          <div className="mt-2">
            <span className="inline-block bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">
              Contract v{version}
            </span>
          </div>
        )}
      </div>

      {/* Current Draw Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Current Draw</h3>
            <span className="text-2xl">🎲</span>
          </div>
          <div className="text-3xl font-bold text-blue-400 mb-2">#{currentDrawId.toString()}</div>
          <div className="text-sm text-gray-400">
            {Number(nextDrawTime) === 0 ? "Not scheduled" : "Next draw in progress"}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Prize Pool</h3>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-green-400 mb-2">
            {formatEther(prizePool)} KAS
          </div>
          <div className="text-sm text-gray-400">Available for winners</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Tickets Sold</h3>
            <span className="text-2xl">🎫</span>
          </div>
          <div className="text-3xl font-bold text-yellow-400 mb-2">{ticketsSold.toString()}</div>
          <div className="text-sm text-gray-400">Current draw</div>
        </div>

        <div className="bg-gradient-to-br from-pink-500/20 to-red-500/20 backdrop-blur-sm border border-pink-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Next Draw</h3>
            <span className="text-2xl">⏰</span>
          </div>
          <div className="text-2xl font-bold text-pink-400 mb-2">
            {Number(nextDrawTime) === 0 ? "TBD" : formatTimeRemaining(nextDrawTime)}
          </div>
          <div className="text-sm text-gray-400">
            {Number(nextDrawTime) === 0 ? "Not scheduled" : "Time remaining"}
          </div>
        </div>
      </div>

      {/* Lottery Statistics */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">📊 Lottery Statistics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">{totalDraws.toString()}</div>
            <div className="text-gray-400">Total Draws</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">{totalTicketsSold.toString()}</div>
            <div className="text-gray-400">Total Tickets Sold</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {formatEther(totalPrizesDistributed)} KAS
            </div>
            <div className="text-gray-400">Total Prizes Distributed</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {formatEther(totalDonationsReceived)} KAS
            </div>
            <div className="text-gray-400">Total Donations</div>
          </div>
        </div>
      </div>

      {/* How to Play */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">🎮 How to Play</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-4">1️⃣</div>
            <h4 className="text-lg font-semibold text-white mb-2">Choose Numbers</h4>
            <p className="text-gray-400 text-sm">
              Select 5 main numbers (1-50) and 1 bonus number (1-12)
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-4xl mb-4">2️⃣</div>
            <h4 className="text-lg font-semibold text-white mb-2">Buy Tickets</h4>
            <p className="text-gray-400 text-sm">
              Each ticket costs 0.1 KAS. Buy multiple tickets to increase your chances!
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-4xl mb-4">3️⃣</div>
            <h4 className="text-lg font-semibold text-white mb-2">Win Prizes</h4>
            <p className="text-gray-400 text-sm">
              Match numbers to win! More matches = bigger prizes. Check results after each draw.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};