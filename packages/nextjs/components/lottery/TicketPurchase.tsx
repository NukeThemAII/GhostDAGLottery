"use client";

import React, { useState, useEffect } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface TicketNumbers {
  mainNumbers: number[];
  bonusNumber: number;
}

export const TicketPurchase: React.FC = () => {
  const { isConnected } = useAccount();
  const [tickets, setTickets] = useState<TicketNumbers[]>([]);
  const [currentTicket, setCurrentTicket] = useState<TicketNumbers>({
    mainNumbers: [],
    bonusNumber: 0,
  });
  const [isQuickPick, setIsQuickPick] = useState(false);

  // Contract interactions
  const { writeContractAsync: buyTickets, isMining } = useScaffoldWriteContract("GhostDAGLottery");

  // Get ticket price
  const { data: ticketPrice } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "TICKET_PRICE",
  });

  // Get lottery info for validation
  const { data: lotteryInfo } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "getLotteryInfo",
  });

  const nextDrawTime = lotteryInfo?.[1] || 0n;

  // Generate random numbers for quick pick
  const generateQuickPick = (): TicketNumbers => {
    const mainNumbers: number[] = [];
    while (mainNumbers.length < 5) {
      const num = Math.floor(Math.random() * 50) + 1;
      if (!mainNumbers.includes(num)) {
        mainNumbers.push(num);
      }
    }
    mainNumbers.sort((a, b) => a - b);
    
    const bonusNumber = Math.floor(Math.random() * 12) + 1;
    
    return { mainNumbers, bonusNumber };
  };

  // Handle main number selection
  const toggleMainNumber = (number: number) => {
    setCurrentTicket(prev => {
      const newMainNumbers = prev.mainNumbers.includes(number)
        ? prev.mainNumbers.filter(n => n !== number)
        : prev.mainNumbers.length < 5
        ? [...prev.mainNumbers, number].sort((a, b) => a - b)
        : prev.mainNumbers;
      
      return { ...prev, mainNumbers: newMainNumbers };
    });
  };

  // Handle bonus number selection
  const selectBonusNumber = (number: number) => {
    setCurrentTicket(prev => ({ ...prev, bonusNumber: number }));
  };

  // Add current ticket to cart
  const addTicketToCart = () => {
    if (currentTicket.mainNumbers.length === 5 && currentTicket.bonusNumber > 0) {
      setTickets(prev => [...prev, { ...currentTicket }]);
      setCurrentTicket({ mainNumbers: [], bonusNumber: 0 });
      notification.success("Ticket added to cart!");
    } else {
      notification.error("Please select 5 main numbers and 1 bonus number");
    }
  };

  // Quick pick ticket
  const addQuickPickTicket = () => {
    const quickPickTicket = generateQuickPick();
    setTickets(prev => [...prev, quickPickTicket]);
    notification.success("Quick pick ticket added!");
  };

  // Remove ticket from cart
  const removeTicket = (index: number) => {
    setTickets(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all tickets
  const clearCart = () => {
    setTickets([]);
    setCurrentTicket({ mainNumbers: [], bonusNumber: 0 });
  };

  // Purchase tickets
  const handlePurchase = async () => {
    if (!isConnected) {
      notification.error("Please connect your wallet");
      return;
    }

    if (tickets.length === 0) {
      notification.error("No tickets in cart");
      return;
    }

    if (!ticketPrice) {
      notification.error("Unable to get ticket price");
      return;
    }

    try {
      const totalCost = ticketPrice * BigInt(tickets.length);
      
      // Prepare ticket data for contract
      const ticketData = tickets.map(ticket => ({
        mainNumbers: ticket.mainNumbers.map(n => BigInt(n)),
        bonusNumber: BigInt(ticket.bonusNumber),
      }));

      await buyTickets({
        functionName: "buyTickets",
        args: [ticketData],
        value: totalCost,
      });

      notification.success(`Successfully purchased ${tickets.length} ticket(s)!`);
      clearCart();
    } catch (error) {
      console.error("Error purchasing tickets:", error);
      notification.error("Failed to purchase tickets");
    }
  };

  // Auto-generate quick pick when enabled
  useEffect(() => {
    if (isQuickPick) {
      setCurrentTicket(generateQuickPick());
    }
  }, [isQuickPick]);

  const totalCost = ticketPrice ? formatEther(ticketPrice * BigInt(tickets.length)) : "0";
  const isDrawActive = Number(nextDrawTime) > Math.floor(Date.now() / 1000);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">🎫 Buy Lottery Tickets</h2>
        <p className="text-gray-400">Select your lucky numbers or use quick pick</p>
        {ticketPrice && (
          <div className="mt-4">
            <span className="inline-block bg-green-500/20 text-green-300 px-4 py-2 rounded-full">
              Ticket Price: {formatEther(ticketPrice)} KAS
            </span>
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔌</div>
          <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400">Please connect your wallet to purchase lottery tickets</p>
        </div>
      ) : !isDrawActive ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⏸️</div>
          <h3 className="text-2xl font-bold text-white mb-2">Ticket Sales Paused</h3>
          <p className="text-gray-400">Ticket sales are currently paused. Check back later!</p>
        </div>
      ) : (
        <>
          {/* Number Selection */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Select Numbers</h3>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isQuickPick}
                    onChange={(e) => setIsQuickPick(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-white">Quick Pick</span>
                </label>
                <button
                  onClick={addQuickPickTicket}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  🎲 Quick Pick
                </button>
              </div>
            </div>

            {/* Main Numbers (1-50) */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">
                Main Numbers (Select 5 from 1-50)
                <span className="ml-2 text-sm text-gray-400">
                  {currentTicket.mainNumbers.length}/5 selected
                </span>
              </h4>
              <div className="grid grid-cols-10 gap-2">
                {Array.from({ length: 50 }, (_, i) => i + 1).map(number => (
                  <button
                    key={number}
                    onClick={() => !isQuickPick && toggleMainNumber(number)}
                    disabled={isQuickPick}
                    className={`
                      w-10 h-10 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105
                      ${
                        currentTicket.mainNumbers.includes(number)
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                          : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"
                      }
                      ${isQuickPick ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    {number}
                  </button>
                ))}
              </div>
            </div>

            {/* Bonus Number (1-12) */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">
                Bonus Number (Select 1 from 1-12)
                <span className="ml-2 text-sm text-gray-400">
                  {currentTicket.bonusNumber > 0 ? `${currentTicket.bonusNumber} selected` : "None selected"}
                </span>
              </h4>
              <div className="grid grid-cols-12 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(number => (
                  <button
                    key={number}
                    onClick={() => !isQuickPick && selectBonusNumber(number)}
                    disabled={isQuickPick}
                    className={`
                      w-10 h-10 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105
                      ${
                        currentTicket.bonusNumber === number
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg"
                          : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"
                      }
                      ${isQuickPick ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    {number}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Ticket Button */}
            <div className="text-center">
              <button
                onClick={addTicketToCart}
                disabled={currentTicket.mainNumbers.length !== 5 || currentTicket.bonusNumber === 0}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105"
              >
                ➕ Add Ticket to Cart
              </button>
            </div>
          </div>

          {/* Ticket Cart */}
          {tickets.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">🛒 Ticket Cart ({tickets.length})</h3>
                <button
                  onClick={clearCart}
                  className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {tickets.map((ticket, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-400 font-mono">#{index + 1}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-semibold">Main:</span>
                        {ticket.mainNumbers.map(num => (
                          <span key={num} className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {num}
                          </span>
                        ))}
                        <span className="text-white font-semibold ml-4">Bonus:</span>
                        <span className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {ticket.bonusNumber}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeTicket(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>

              {/* Purchase Summary */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-white">Total Cost:</span>
                  <span className="text-2xl font-bold text-green-400">{totalCost} KAS</span>
                </div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-gray-400">Tickets:</span>
                  <span className="text-white">{tickets.length}</span>
                </div>
                <button
                  onClick={handlePurchase}
                  disabled={isMining}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
                >
                  {isMining ? "🔄 Processing..." : "💳 Purchase Tickets"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};