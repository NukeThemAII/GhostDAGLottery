# 🎰 GhostDAG Lottery DApp

A decentralized lottery application built on the Kaspa blockchain ecosystem, featuring a sophisticated 5+1 number lottery system with multiple prize tiers, automated draws, and comprehensive administration tools.

## 🌟 Features

### 🎲 Lottery System
- **5+1 Number Format**: Players select 5 main numbers (1-50) and 1 bonus number (1-10)
- **Multiple Prize Tiers**: 6 different winning combinations with varying prize amounts
- **Automated Draws**: Time-based draw scheduling with configurable intervals
- **Prize Pool Management**: Automatic prize distribution and accumulation
- **Donation System**: Community donations to boost prize pools

### 🔐 Security & Administration
- **Upgradeable Contract**: UUPS proxy pattern for future improvements
- **Pausable Operations**: Emergency stop functionality
- **Access Control**: Owner-only administrative functions
- **Reentrancy Protection**: Secure prize claiming mechanism
- **Emergency Withdrawal**: Owner emergency fund recovery

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first approach with glassmorphism effects
- **Real-time Updates**: Live contract state synchronization
- **Wallet Integration**: Seamless Web3 wallet connectivity
- **Interactive Components**: Intuitive ticket selection and purchase flow
- **Admin Dashboard**: Comprehensive lottery management interface

## 🏗️ Architecture

### Smart Contract
- **Language**: Solidity ^0.8.30
- **Framework**: Hardhat with TypeScript
- **Security**: OpenZeppelin contracts (Upgradeable, Pausable, ReentrancyGuard)
- **Pattern**: UUPS Proxy for upgradeability

### Frontend
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Web3 Integration**: Wagmi + Viem for blockchain interactions
- **State Management**: React hooks with scaffold-eth patterns
- **UI Components**: Custom component library with modern design trends

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Yarn package manager
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/NukeThemAII/GhostDAGLottery.git
   cd GhostDAGLottery
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Start local blockchain**
   ```bash
   yarn chain
   ```

4. **Deploy contracts**
   ```bash
   cd packages/hardhat
   yarn deploy --network localhost
   ```

5. **Start frontend**
   ```bash
   cd packages/nextjs
   yarn start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Local blockchain: http://localhost:8545

## 📁 Project Structure

```
GhostDAGLottery/
├── packages/
│   ├── hardhat/                 # Smart contract development
│   │   ├── contracts/
│   │   │   └── GhostDAGLottery.sol
│   │   ├── deploy/
│   │   │   └── 01_deploy_ghost_dag_lottery.ts
│   │   ├── test/
│   │   └── hardhat.config.ts
│   └── nextjs/                  # Frontend application
│       ├── app/
│       │   └── page.tsx
│       ├── components/
│       │   └── lottery/
│       │       ├── LotteryDashboard.tsx
│       │       ├── LotteryOverview.tsx
│       │       ├── TicketPurchase.tsx
│       │       ├── DrawHistory.tsx
│       │       ├── PlayerDashboard.tsx
│       │       └── AdminPanel.tsx
│       └── next.config.ts
├── README.md
└── package.json
```

## 🎮 How to Play

### For Players

1. **Connect Wallet**: Connect your Web3 wallet to the application
2. **Select Numbers**: Choose 5 main numbers (1-50) and 1 bonus number (1-10)
3. **Purchase Tickets**: Buy multiple tickets for the current draw
4. **Wait for Draw**: Draws occur automatically based on the configured interval
5. **Check Results**: View winning numbers and check your tickets
6. **Claim Prizes**: Claim any winnings from your player dashboard

### Prize Tiers

| Tier | Match | Prize Distribution |
|------|-------|-------------------|
| 1st  | 5+1   | 50% of prize pool |
| 2nd  | 5+0   | 20% of prize pool |
| 3rd  | 4+1   | 15% of prize pool |
| 4th  | 4+0   | 8% of prize pool  |
| 5th  | 3+1   | 4% of prize pool  |
| 6th  | 3+0   | 3% of prize pool  |

### For Administrators

1. **Conduct Draws**: Manually trigger draws when conditions are met
2. **Manage Settings**: Adjust ticket prices and draw intervals
3. **Monitor Operations**: View contract status and statistics
4. **Emergency Controls**: Pause operations or perform emergency withdrawals
5. **Donation Management**: Accept and manage community donations

## 🔧 Smart Contract API

### Core Functions

#### Player Functions
```solidity
// Purchase lottery tickets
function purchaseTickets(Ticket[] memory tickets) external payable

// Claim prize for a specific draw
function claimPrize(uint256 drawId) external

// Get player tickets for a draw
function getPlayerTickets(address player, uint256 drawId) external view returns (Ticket[] memory)

// Get player winnings for a draw
function getPlayerWinnings(address player, uint256 drawId) external view returns (uint256)
```

#### Admin Functions
```solidity
// Conduct a lottery draw
function conductDraw() external onlyOwner

// Set ticket price
function setTicketPrice(uint256 newPrice) external onlyOwner

// Set draw interval
function setDrawInterval(uint256 newInterval) external onlyOwner

// Pause/unpause contract
function pause() external onlyOwner
function unpause() external onlyOwner
```

#### View Functions
```solidity
// Get current lottery information
function getLotteryInfo() external view returns (uint256, uint256, uint256, uint256)

// Get draw results
function getDrawResults(uint256 drawId) external view returns (DrawResult memory)

// Get contract balance
function getContractBalance() external view returns (uint256)
```

## 🎨 UI Components

### Component Library

- **LotteryDashboard**: Main navigation hub with tabbed interface
- **LotteryOverview**: Real-time lottery statistics and game information
- **TicketPurchase**: Interactive ticket selection with quick pick functionality
- **DrawHistory**: Historical draw results and detailed statistics
- **PlayerDashboard**: Personal ticket tracking and prize management
- **AdminPanel**: Comprehensive contract administration interface

### Design System

- **Color Palette**: Custom gradient-based theme with semantic tokens
- **Typography**: Responsive font scaling with modern typefaces
- **Spacing**: Consistent spacing scale using Tailwind utilities
- **Components**: Reusable UI components with variant support
- **Animations**: Smooth transitions and micro-interactions

## 🧪 Testing

### Smart Contract Tests
```bash
cd packages/hardhat
yarn test
```

### Frontend Tests
```bash
cd packages/nextjs
yarn test
```

### Integration Tests
```bash
yarn test:integration
```

## 🚀 Deployment

### Testnet Deployment
```bash
# Deploy to Sepolia testnet
cd packages/hardhat
yarn deploy --network sepolia
```

### Mainnet Deployment
```bash
# Deploy to mainnet (requires proper configuration)
cd packages/hardhat
yarn deploy --network mainnet
```

### Frontend Deployment
```bash
# Build for production
cd packages/nextjs
yarn build

# Deploy to Vercel
yarn deploy
```

## 🔒 Security Considerations

### Smart Contract Security
- **Audited Patterns**: Uses OpenZeppelin's battle-tested contracts
- **Access Control**: Proper role-based permissions
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Integer Overflow**: Safe math operations with Solidity 0.8+
- **Emergency Mechanisms**: Pausable functionality for crisis management

### Frontend Security
- **Input Validation**: Client-side and contract-level validation
- **Wallet Security**: Secure wallet connection patterns
- **Transaction Safety**: Clear transaction confirmations and error handling
- **Data Integrity**: Real-time synchronization with blockchain state

## 📊 Performance Optimizations

### Smart Contract
- **Gas Optimization**: Efficient storage patterns and batch operations
- **Event Logging**: Comprehensive event emission for off-chain indexing
- **Proxy Pattern**: Upgradeable contracts without state migration

### Frontend
- **Code Splitting**: Lazy loading of components and routes
- **State Management**: Efficient React state patterns
- **Caching**: Smart contract call caching with wagmi
- **Bundle Optimization**: Tree shaking and minification

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   yarn test
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Consistent code formatting and linting
- **Prettier**: Automated code formatting
- **Conventional Commits**: Standardized commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Scaffold-ETH 2**: Foundation framework for rapid DApp development
- **OpenZeppelin**: Security-focused smart contract libraries
- **Hardhat**: Ethereum development environment
- **Next.js**: React framework for production applications
- **Tailwind CSS**: Utility-first CSS framework
- **Wagmi**: React hooks for Ethereum

## 📞 Support

- **Documentation**: [Project Wiki](https://github.com/NukeThemAII/GhostDAGLottery/wiki)
- **Issues**: [GitHub Issues](https://github.com/NukeThemAII/GhostDAGLottery/issues)
- **Discussions**: [GitHub Discussions](https://github.com/NukeThemAII/GhostDAGLottery/discussions)

## 🗺️ Roadmap

### Phase 1: Core Implementation ✅
- [x] Smart contract development
- [x] Basic UI implementation
- [x] Local development environment
- [x] Core lottery functionality

### Phase 2: Enhanced Features 🚧
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app development
- [ ] Integration with Kaspa mainnet

### Phase 3: Ecosystem Integration 📋
- [ ] Cross-chain compatibility
- [ ] NFT integration for special draws
- [ ] Governance token implementation
- [ ] Community-driven features

---

**Built with ❤️ for the Kaspa ecosystem**
