"use client";

import React, { useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Address } from "~~/components/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const PlayerDashboard: React.FC = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [selectedDrawId, setSelectedDrawId] = useState<bigint>(0n);

  // Contract interactions
  const { writeContractAsync: claimPrize, isMining: isClaimingPrize } = useScaffoldWriteContract("GhostDAGLottery");

  // Get lottery info
  const { data: lotteryInfo } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "getLotteryInfo",
  });

  // Get player tickets for current draw
  const { data: playerTickets, isLoading: ticketsLoading } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "getPlayerTickets",
    args: connectedAddress ? [connectedAddress, selectedDrawId] : undefined,
    enabled: !!connectedAddress,
  });

  // Get player winnings for selected draw
  const { data: playerWinnings, isLoading: winningsLoading } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "getPlayerWinnings",
    args: connectedAddress ? [connectedAddress, selectedDrawId] : undefined,
    enabled: !!connectedAddress,
  });

  // Get unclaimed prizes
  const { data: unclaimedPrizes } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "getUnclaimedPrizes",
    args: connectedAddress ? [connectedAddress] : undefined,
    enabled: !!connectedAddress,
  });

  const currentDrawId = lotteryInfo?.[0] || 0n;
  const availableDraws = Array.from({ length: Number(currentDrawId) + 1 }, (_, i) => BigInt(i));

  const handleClaimPrize = async (drawId: bigint) => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    try {
      await claimPrize({
        functionName: "claimPrize",
        args: [drawId],
      });

      notification.success(`Prize claimed successfully for Draw #${drawId}!`);
    } catch (error) {
      console.error("Error claiming prize:", error);
      notification.error("Failed to claim prize");
    }
  };



  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔌</div>
        <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Please connect your wallet to view your lottery dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">👤 Player Dashboard</h2>
        <p className="text-gray-400">View your tickets, winnings, and claim prizes</p>
        <div className="mt-4">
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-full px-4 py-2">
            <span className="text-blue-400 font-medium">Connected as:</span>
            <Address address={connectedAddress} size="sm" />
          </div>
        </div>
      </div>

      {/* Draw Selection */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Select Draw to View</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {availableDraws.map(drawId => (
            <button
              key={drawId.toString()}
              onClick={() => setSelectedDrawId(drawId)}
              className={`
                p-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105
                ${
                  selectedDrawId === drawId
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"
                }
              `}
            >
              Draw #{drawId.toString()}
              {drawId === currentDrawId && (
                <div className="text-xs text-green-400 mt-1">Current</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Unclaimed Prizes */}
      {unclaimedPrizes && unclaimedPrizes.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            🎉 Unclaimed Prizes
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unclaimedPrizes.length}
            </span>
          </h3>
          <div className="space-y-3">
            {unclaimedPrizes.map((prize: any, index: number) => (
              <div key={index} className="flex items-center justify-between bg-white/10 rounded-lg p-4">
                <div>
                  <div className="text-white font-semibold">Draw #{prize.drawId?.toString()}</div>
                  <div className="text-green-400 font-bold text-lg">
                    {formatEther(prize.amount || 0n)} KAS
                  </div>
                </div>
                <button
                  onClick={() => handleClaimPrize(prize.drawId)}
                  disabled={isClaimingPrize}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-600 hover:to-emerald-600 transition-all"
                >
                  {isClaimingPrize ? "🔄 Claiming..." : "💰 Claim Prize"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Tickets */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">
          🎫 Your Tickets for Draw #{selectedDrawId.toString()}
        </h3>
        
        {ticketsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : playerTickets && playerTickets.length > 0 ? (
          <div className="space-y-3">
            {playerTickets.map((ticket: any, index: number) => {
              // Note: In a real implementation, you'd need winning numbers from the draw
              // For now, we'll show the ticket without match analysis
              return (
                <div key={index} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-400 font-mono">#{index + 1}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-semibold">Main:</span>
                        {ticket.mainNumbers?.map((num: bigint, i: number) => (
                          <span key={i} className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {Number(num)}
                          </span>
                        ))}
                        <span className="text-white font-semibold ml-4">Bonus:</span>
                        <span className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {Number(ticket.bonusNumber)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {selectedDrawId < currentDrawId ? "Draw Completed" : "Pending Draw"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎫</div>
            <h4 className="text-lg font-semibold text-white mb-2">No Tickets Found</h4>
            <p className="text-gray-400">You don&apos;t have any tickets for this draw.</p>
          </div>
        )}
      </div>

      {/* Player Winnings */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">
          💰 Your Winnings for Draw #{selectedDrawId.toString()}
        </h3>
        
        {winningsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : playerWinnings && Number(playerWinnings) > 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h4 className="text-2xl font-bold text-green-400 mb-2">
              {formatEther(playerWinnings)} KAS
            </h4>
            <p className="text-gray-400">Congratulations on your winnings!</p>
            {selectedDrawId < currentDrawId && (
              <button
                onClick={() => handleClaimPrize(selectedDrawId)}
                disabled={isClaimingPrize}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105"
              >
                {isClaimingPrize ? "🔄 Claiming..." : "💰 Claim Prize"}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">💸</div>
            <h4 className="text-lg font-semibold text-white mb-2">No Winnings</h4>
            <p className="text-gray-400">
              {selectedDrawId >= currentDrawId 
                ? "This draw hasn&apos;t been completed yet." 
                : "Better luck next time!"}
            </p>
          </div>
        )}
      </div>

      {/* Player Statistics */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 text-center">📊 Your Lottery Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {playerTickets?.length || 0}
            </div>
            <div className="text-gray-400">Tickets This Draw</div>
          </div>
          
          <div>
            <div className="text-3xl font-bold text-green-400 mb-2">
              {playerWinnings ? formatEther(playerWinnings) : "0"} KAS
            </div>
            <div className="text-gray-400">Winnings This Draw</div>
          </div>
          
          <div>
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {unclaimedPrizes?.length || 0}
            </div>
            <div className="text-gray-400">Unclaimed Prizes</div>
          </div>
          
          <div>
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {availableDraws.length}
            </div>
            <div className="text-gray-400">Total Draws</div>
          </div>
        </div>
      </div>
    </div>
  );
};