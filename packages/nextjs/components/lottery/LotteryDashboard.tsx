"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { LotteryOverview } from "./LotteryOverview";
import { TicketPurchase } from "./TicketPurchase";
import { DrawHistory } from "./DrawHistory";
import { PlayerDashboard } from "./PlayerDashboard";
import { AdminPanel } from "./AdminPanel";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type TabType = "overview" | "purchase" | "history" | "player" | "admin";

export const LotteryDashboard: React.FC = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Check if connected user is the owner for admin panel access
  const { data: owner } = useScaffoldReadContract({
    contractName: "GhostDAGLottery",
    functionName: "owner",
  });

  const isOwner = connectedAddress && owner && connectedAddress.toLowerCase() === owner.toLowerCase();

  const tabs = [
    { id: "overview" as TabType, label: "🎲 Overview", icon: "🏠" },
    { id: "purchase" as TabType, label: "🎫 Buy Tickets", icon: "🛒" },
    { id: "history" as TabType, label: "📊 Draw History", icon: "📈" },
    { id: "player" as TabType, label: "👤 My Dashboard", icon: "👤" },
    ...(isOwner ? [{ id: "admin" as TabType, label: "⚙️ Admin", icon: "🔧" }] : []),
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <LotteryOverview />;
      case "purchase":
        return <TicketPurchase />;
      case "history":
        return <DrawHistory />;
      case "player":
        return <PlayerDashboard />;
      case "admin":
        return isOwner ? <AdminPanel /> : <div>Access Denied</div>;
      default:
        return <LotteryOverview />;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-4">
            👻 GhostDAG Lottery
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            Decentralized lottery powered by Kasplex EVM L2
          </p>
          
          {/* Connection Status */}
          <div className="flex justify-center items-center space-x-4 mb-8">
            {isConnected ? (
              <div className="flex items-center space-x-2 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-full px-4 py-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-medium">Connected:</span>
                <Address address={connectedAddress} size="sm" />
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-full px-4 py-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-red-400 font-medium">Please connect your wallet</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative px-6 py-3 rounded-2xl font-medium transition-all duration-300 transform hover:scale-105
                ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-white/10 backdrop-blur-sm border border-white/20 text-gray-300 hover:bg-white/20 hover:text-white"
                }
              `}
            >
              <span className="flex items-center space-x-2">
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </span>
              {activeTab === tab.id && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-20 animate-pulse"></div>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};