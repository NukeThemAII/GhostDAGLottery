# GhostDAG Lottery UI Development Plan
## Comprehensive Frontend Architecture for Scaffold ETH 2

### Project Overview
This document outlines the complete UI development plan for the GhostDAG Lottery smart contract using Scaffold ETH 2 framework. The frontend will provide a comprehensive, real-time lottery experience with full smart contract integration, analytics, and player management.

---

## 1. Architecture Overview

### 1.1 Technology Stack
- **Framework**: Scaffold ETH 2 (Next.js + React + TypeScript)
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context + React Query for server state
- **Web3 Integration**: Scaffold ETH hooks (useScaffoldRead, useScaffoldWrite, useScaffoldEventSubscriber)
- **UI Components**: Shadcn/ui with custom lottery-specific components
- **Charts/Analytics**: Recharts or Chart.js for data visualization
- **Animations**: Framer Motion for smooth interactions

### 1.2 Design Philosophy
- **Real-time Data**: All data pulled directly from smart contract
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Accessibility**: WCAG 2.1 compliant interface
- **Performance**: Optimized for fast loading and smooth interactions
- **User Experience**: Intuitive lottery gameplay with clear feedback

---

## 2. Smart Contract Integration Map

### 2.1 Read Functions (useScaffoldRead)
```typescript
// Core Lottery State
- currentDrawId: uint256
- nextDrawTime: uint256
- accumulatedPrizePool: uint256
- analytics: Analytics struct

// Information Getters
- getLotteryInfo(): (currentDrawId, nextDrawTime, currentPrizePool, ticketsSoldForCurrentDraw)
- getDraw(drawId): Draw struct
- getTicket(ticketId): Ticket struct
- getDrawTickets(drawId): uint256[] ticket IDs
- getPlayerTickets(player): uint256[] ticket IDs
- getAnalytics(): Analytics struct
- getPlayerPrizes(player): (unclaimed, claimed)
- getDrawWinners(drawId): uint256[8] winner counts
- getExcessFunds(): uint256 (admin only)
```

### 2.2 Write Functions (useScaffoldWrite)
```typescript
// Player Functions
- purchaseTickets(ticketsData): Buy lottery tickets
- claimPrizes(ticketIds): Claim winning prizes

// Admin Functions
- pause(): Pause contract operations
- unpause(): Resume contract operations
- withdrawExcessFunds(amount): Withdraw excess funds
```

### 2.3 Events (useScaffoldEventSubscriber)
```typescript
- TicketsPurchased: Real-time ticket purchase updates
- DrawExecuted: Automatic draw completion notifications
- PrizesClaimed: Prize claim confirmations
- AdminFeeDistributed: Fee distribution tracking
- DonationReceived: Direct donation logging
- ExcessFundsWithdrawn: Admin withdrawal tracking
```

---

## 3. Component Architecture

### 3.1 Layout Components

#### Header Component
```typescript
interface HeaderProps {
  connectedAddress?: string;
  networkInfo: NetworkInfo;
}

// Features:
- Wallet connection status
- Network indicator (Kasplex L2)
- Navigation menu
- Admin panel access (if owner)
- Real-time prize pool display
```

#### Navigation Component
```typescript
// Main navigation sections:
- Dashboard (Overview)
- Play Lottery (Ticket Purchase)
- My Tickets (Player Management)
- Draw History (Results)
- Analytics (Global Stats)
- Admin Panel (Owner only)
```

### 3.2 Core Feature Components

#### 3.2.1 Lottery Dashboard
```typescript
interface DashboardProps {
  lotteryInfo: LotteryInfo;
  analytics: Analytics;
  nextDrawCountdown: number;
}

// Data Sources:
- useScaffoldRead("getLotteryInfo")
- useScaffoldRead("getAnalytics")
- useScaffoldEventSubscriber("DrawExecuted")

// Features:
- Current draw ID display
- Live countdown to next draw
- Accumulated prize pool (real-time)
- Tickets sold for current draw
- Key statistics overview
- Recent draw results
```

#### 3.2.2 Ticket Purchase Interface
```typescript
interface TicketPurchaseProps {
  currentDrawId: number;
  ticketPrice: string; // "1 KAS"
  maxTicketsPerBatch: number; // 100
}

// Components:
- NumberPicker: 5 main numbers (1-35)
- BonusPicker: 1 bonus number (1-10)
- TicketBuilder: Multiple ticket creation
- CostCalculator: Real-time cost display
- PurchaseButton: Transaction execution

// Validation:
- Unique main numbers
- Range validation (1-35 main, 1-10 bonus)
- Duplicate ticket detection
- Batch size limits (max 100)

// Data Sources:
- useScaffoldWrite("purchaseTickets")
- useScaffoldEventSubscriber("TicketsPurchased")
```

#### 3.2.3 Player Ticket Management
```typescript
interface PlayerTicketsProps {
  playerAddress: string;
  tickets: Ticket[];
  playerPrizes: PlayerPrizes;
}

// Data Sources:
- useScaffoldRead("getPlayerTickets")
- useScaffoldRead("getPlayerPrizes")
- useScaffoldRead("getTicket") for each ticket
- useScaffoldWrite("claimPrizes")

// Features:
- Ticket history with draw association
- Win/loss status indicators
- Prize amounts and claim status
- Bulk prize claiming
- Ticket filtering (by draw, status, etc.)
- Personal statistics
```

#### 3.2.4 Draw History & Results
```typescript
interface DrawHistoryProps {
  draws: Draw[];
  selectedDraw?: Draw;
}

// Data Sources:
- useScaffoldRead("getDraw") for each draw
- useScaffoldRead("getDrawWinners")
- useScaffoldRead("getDrawTickets")

// Features:
- Paginated draw list
- Detailed draw results
- Winning number displays
- Prize distribution breakdown
- Winner statistics per tier
- Historical trends
```

#### 3.2.5 Analytics Dashboard
```typescript
interface AnalyticsProps {
  analytics: Analytics;
  drawHistory: Draw[];
  playerStats?: PlayerStats;
}

// Global Analytics:
- Total draws executed
- Total tickets sold
- Total prizes distributed
- Total admin fees collected
- Unique player count
- Total volume (KAS)

// Visual Components:
- Prize distribution charts
- Player growth over time
- Draw frequency analysis
- Winning number frequency
- Prize tier statistics
```

#### 3.2.6 Admin Panel
```typescript
interface AdminPanelProps {
  isOwner: boolean;
  contractPaused: boolean;
  excessFunds: string;
}

// Owner-only Features:
- Contract pause/unpause controls
- Excess funds withdrawal
- System health monitoring
- Analytics export
- Emergency controls

// Data Sources:
- useScaffoldRead("getExcessFunds")
- useScaffoldWrite("pause", "unpause", "withdrawExcessFunds")
```

---

## 4. Real-Time Features Implementation

### 4.1 Live Updates via Events
```typescript
// Event Subscription Setup
const useRealTimeLottery = () => {
  const [lotteryState, setLotteryState] = useState();
  
  // Subscribe to all relevant events
  useScaffoldEventSubscriber({
    contractName: "GhostDAGLottery",
    eventName: "TicketsPurchased",
    listener: (logs) => {
      // Update ticket sales, player stats
      updateTicketSales(logs);
    }
  });
  
  useScaffoldEventSubscriber({
    contractName: "GhostDAGLottery",
    eventName: "DrawExecuted",
    listener: (logs) => {
      // Update draw results, reset countdown
      updateDrawResults(logs);
    }
  });
  
  // Additional event subscriptions...
};
```

### 4.2 Countdown Timer Implementation
```typescript
const useDrawCountdown = (nextDrawTime: number) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, nextDrawTime - now);
      setTimeRemaining(remaining);
      
      // Auto-refresh when draw time passes
      if (remaining === 0) {
        // Trigger data refresh
        refetchLotteryInfo();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [nextDrawTime]);
  
  return formatTime(timeRemaining);
};
```

---

## 5. UI/UX Design Specifications

### 5.1 Design System
```css
/* Color Palette */
:root {
  --primary: #6366f1; /* Indigo */
  --secondary: #8b5cf6; /* Purple */
  --accent: #f59e0b; /* Amber */
  --success: #10b981; /* Emerald */
  --warning: #f59e0b; /* Amber */
  --error: #ef4444; /* Red */
  --background: #0f172a; /* Dark slate */
  --surface: #1e293b; /* Slate */
  --text-primary: #f8fafc; /* White */
  --text-secondary: #cbd5e1; /* Light slate */
}

/* Typography Scale */
.text-display { font-size: 3.75rem; font-weight: 800; }
.text-headline { font-size: 2.25rem; font-weight: 700; }
.text-title { font-size: 1.5rem; font-weight: 600; }
.text-body { font-size: 1rem; font-weight: 400; }
.text-caption { font-size: 0.875rem; font-weight: 400; }

/* Spacing Scale */
.space-1 { margin: 0.25rem; }
.space-2 { margin: 0.5rem; }
.space-4 { margin: 1rem; }
.space-8 { margin: 2rem; }
```

### 5.2 Component Variants
```typescript
// Button Variants
const buttonVariants = {
  primary: "bg-primary hover:bg-primary/90",
  secondary: "bg-secondary hover:bg-secondary/90",
  success: "bg-success hover:bg-success/90",
  warning: "bg-warning hover:bg-warning/90",
  error: "bg-error hover:bg-error/90",
  ghost: "bg-transparent hover:bg-surface"
};

// Card Variants
const cardVariants = {
  default: "bg-surface border border-slate-700",
  elevated: "bg-surface border border-slate-600 shadow-lg",
  interactive: "bg-surface border border-slate-700 hover:border-primary transition-colors"
};
```

### 5.3 Responsive Breakpoints
```typescript
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// Mobile-first responsive design
// Stack components vertically on mobile
// Side-by-side layout on desktop
```

---

## 6. State Management Strategy

### 6.1 Global State (React Context)
```typescript
interface LotteryContextType {
  // Core lottery state
  currentDrawId: number;
  nextDrawTime: number;
  accumulatedPrizePool: string;
  
  // User state
  connectedAddress?: string;
  userTickets: Ticket[];
  userPrizes: PlayerPrizes;
  
  // UI state
  isLoading: boolean;
  error?: string;
  
  // Actions
  refreshLotteryData: () => void;
  purchaseTickets: (tickets: TicketData[]) => Promise<void>;
  claimPrizes: (ticketIds: number[]) => Promise<void>;
}
```

### 6.2 Server State (React Query)
```typescript
// Cache smart contract data with automatic refetching
const useLotteryInfo = () => {
  return useQuery({
    queryKey: ['lotteryInfo'],
    queryFn: () => scaffoldReadContract('getLotteryInfo'),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000 // Consider stale after 10 seconds
  });
};

const usePlayerTickets = (address: string) => {
  return useQuery({
    queryKey: ['playerTickets', address],
    queryFn: () => scaffoldReadContract('getPlayerTickets', [address]),
    enabled: !!address
  });
};
```

---

## 7. Performance Optimizations

### 7.1 Code Splitting
```typescript
// Lazy load heavy components
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const DrawHistory = lazy(() => import('./components/DrawHistory'));

// Wrap in Suspense with loading fallbacks
<Suspense fallback={<LoadingSpinner />}>
  <AnalyticsDashboard />
</Suspense>
```

### 7.2 Data Optimization
```typescript
// Batch multiple contract reads
const useBatchedLotteryData = () => {
  return useQueries([
    { queryKey: ['lotteryInfo'], queryFn: () => getLotteryInfo() },
    { queryKey: ['analytics'], queryFn: () => getAnalytics() },
    { queryKey: ['playerPrizes'], queryFn: () => getPlayerPrizes() }
  ]);
};

// Virtualize large lists
const VirtualizedTicketList = ({ tickets }) => {
  return (
    <FixedSizeList
      height={400}
      itemCount={tickets.length}
      itemSize={80}
      itemData={tickets}
    >
      {TicketRow}
    </FixedSizeList>
  );
};
```

---

## 8. Security Considerations

### 8.1 Input Validation
```typescript
// Client-side validation for ticket numbers
const validateTicketNumbers = (mainNumbers: number[], bonusNumber: number) => {
  // Check main numbers range (1-35)
  const validMainNumbers = mainNumbers.every(num => num >= 1 && num <= 35);
  
  // Check for duplicates
  const uniqueMainNumbers = new Set(mainNumbers).size === mainNumbers.length;
  
  // Check bonus number range (1-10)
  const validBonusNumber = bonusNumber >= 1 && bonusNumber <= 10;
  
  return validMainNumbers && uniqueMainNumbers && validBonusNumber;
};
```

### 8.2 Transaction Safety
```typescript
// Safe transaction execution with error handling
const useSafeTransaction = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const executeTransaction = async (txFunction: () => Promise<any>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await txFunction();
      
      // Wait for confirmation
      await result.wait();
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { executeTransaction, isLoading, error };
};
```

---

## 9. Testing Strategy

### 9.1 Component Testing
```typescript
// Test ticket purchase component
describe('TicketPurchase', () => {
  it('validates ticket numbers correctly', () => {
    render(<TicketPurchase />);
    
    // Test invalid main number
    fireEvent.change(screen.getByLabelText('Main Number 1'), { target: { value: '36' } });
    expect(screen.getByText('Number must be between 1 and 35')).toBeInTheDocument();
  });
  
  it('prevents duplicate main numbers', () => {
    // Test duplicate detection logic
  });
  
  it('calculates total cost correctly', () => {
    // Test cost calculation
  });
});
```

### 9.2 Integration Testing
```typescript
// Test smart contract integration
describe('Smart Contract Integration', () => {
  it('fetches lottery info correctly', async () => {
    const { result } = renderHook(() => useLotteryInfo());
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      expect(result.current.data.currentDrawId).toBeGreaterThan(0);
    });
  });
});
```

---

## 10. Deployment & DevOps

### 10.1 Environment Configuration
```typescript
// Environment-specific contract addresses
const contractAddresses = {
  localhost: "0x...", // Local Hardhat/Foundry deployment
  kasplex_testnet: "0x...", // Kasplex testnet deployment
  kasplex_mainnet: "0x..." // Future mainnet deployment
};

// Network configuration
const networks = {
  // Local development network (Hardhat/Foundry)
  localhost: {
    chainId: 31337, // Default Hardhat chain ID
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: "http://localhost:8545" // Local node
  },
  
  // Kasplex testnet configuration
  kasplex_testnet: {
    chainId: 167012,
    rpcUrl: "https://rpc.kasplextest.xyz",
    blockExplorer: "https://frontend.kasplextest.xyz",
    nativeCurrency: {
      name: "Bridged Kas",
      symbol: "KAS",
      decimals: 18
    },
    gasPrice: "2000000000000" // 2000 GWEI in wei
  }
};

// Development configuration
const developmentConfig = {
  // Local development using Hardhat for testing and development
  localNetwork: {
    framework: "hardhat", // or "foundry" based on preference
    testingScripts: true,
    hotReload: true,
    debugging: true
  },
  
  // Deployment configuration
  deployment: {
    testnet: {
      network: "kasplex_testnet",
      privateKey: process.env.KASPLEX_PRIVATE_KEY, // Store securely in .env
      gasLimit: "3000000",
      gasPrice: "2000000000000" // 2000 GWEI
    }
  }
};
```

### 10.2 Build Optimization
```json
// Next.js configuration
{
  "experimental": {
    "optimizeCss": true,
    "optimizeImages": true
  },
  "compiler": {
    "removeConsole": true
  },
  "images": {
    "formats": ["image/webp", "image/avif"]
  }
}
```

---

## 11. Implementation Timeline

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Scaffold ETH 2 project setup
- [ ] Local Hardhat/Foundry development environment setup
- [ ] Smart contract integration with local network
- [ ] Basic component structure
- [ ] Design system implementation

### Phase 2: Core Features (Week 3-4)
- [ ] Lottery dashboard
- [ ] Ticket purchase interface
- [ ] Player ticket management
- [ ] Basic analytics

### Phase 3: Advanced Features (Week 5-6)
- [ ] Draw history and results
- [ ] Advanced analytics dashboard
- [ ] Admin panel
- [ ] Real-time updates

### Phase 4: Polish & Testing (Week 7-8)
- [ ] UI/UX refinements
- [ ] Performance optimizations
- [ ] Comprehensive testing
- [ ] Documentation

### Phase 5: Deployment (Week 9)
- [ ] Kasplex testnet deployment
- [ ] Testnet integration testing
- [ ] User acceptance testing on testnet
- [ ] Production deployment preparation
- [ ] Monitoring setup
- [ ] Launch preparation

## 11.1 Development Workflow

### Local Development Setup
```bash
# Initialize Hardhat project (recommended for testing scripts)
npx hardhat init

# Or use Foundry for advanced testing
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge init
```

### Testing Strategy with Hardhat Scripts
```typescript
// scripts/test-lottery-functions.js
const { ethers } = require("hardhat");

async function testLotteryFunctions() {
  const [owner, player1, player2] = await ethers.getSigners();
  
  // Deploy contract
  const GhostDAGLottery = await ethers.getContractFactory("GhostDAGLottery");
  const lottery = await GhostDAGLottery.deploy();
  
  // Test ticket purchase
  const ticketData = {
    mainNumbers: [1, 2, 3, 4, 5],
    bonusNumber: 1
  };
  
  await lottery.connect(player1).purchaseTickets([ticketData], {
    value: ethers.parseEther("1")
  });
  
  // Test analytics
  const analytics = await lottery.getAnalytics();
  console.log("Analytics:", analytics);
  
  // Test player tickets
  const playerTickets = await lottery.getPlayerTickets(player1.address);
  console.log("Player tickets:", playerTickets);
}

// Run: npx hardhat run scripts/test-lottery-functions.js
```

### Environment Variables (.env)
```bash
# Local development
HARDHAT_NETWORK=localhost
LOCAL_RPC_URL=http://127.0.0.1:8545

# Kasplex testnet (for future deployment)
KASPLEX_PRIVATE_KEY=cf5643a2cce8338eb4dc88b6b0d7cdf46e50a1c58ed1937f0cc8135c2b47f94c
KASPLEX_RPC_URL=https://rpc.kasplextest.xyz
KASPLEX_CHAIN_ID=167012

# Contract addresses (updated after deployment)
LOCAL_CONTRACT_ADDRESS=0x...
KASPLEX_TESTNET_CONTRACT_ADDRESS=0x...
```

---

## 12. Success Metrics

### 12.1 Technical Metrics
- Page load time < 2 seconds
- Transaction success rate > 99%
- Real-time update latency < 5 seconds
- Mobile responsiveness score > 95%

### 12.2 User Experience Metrics
- Ticket purchase completion rate > 90%
- User retention rate > 70%
- Support ticket volume < 5% of transactions
- User satisfaction score > 4.5/5

---

## Conclusion

This comprehensive UI development plan provides a roadmap for building a world-class lottery interface that fully leverages the GhostDAG Lottery smart contract capabilities. The architecture emphasizes real-time data, user experience, and scalability while maintaining security and performance standards.

The modular component design allows for iterative development and easy maintenance, while the comprehensive testing strategy ensures reliability and user confidence. The implementation timeline provides a realistic path to deployment with clear milestones and deliverables.

By following this plan, the development team will create a lottery platform that not only meets current requirements but is also positioned for future enhancements and scaling as the Kasplex ecosystem grows.