"use client";

import type { NextPage } from "next";
import { LotteryDashboard } from "~~/components/lottery/LotteryDashboard";

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <LotteryDashboard />
    </div>
  );
};

export default Home;
