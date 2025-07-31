# Contributing to GhostDAG Lottery

We welcome contributions to the GhostDAG Lottery project! This document provides guidelines for contributing to the codebase.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Yarn package manager
- Git
- Basic knowledge of Solidity, TypeScript, and React

### Development Setup

1. **Fork the repository**
   ```bash
   git fork https://github.com/NukeThemAII/GhostDAGLottery.git
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/GhostDAGLottery.git
   cd GhostDAGLottery
   ```

3. **Install dependencies**
   ```bash
   yarn install
   ```

4. **Set up development environment**
   ```bash
   # Terminal 1: Start local blockchain
   yarn chain
   
   # Terminal 2: Deploy contracts
   cd packages/hardhat
   yarn deploy --network localhost
   
   # Terminal 3: Start frontend
   cd packages/nextjs
   yarn start
   ```

## 📋 Development Guidelines

### Code Style

#### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Prefer functional components with hooks

#### Solidity
- Follow Solidity style guide
- Use NatSpec documentation
- Implement comprehensive error handling
- Follow security best practices
- Use OpenZeppelin contracts when possible

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

#### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

#### Examples
```bash
feat(contract): add prize tier calculation function
fix(ui): resolve ticket selection validation issue
docs(readme): update installation instructions
test(lottery): add comprehensive draw testing
```

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

## 🧪 Testing

### Smart Contract Testing

```bash
cd packages/hardhat
yarn test
```

#### Test Requirements
- All public functions must have tests
- Test both success and failure cases
- Include edge case testing
- Maintain >90% code coverage

#### Test Structure
```typescript
describe("GhostDAGLottery", function () {
  describe("Ticket Purchase", function () {
    it("should allow valid ticket purchase", async function () {
      // Test implementation
    });
    
    it("should reject invalid ticket numbers", async function () {
      // Test implementation
    });
  });
});
```

### Frontend Testing

```bash
cd packages/nextjs
yarn test
```

#### Component Testing
- Test component rendering
- Test user interactions
- Test contract integration
- Test error states

## 🔒 Security Guidelines

### Smart Contract Security

1. **Access Control**
   - Use OpenZeppelin's AccessControl
   - Implement proper role-based permissions
   - Validate all inputs

2. **Reentrancy Protection**
   - Use ReentrancyGuard for state-changing functions
   - Follow checks-effects-interactions pattern

3. **Integer Overflow**
   - Use Solidity 0.8+ built-in overflow protection
   - Validate arithmetic operations

4. **External Calls**
   - Minimize external contract interactions
   - Use proper error handling

### Frontend Security

1. **Input Validation**
   - Validate all user inputs
   - Sanitize data before contract calls

2. **Wallet Integration**
   - Use established wallet connection patterns
   - Handle connection errors gracefully

3. **Transaction Safety**
   - Provide clear transaction confirmations
   - Implement proper error handling

## 📝 Documentation

### Code Documentation

#### Solidity
```solidity
/**
 * @title GhostDAGLottery
 * @notice A decentralized lottery with 5+1 number system
 * @dev Implements UUPS upgradeable pattern
 */
contract GhostDAGLottery {
    /**
     * @notice Purchase lottery tickets for the current draw
     * @param tickets Array of ticket structs with selected numbers
     * @dev Validates ticket numbers and processes payment
     */
    function purchaseTickets(Ticket[] memory tickets) external payable {
        // Implementation
    }
}
```

#### TypeScript
```typescript
/**
 * Component for purchasing lottery tickets
 * @param onTicketPurchase - Callback function when tickets are purchased
 * @returns JSX element for ticket purchase interface
 */
export const TicketPurchase: React.FC<TicketPurchaseProps> = ({ onTicketPurchase }) => {
  // Implementation
};
```

### README Updates

When adding new features:
1. Update the features list
2. Add usage examples
3. Update API documentation
4. Include screenshots if UI changes

## 🚀 Pull Request Process

### Before Submitting

1. **Code Quality**
   - Run linting: `yarn lint`
   - Run tests: `yarn test`
   - Build successfully: `yarn build`

2. **Documentation**
   - Update relevant documentation
   - Add inline code comments
   - Update CHANGELOG.md if applicable

3. **Testing**
   - Add tests for new features
   - Ensure all tests pass
   - Test manually in development environment

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated Checks**
   - CI/CD pipeline passes
   - Code coverage maintained
   - No security vulnerabilities

2. **Code Review**
   - At least one maintainer approval
   - Address all review comments
   - Resolve merge conflicts

3. **Merge**
   - Squash commits for clean history
   - Update version if applicable
   - Deploy to staging for testing

## 🐛 Bug Reports

### Before Reporting

1. Check existing issues
2. Reproduce the bug
3. Test on latest version
4. Gather relevant information

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- Node.js: [e.g., 18.17.0]
- Wallet: [e.g., MetaMask 11.0.0]

## Additional Context
Screenshots, logs, or other relevant information
```

## 💡 Feature Requests

### Feature Request Template

```markdown
## Feature Description
Clear description of the proposed feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other solutions you've considered

## Additional Context
Any other relevant information
```

## 📞 Getting Help

- **Documentation**: Check the [README](README.md) and [Wiki](https://github.com/NukeThemAII/GhostDAGLottery/wiki)
- **Issues**: Search [existing issues](https://github.com/NukeThemAII/GhostDAGLottery/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/NukeThemAII/GhostDAGLottery/discussions)

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Special recognition for security findings

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to GhostDAG Lottery! 🎰**
