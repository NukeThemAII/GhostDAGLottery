"use client";

import React, { useState } from "react";
import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const DrawHistory: React.FC = () => {
  const [selectedDrawId, setSelectedDrawId] = useState<bigint | null>(null);

  // Get current draw ID to determine range
  const { data: lotteryInfo } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "getLotteryInfo",
  });

  const currentDrawId = lotteryInfo?.[0] || 0n;

  // Get draw details for selected draw
  const { data: drawDetails, isLoading: drawDetailsLoading } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "getDrawDetails",
    args: selectedDrawId ? [selectedDrawId] : undefined,
    enabled: selectedDrawId !== null,
  });

  // Generate array of completed draws (assuming draws 0 to currentDrawId-1 are completed)
  const completedDraws = Array.from({ length: Number(currentDrawId) }, (_, i) => BigInt(i));

  const formatDate = (timestamp: bigint) => {
    if (Number(timestamp) === 0) return "Not available";
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getPrizeDistribution = (draw: any) => {
    if (!draw) return [];
    
    const [, , , , , , , prizeDistribution] = draw;
    return [
      { tier: "Jackpot (5+1)", amount: prizeDistribution?.[0] || 0n, winners: 0 },
      { tier: "2nd Prize (5+0)", amount: prizeDistribution?.[1] || 0n, winners: 0 },
      { tier: "3rd Prize (4+1)", amount: prizeDistribution?.[2] || 0n, winners: 0 },
      { tier: "4th Prize (4+0)", amount: prizeDistribution?.[3] || 0n, winners: 0 },
      { tier: "5th Prize (3+1)", amount: prizeDistribution?.[4] || 0n, winners: 0 },
      { tier: "6th Prize (3+0)", amount: prizeDistribution?.[5] || 0n, winners: 0 },
    ];
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">📊 Draw History</h2>
        <p className="text-gray-400">View past lottery draws and winning numbers</p>
      </div>

      {completedDraws.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-2xl font-bold text-white mb-2">No Completed Draws</h3>
          <p className="text-gray-400">No lottery draws have been completed yet. Check back after the first draw!</p>
        </div>
      ) : (
        <>
          {/* Draw Selection */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Select a Draw</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {completedDraws.reverse().map(drawId => (
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
                </button>
              ))}
            </div>
          </div>

          {/* Draw Details */}
          {selectedDrawId !== null && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              {drawDetailsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                </div>
              ) : drawDetails ? (
                <div className="space-y-6">
                  {/* Draw Header */}
                  <div className="text-center border-b border-white/10 pb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      🎲 Draw #{selectedDrawId.toString()}
                    </h3>
                    <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
                      <span>Draw Date: {formatDate(drawDetails[1])}</span>
                      <span>Total Prize Pool: {formatEther(drawDetails[3])} KAS</span>
                      <span>Tickets Sold: {drawDetails[4].toString()}</span>
                    </div>
                  </div>

                  {/* Winning Numbers */}
                  <div className="text-center">
                    <h4 className="text-xl font-semibold text-white mb-4">🎯 Winning Numbers</h4>
                    <div className="flex justify-center items-center space-x-4 mb-2">
                      <span className="text-white font-semibold">Main Numbers:</span>
                      <div className="flex space-x-2">
                        {drawDetails[5]?.slice(0, 5).map((num: bigint, index: number) => (
                          <div
                            key={index}
                            className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg"
                          >
                            {Number(num)}
                          </div>
                        )) || (
                          <span className="text-gray-400">Not available</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-center items-center space-x-4">
                      <span className="text-white font-semibold">Bonus Number:</span>
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                        {drawDetails[6] ? Number(drawDetails[6]) : "?"}
                      </div>
                    </div>
                  </div>

                  {/* Prize Distribution */}
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-4 text-center">💰 Prize Distribution</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getPrizeDistribution(drawDetails).map((prize, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4"
                        >
                          <div className="text-center">
                            <div className="text-lg font-semibold text-white mb-1">{prize.tier}</div>
                            <div className="text-2xl font-bold text-green-400 mb-1">
                              {formatEther(prize.amount)} KAS
                            </div>
                            <div className="text-sm text-gray-400">
                              {prize.winners} winner{prize.winners !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Draw Statistics */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="text-lg font-semibold text-white mb-3 text-center">📈 Draw Statistics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-400">{drawDetails[4]?.toString() || "0"}</div>
                        <div className="text-sm text-gray-400">Tickets Sold</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-400">
                          {formatEther(drawDetails[3] || 0n)} KAS
                        </div>
                        <div className="text-sm text-gray-400">Prize Pool</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-400">
                          {drawDetails[2] ? "Yes" : "No"}
                        </div>
                        <div className="text-sm text-gray-400">Draw Completed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-400">
                          {formatDate(drawDetails[1])}
                        </div>
                        <div className="text-sm text-gray-400">Draw Time</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">❌</div>
                  <h3 className="text-xl font-bold text-white mb-2">Draw Not Found</h3>
                  <p className="text-gray-400">Unable to load details for this draw.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};