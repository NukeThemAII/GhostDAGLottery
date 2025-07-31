Okay, Gemini. Here is a guide for a Builder AI Agent to implement the `GhostDAGLottery v1.2.1` contract functions and hooks using the Scaffold ETH 2 framework.

This guide assumes the AI agent has already deployed the `GhostDAGLottery` contract and has access to its ABI (Application Binary Interface) and deployed address.

### 1. Project Setup (Scaffold ETH 2 Basics)

1.  **Initialize Scaffold ETH 2:** Ensure a Scaffold ETH 2 project is set up. This typically involves cloning the repository, installing dependencies (`yarn install`), and configuring the development environment (Hardhat/Anvil for local blockchain).
2.  **Contract Integration:**
    *   Place the `GhostDAGLottery` contract's ABI (usually a JSON file) into the `packages/nextjs/contracts/` directory of the Scaffold ETH 2 project. Name it appropriately, e.g., `GhostDAGLotteryABI.ts` or similar.
    *   Update the contract configuration in `packages/nextjs/contracts/deployedContracts.ts` (or the relevant config file) to include the deployed address and ABI of `GhostDAGLottery` for the target network (e.g., `localhost`, `kasplex_testnet`).

### 2. Core UI Components and Hooks

Scaffold ETH 2 provides `useScaffoldContract`, `useScaffoldRead`, `useScaffoldWrite`, and `useScaffoldEventSubscriber` hooks. The AI agent should use these to interact with the contract.

#### A. Lottery Overview Dashboard

*   **Purpose:** Display current lottery status.
*   **Data to Fetch (useScaffoldRead):**
    *   `currentDrawId` (uint256)
    *   `nextDrawTime` (uint256)
    *   `accumulatedPrizePool` (uint256)
    *   `getLotteryInfo()` (tuple) - Provides all the above in one call.
    *   `getAnalytics()` (Analytics struct) - For overall stats like total draws, tickets sold, volume, players, fees, prizes distributed.
*   **Display:**
    *   Current Draw ID
    *   Countdown Timer to Next Draw (`nextDrawTime`)
    *   Accumulated Prize Pool (formatted KAS)
    *   Key Analytics Metrics

#### B. Ticket Purchase Interface

*   **Purpose:** Allow users to buy tickets.
*   **Components:**
    *   Input fields for 5 main numbers (1-35, validation for range and uniqueness).
    *   Input field for 1 bonus number (1-10, validation).
    *   Ability to add multiple ticket sets.
    *   Display total cost based on `TICKET_PRICE` constant (hardcoded or fetched if made dynamic).
*   **Hook to Use (useScaffoldWrite):**
    *   `purchaseTickets(uint8[6][] _ticketsData)`: Call this function with an array of ticket arrays (e.g., `[[n1,n2,n3,n4,n5,b1], [n1,n2,n3,n4,n5,b1]]`). The AI agent needs to format the user's input into this structure.
    *   **Parameters:**
        *   `_ticketsData`: The array of ticket number arrays.
    *   **Value:** Set the `value` option in `useScaffoldWrite` to `totalCost` (calculated as `TICKET_PRICE * number_of_tickets`).
*   **UX Considerations:**
    *   Show transaction status (pending, success, error).
    *   On success, update the UI to reflect the new tickets (might require a refresh or listening for `TicketsPurchased` event).

#### C. Draw History & Results Viewer

*   **Purpose:** Display past draw results.
*   **Components:**
    *   List of past draw IDs (from 1 to `currentDrawId - 1`).
    *   Ability to select a draw ID.
*   **Data to Fetch (useScaffoldRead):**
    *   `getDraw(uint256 _drawId)`: Call this with the selected draw ID to get the full `Draw` struct.
        *   Display `winningMainNumbers`, `winningBonusNumber`.
        *   Display `timestamp` (format as readable date/time).
        *   Display `effectivePrizePool`.
        *   Display `winnerCounts` (array of 8).
        *   Display `prizeAmounts` (array of 8).
        *   Display `totalTickets`.
    *   `getDrawTickets(uint256 _drawId)`: (Optional/Advanced) Get list of all ticket IDs for the draw (requires further processing to display player addresses or link to tickets).
*   **UX Considerations:**
    *   Paginate the list of draw IDs if there are many.
    *   Format numbers (KAS amounts, timestamps) for readability.

#### D. Player Ticket Management & Prize Claiming

*   **Purpose:** Show a player's tickets and allow claiming prizes.
*   **Components:**
    *   Display connected wallet address.
*   **Data to Fetch (useScaffoldRead):**
    *   `getPlayerTickets(address _player)`: Call with the connected user's address to get an array of their ticket IDs.
    *   Loop through the ticket IDs:
        *   `getTicket(uint256 _ticketId)`: For each ID, get the `Ticket` struct.
            *   Display ticket numbers (`mainNumbers`, `bonusNumber`).
            *   Display associated `drawId`.
            *   Display `matchCount` and `bonusMatch`.
            *   Display `claimed` status.
            *   Display `prizeAmount` (if already calculated and stored upon claim, or calculate it dynamically if needed and the draw is executed).
*   **Hook to Use (useScaffoldWrite):**
    *   `claimPrizes(uint256[] _ticketIds)`: Allow the user to select *unclaimed, winning* tickets and call this function.
    *   **Parameters:**
        *   `_ticketIds`: An array of the selected ticket IDs.
    *   **UX Considerations:**
        *   Show transaction status.
        *   On success, update the UI to reflect claimed status (listen for `PrizesClaimed` event).
        *   Calculate potential prize total before claiming (based on `draw.prizeAmounts` for the ticket's tier if the draw is executed and the ticket is a winner).

#### E. Player Analytics Dashboard

*   **Purpose:** Show personalized stats for the connected player.
*   **Data to Fetch (useScaffoldRead):**
    *   `getPlayerPrizes(address _player)`: Call with the connected user's address.
        *   Display `unclaimed` KAS total.
        *   Display `claimed` KAS total.
    *   `getPlayerTickets(address _player)`: Use the list of ticket IDs to show:
        *   Total number of tickets purchased.
        *   (Optional) List recent tickets or tickets for the current/upcoming draw.

#### F. Admin Panel (Owner Functions)

*   **Purpose:** Provide controls for the contract owner.
*   **Components:** Visible only to the owner (check connected address against `owner()`).
*   **Hooks to Use (useScaffoldWrite):**
    *   `pause()`: Button to pause the contract.
    *   `unpause()`: Button to unpause the contract.
    *   `withdrawExcessFunds(uint256 _amount)`: Input for amount, button to withdraw.
        *   Use `getExcessFunds()` (read hook) to display available amount.
    *   `_authorizeUpgrade(address newImplementation)`: (Complex, usually part of a dedicated upgrade flow).

### 3. Event Listeners for Real-Time Updates

*   **Purpose:** Update the UI dynamically when contract events occur.
*   **Hook to Use (useScaffoldEventSubscriber):**
    *   Subscribe to the following events emitted by `GhostDAGLottery`:
        *   `TicketsPurchased`: Update player's ticket list, overall ticket sales analytics.
        *   `DrawExecuted`: Update draw history, current draw ID, next draw time, prize pool, analytics (total draws, prize distribution details if derived).
        *   `PrizesClaimed`: Update player's claimed prize total, ticket claimed status, overall prize distribution analytics.
        *   `AdminFeeDistributed`: Update admin fee analytics.
        *   `DonationReceived`: (Optional) Log or display donations.
        *   `ExcessFundsWithdrawn`: (Optional/Admin) Update owner's fund tracking.
*   **Implementation:** Use `useScaffoldEventSubscriber` for each event. Define a callback function that updates the relevant state variables in the frontend (e.g., using `useState` or by invalidating/re-fetching queries if using React Query). The callback receives the event data (like `player`, `drawId`, `ticketIds`, `amount`, etc.) which can be used to update specific parts of the UI.

### 4. Summary for the AI Agent

1.  **Identify Contract Functions:** Parse the ABI to list all `read`, `write`, and `event` definitions.
2.  **Map Functions to UI:**
    *   Use `useScaffoldRead` for displaying state (`currentDrawId`, `accumulatedPrizePool`, `getDraw`, `getTicket`, `getAnalytics`, `getPlayerPrizes`, `getPlayerTickets`, `getDrawTickets`, `getExcessFunds`, `getLotteryInfo`).
    *   Use `useScaffoldWrite` for user interactions (`purchaseTickets`, `claimPrizes`) and owner functions (`pause`, `unpause`, `withdrawExcessFunds`).
    *   Use `useScaffoldEventSubscriber` for listening to contract events (`TicketsPurchased`, `DrawExecuted`, `PrizesClaimed`, `AdminFeeDistributed`, `DonationReceived`, `ExcessFundsWithdrawn`) to trigger UI updates.
3.  **Build Components:** Create React components for each major section (Overview, Purchase, History, Player Dashboard, Admin Panel).
4.  **Connect Hooks:** Wire the Scaffold ETH 2 hooks into the components to fetch data, send transactions, and listen for events.
5.  **Handle Data Formatting:** Format large numbers (KAS amounts), timestamps, and arrays for user-friendly display.
6.  **Manage State:** Use React state or state management libraries to hold UI-specific data and update it based on hook results and events.
7.  **Ensure Security:** Implement checks (e.g., only show admin panel to the owner) and handle errors gracefully.

By following this guide, the AI agent can systematically build a comprehensive frontend for the `GhostDAGLottery` contract using the capabilities provided by Scaffold ETH 2.