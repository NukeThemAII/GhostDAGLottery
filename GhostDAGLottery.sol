// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30; // Updated to the latest specified version

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title GhostDAGLottery - A Perpetual Lottery on Kasplex EVM (Kaspa L2)
 * @dev A lottery game where players pick 5 main numbers (1-35) and 1 bonus number (1-10).
 *      Draws are executed automatically based on time. Prizes are claimable for winning tickets.
 *      This contract is upgradeable by the owner and includes pause functionality and excess fund withdrawal.
 *      Designed for the Kasplex EVM L2, using KAS as the native currency and for gas fees.
 * @author Qwen3 Coder (Original source code)
 * @version 1.2.1
 *
 * Game Rules:
 * - Pick 5 unique main numbers from 1 to 35.
 * - Pick 1 bonus number from 1 to 10.
 * - Draws happen automatically every X minutes (configurable).
 * - Match counts are based on main numbers only.
 * - Prizes are awarded based on matches + bonus number.
 *
 * Prize Tiers (based on effective prize pool):
 * 1. 5 Matches + Bonus: Jackpot (50%)
 * 2. 5 Matches: 2nd Prize (20%)
 * 3. 4 Matches + Bonus: 3rd Prize (10%)
 * 4. 4 Matches: 4th Prize (8%)
 * 5. 3 Matches + Bonus: 5th Prize (6%)
 * 6. 3 Matches: 6th Prize (4%)
 * 7. 2 Matches + Bonus: 7th Prize (1.5%)
 * 8. 2 Matches: 8th Prize (0.5%)
 *
 * Economic Model:
 * - Ticket Price: 1 KAS (configurable via TICKET_PRICE constant).
 * - Admin Fee: 1% of ticket sales (sent to owner automatically).
 * - Remaining 99% forms the effective prize pool for the draw.
 * - Unclaimed prizes roll over to the next draw's pool.
 * - Direct sends to the contract are logged but do not automatically increase the prize pool.
 *   Owner can withdraw these via `withdrawExcessFunds`.
 */
contract GhostDAGLottery is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    using Math for uint256;
    using EnumerableSet for EnumerableSet.UintSet;

    // ============ CONSTANTS - ADJUST THESE FOR CONFIGURATION ============

    // --- Lottery Parameters ---
    /// @notice Price per ticket in KAS (wei). Set to 1 KAS.
    /// @dev To change ticket price, modify this constant.
    uint256 public constant TICKET_PRICE = 1 ether; // 1 KAS per ticket

    /// @notice Number of main numbers on a ticket.
    uint256 public constant MAIN_NUMBERS_PER_TICKET = 5;

    /// @notice Number of bonus numbers on a ticket.
    uint256 public constant BONUS_NUMBERS_PER_TICKET = 1;

    /// @notice Minimum allowed value for a main number.
    uint256 public constant MIN_MAIN_NUMBER = 1;

    /// @notice Maximum allowed value for a main number.
    uint256 public constant MAX_MAIN_NUMBER = 35;

    /// @notice Minimum allowed value for a bonus number.
    uint256 public constant MIN_BONUS_NUMBER = 1;

    /// @notice Maximum allowed value for a bonus number.
    uint256 public constant MAX_BONUS_NUMBER = 10;

    /// @notice Maximum number of tickets a player can buy in a single transaction.
    /// @dev Helps prevent excessive gas usage in purchaseTickets.
    uint256 public constant MAX_TICKETS_PER_BATCH = 100;

    // --- Timing Configuration ---
    /// @notice Interval between draws in seconds.
    /// @dev Set to 1 minute (60 seconds) for testing.
    ///      For production (e.g., weekly draws), change to 604800 (7 days).
    uint256 public constant DRAW_INTERVAL = 1 minutes; // 60 seconds for testing

    // --- Economic Model (basis points: 10000 = 100%) ---
    /// @notice Percentage of ticket sales sent to the admin as a fee (1% = 100 basis points).
    uint256 public constant ADMIN_FEE_PERCENTAGE = 100; // 1%

    // --- Prize Distribution (basis points of the effective 99% prize pool) ---
    /// @notice Total prize percentage distributed (must sum to <= 9900).
    /// @dev 5000+2000+1000+800+600+400+150+50 = 9900 (99% of effective pool)
    uint256 public constant JACKPOT_PERCENTAGE = 5000; // 50%
    uint256 public constant SECOND_PRIZE_PERCENTAGE = 2000; // 20%
    uint256 public constant THIRD_PRIZE_PERCENTAGE = 1000; // 10%
    uint256 public constant FOURTH_PRIZE_PERCENTAGE = 800; // 8%
    uint256 public constant FIFTH_PRIZE_PERCENTAGE = 600; // 6%
    uint256 public constant SIXTH_PRIZE_PERCENTAGE = 400; // 4%
    uint256 public constant SEVENTH_PRIZE_PERCENTAGE = 150; // 1.5%
    uint256 public constant EIGHTH_PRIZE_PERCENTAGE = 50; // 0.5%

    // ============ STRUCTS ============
    /// @notice Represents a single lottery ticket purchased by a player.
    struct Ticket {
        address player; // Address of the player who owns the ticket.
        uint8[MAIN_NUMBERS_PER_TICKET] mainNumbers; // The 5 main numbers selected by the player.
        uint8 bonusNumber; // The bonus number selected by the player.
        uint256 drawId; // The ID of the draw this ticket is for.
        bool claimed; // Flag indicating if the prize for this ticket has been claimed.
        uint256 purchaseTime; // Timestamp when the ticket was purchased.
        uint256 prizeAmount; // The amount of KAS won by this ticket (set upon claim).
        uint8 matchCount; // Number of main numbers that matched the winning numbers.
        bool bonusMatch; // Flag indicating if the bonus number matched.
    }

    /// @notice Represents the results and data for a single lottery draw.
    struct Draw {
        uint256 id; // Unique identifier for the draw.
        uint8[MAIN_NUMBERS_PER_TICKET] winningMainNumbers; // The 5 winning main numbers.
        uint8 winningBonusNumber; // The winning bonus number.
        uint256 timestamp; // Timestamp when the draw was executed.
        uint256 totalPrizePoolBeforeFees; // Snapshot of prize pool before admin fee deduction.
        uint256 effectivePrizePool; // Prize pool available for distribution (after admin fee).
        bool executed; // Flag indicating if the draw has been executed.
        uint256 totalTickets; // Total number of tickets sold for this draw.
        uint256 randomSeed; // The seed used to generate the winning numbers for this draw.
        // Winner counts for each prize tier (indices 0-7 correspond to tiers 1-8).
        uint256[8] winnerCounts;
        // Prize per winner for each tier (indices 0-7). Calculated as pool_share / winnerCounts[i].
        uint256[8] prizeAmounts;
    }

    /// @notice Stores overall statistics for the lottery.
    struct Analytics {
        uint256 totalDraws; // Total number of draws executed.
        uint256 totalTicketsSold; // Cumulative number of tickets sold.
        uint256 totalPrizesDistributed; // Cumulative KAS paid out as prizes.
        uint256 totalAdminFees; // Cumulative KAS collected as admin fees.
        uint256 totalPlayers; // Number of unique players who have purchased tickets.
        uint256 totalVolume; // Total KAS spent on tickets.
    }

    // ============ STATE VARIABLES ============
    /// @notice The ID of the draw that will be executed next.
    uint256 public currentDrawId;

    /// @notice The total KAS available for prize payouts. Includes rollovers.
    /// @dev This is the core accounting variable for prize funds.
    uint256 public accumulatedPrizePool;

    /// @notice The timestamp at which the next draw is scheduled to execute.
    uint256 public nextDrawTime;

    // --- Counters ---
    /// @notice A global, incrementing counter for assigning unique ticket IDs.
    uint256 private ticketCounter;

    // --- Analytics ---
    /// @notice Struct holding various lottery statistics.
    Analytics public analytics;

    // --- Mappings ---
    /// @notice Maps a draw ID to its Draw struct containing results and data.
    mapping(uint256 => Draw) public draws;

    /// @notice Maps a ticket ID to its Ticket struct.
    mapping(uint256 => Ticket) public tickets;

    /// @notice Maps a draw ID to an array of all ticket IDs sold for that draw.
    mapping(uint256 => uint256[]) public drawTickets;

    /// @notice Maps a player address to an array of all ticket IDs they own.
    mapping(address => uint256[]) public playerTickets;

    /// @notice Tracks whether an address has ever purchased a ticket.
    mapping(address => bool) public hasPlayed;

    // --- Winner Tracking (Optional, for potential future optimizations) ---
    /// @notice Maps a draw ID to a set of winning ticket IDs for that draw.
    /// @dev Currently not used in core logic but could be for advanced features.
    mapping(uint256 => EnumerableSet.UintSet) private drawWinners;

    // ============ EVENTS ============
    /// @notice Emitted when a player successfully purchases tickets.
    event TicketsPurchased(
        address indexed player,
        uint256 indexed drawId,
        uint256[] ticketIds,
        uint256 totalCost
    );

    /// @notice Emitted when a draw is executed and winners are determined.
    event DrawExecuted(
        uint256 indexed drawId,
        uint8[MAIN_NUMBERS_PER_TICKET] winningMainNumbers,
        uint8 winningBonusNumber,
        uint256 totalPrizePoolBeforeFees,
        uint256 effectivePrizePool
    );

    /// @notice Emitted when a player successfully claims prizes for their tickets.
    event PrizesClaimed(
        address indexed player,
        uint256[] ticketIds, // Only the IDs of tickets that actually won prizes.
        uint256 totalAmount
    );

    /// @notice Emitted when the admin fee is automatically sent to the owner.
    event AdminFeeDistributed(
        address indexed owner,
        uint256 amount
    );

    /// @notice Emitted when KAS is sent directly to the contract address (e.g., donations).
    event DonationReceived(
        address indexed donor,
        uint256 amount
    );

    /// @notice Emitted when the owner withdraws excess funds (not part of prize pool).
    event ExcessFundsWithdrawn(
        address indexed owner,
        uint256 amount
    );

    // ============ INITIALIZATION ============
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract, setting the initial owner and starting state.
    /// @param _initialOwner The address that will be granted the 'owner' role.
    function initialize(address _initialOwner) public initializer {
        __Ownable_init(_initialOwner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        currentDrawId = 1;
        ticketCounter = 1;
        // Schedule the first draw based on the configured interval.
        nextDrawTime = block.timestamp + DRAW_INTERVAL;
    }

    // ============ CORE FUNCTIONS ============
    /**
     * @notice Purchase lottery tickets. Automatically triggers draw execution if due.
     * @param _ticketsData An array of ticket data, where each ticket is an array of 6 numbers:
     *                     [main_num1, main_num2, main_num3, main_num4, main_num5, bonus_num].
     *                     Main numbers must be unique and within 1-35. Bonus number within 1-10.
     */
    function purchaseTickets(
        uint8[6][] calldata _ticketsData // Array of [5 main nums, 1 bonus num] arrays
    ) external payable nonReentrant whenNotPaused {
        require(_ticketsData.length > 0, "Must purchase at least one ticket");
        require(_ticketsData.length <= MAX_TICKETS_PER_BATCH, "Exceeds max tickets per batch");
        uint256 totalCost = TICKET_PRICE * _ticketsData.length;
        require(msg.value == totalCost, "Incorrect payment amount");

        // --- Autonomous Draw Execution ---
        // Check if it's time for the next scheduled draw and execute it.
        if (block.timestamp >= nextDrawTime) {
            _executeDraw();
        }

        // --- Fee Distribution & Prize Pool Calculation ---
        // Calculate and immediately send the admin fee.
        uint256 adminFee = (totalCost * ADMIN_FEE_PERCENTAGE) / 10000;
        uint256 prizePoolAddition = totalCost - adminFee; // Remaining 99% goes to prize pool.

        if (adminFee > 0) {
            (bool success, ) = owner().call{value: adminFee}("");
            require(success, "Admin fee transfer failed");
            analytics.totalAdminFees += adminFee;
            emit AdminFeeDistributed(owner(), adminFee);
        }
        // Add the remaining funds to the accumulated prize pool for current/next draw.
        accumulatedPrizePool += prizePoolAddition;

        // --- Ticket Validation and Creation ---
        uint256[] memory newTicketIds = new uint256[](_ticketsData.length);
        for (uint256 i = 0; i < _ticketsData.length; i++) {
            // Validate structure: must be 6 elements per ticket.
            require(_ticketsData[i].length == 6, "Invalid ticket data structure");

            uint8[MAIN_NUMBERS_PER_TICKET] memory mainNums;
            uint8 bonusNum = _ticketsData[i][5]; // Last element is bonus

            for (uint256 j = 0; j < MAIN_NUMBERS_PER_TICKET; j++) {
                mainNums[j] = _ticketsData[i][j];
            }

            _validateTicketNumbers(mainNums, bonusNum);

            uint256 ticketId = ticketCounter++;
            newTicketIds[i] = ticketId;
            Ticket storage ticket = tickets[ticketId];
            ticket.player = msg.sender;
            ticket.drawId = currentDrawId; // Tickets are for the current, unexecuted draw.
            ticket.purchaseTime = block.timestamp;
            ticket.mainNumbers = mainNums;
            ticket.bonusNumber = bonusNum;

            // Add ticket to relevant tracking mappings.
            drawTickets[currentDrawId].push(ticketId);
            playerTickets[msg.sender].push(ticketId);
        }

        // --- Analytics and State Updates ---
        if (!hasPlayed[msg.sender]) {
            hasPlayed[msg.sender] = true;
            analytics.totalPlayers++;
        }
        analytics.totalTicketsSold += _ticketsData.length;
        analytics.totalVolume += totalCost;
        emit TicketsPurchased(msg.sender, currentDrawId, newTicketIds, totalCost);
    }

    /**
     * @notice Allows players to claim prizes for their winning tickets.
     * @param _ticketIds An array of ticket IDs owned by the caller to check and claim prizes for.
     */
    function claimPrizes(uint256[] calldata _ticketIds) external nonReentrant whenNotPaused {
        require(_ticketIds.length > 0, "No tickets to claim");
        // Limit batch size to prevent excessive gas usage in a single call.
        require(_ticketIds.length <= 50, "Too many tickets to claim in one batch");

        uint256 totalPrize = 0;
        // Pre-allocate array for valid winning ticket IDs to emit in the event.
        uint256[] memory winningTicketIds = new uint256[](_ticketIds.length);
        uint256 winningCount = 0;

        for (uint256 i = 0; i < _ticketIds.length; i++) {
            uint256 ticketId = _ticketIds[i];
            require(ticketId > 0 && ticketId < ticketCounter, "Invalid ticket ID");
            Ticket storage ticket = tickets[ticketId];
            require(ticket.player == msg.sender, "Not ticket owner");
            require(!ticket.claimed, "Prize already claimed");
            require(draws[ticket.drawId].executed, "Draw not yet executed");

            uint256 prizeAmount = _calculateTicketPrize(ticketId);
            if (prizeAmount > 0) {
                ticket.claimed = true;
                ticket.prizeAmount = prizeAmount; // Record the amount claimed for the ticket.
                totalPrize += prizeAmount;
                winningTicketIds[winningCount] = ticketId; // Track winning ticket ID.
                winningCount++;
            }
        }
        require(totalPrize > 0, "No prizes to claim for these tickets");

        // --- Final Checks and Transfer ---
        // Ensure the contract has enough KAS to pay the prize.
        require(address(this).balance >= accumulatedPrizePool, "Contract balance check failed");
        require(accumulatedPrizePool >= totalPrize, "Insufficient prize pool for claim");
        // Deduct the claimed amount from the tracked prize pool.
        accumulatedPrizePool -= totalPrize;
        analytics.totalPrizesDistributed += totalPrize;

        (bool success, ) = msg.sender.call{value: totalPrize}("");
        require(success, "Prize transfer failed");

        // Emit event with only the ticket IDs that actually won prizes.
        // Create a correctly sized array for the event.
        uint256[] memory finalWinningTicketIds = new uint256[](winningCount);
        for (uint256 i = 0; i < winningCount; i++) {
            finalWinningTicketIds[i] = winningTicketIds[i];
        }
        emit PrizesClaimed(msg.sender, finalWinningTicketIds, totalPrize);
    }

    // ============ OWNER FUNCTIONS ============
    /**
     * @notice Pause the contract. Only callable by the owner.
     * Stops ticket purchases and prize claims. Draw execution is also paused.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract. Only callable by the owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Withdraw any funds sent directly to the contract that are not part of the prize pool.
     * This prevents accidental sends or donations from disrupting the lottery's financial model.
     * @param _amount The amount of KAS to withdraw.
     */
    function withdrawExcessFunds(uint256 _amount) external onlyOwner {
        // Calculate the actual excess funds available.
        // Excess = Total Contract Balance - Tracked Prize Pool
        uint256 excessFunds = address(this).balance - accumulatedPrizePool;
        require(_amount <= excessFunds, "Insufficient excess funds");
        require(_amount > 0, "Amount must be greater than 0");

        (bool success, ) = owner().call{value: _amount}("");
        require(success, "Excess fund withdrawal failed");
        emit ExcessFundsWithdrawn(owner(), _amount);
    }

    // ============ INTERNAL FUNCTIONS ============
    /**
     * @dev Internal function to execute a draw automatically based on time.
     * This function determines winning numbers, calculates prizes, and handles rollovers.
     */
    function _executeDraw() internal whenNotPaused {
        // Ensure there were tickets sold for the draw being executed.
        if (drawTickets[currentDrawId].length == 0) {
            // No tickets sold. Rollover the time and the existing prize pool.
            nextDrawTime = block.timestamp + DRAW_INTERVAL;
            currentDrawId++; // Increment ID even for empty draws for consistency.
            return;
        }

        // --- Generate Winning Numbers ---
        (uint8[MAIN_NUMBERS_PER_TICKET] memory winningMainNumbers, uint8 winningBonusNumber, uint256 randomSeed) =
            _generateSecureRandomNumbers();

        // --- Initialize Draw Data ---
        Draw storage draw = draws[currentDrawId];
        draw.id = currentDrawId;
        draw.timestamp = block.timestamp;
        // Snapshot the prize pool before this draw's calculations.
        draw.totalPrizePoolBeforeFees = accumulatedPrizePool;
        // The full accumulated pool is available for this draw's prize distribution.
        draw.effectivePrizePool = accumulatedPrizePool;
        draw.executed = true;
        draw.totalTickets = drawTickets[currentDrawId].length;
        draw.randomSeed = randomSeed;
        draw.winningMainNumbers = winningMainNumbers;
        draw.winningBonusNumber = winningBonusNumber;

        // --- Process Winners and Calculate Prize Amounts ---
        _processWinners(currentDrawId, winningMainNumbers, winningBonusNumber, draw.effectivePrizePool);

        // --- Calculate Rollover ---
        uint256 totalDistributedPrizes = _calculateTotalDistributedPrizes(currentDrawId);
        // Rollover is the difference between the effective pool and what was distributed.
        uint256 rolloverAmount = draw.effectivePrizePool - totalDistributedPrizes;

        emit DrawExecuted(
            currentDrawId,
            winningMainNumbers,
            winningBonusNumber,
            draw.totalPrizePoolBeforeFees,
            draw.effectivePrizePool
        );

        // --- Reset for Next Draw ---
        // The rollover amount becomes the new accumulated prize pool for the next draw.
        accumulatedPrizePool = rolloverAmount;
        // Schedule the next draw.
        nextDrawTime = block.timestamp + DRAW_INTERVAL;
        analytics.totalDraws++;
        currentDrawId++;
    }

    /**
     * @dev Processes all tickets for a given draw to count winners and calculate prize amounts.
     * @param _drawId The ID of the draw to process.
     * @param _winningMainNumbers The 5 winning main numbers for the draw.
     * @param _winningBonusNumber The winning bonus number for the draw.
     * @param _effectivePrizePool The total KAS available for prize distribution in this draw.
     */
    function _processWinners(
        uint256 _drawId,
        uint8[MAIN_NUMBERS_PER_TICKET] memory _winningMainNumbers,
        uint8 _winningBonusNumber,
        uint256 _effectivePrizePool
    ) internal {
        Draw storage draw = draws[_drawId];
        uint256[] memory ticketIds = drawTickets[_drawId];

        // --- Count Winners for Each Tier ---
        for (uint256 i = 0; i < ticketIds.length; i++) {
            uint256 ticketId = ticketIds[i];
            Ticket storage ticket = tickets[ticketId];

            uint256 matches = _countMatches(ticket.mainNumbers, _winningMainNumbers);
            ticket.matchCount = uint8(matches);
            ticket.bonusMatch = (ticket.bonusNumber == _winningBonusNumber);

            // Determine prize tier based on matches and bonus.
            uint256 prizeTierIndex = type(uint256).max; // Initialize to invalid index
            if (matches == 5 && ticket.bonusMatch) {
                prizeTierIndex = 0; // Jackpot
            } else if (matches == 5) {
                prizeTierIndex = 1; // 2nd Prize
            } else if (matches == 4 && ticket.bonusMatch) {
                prizeTierIndex = 2; // 3rd Prize
            } else if (matches == 4) {
                prizeTierIndex = 3; // 4th Prize
            } else if (matches == 3 && ticket.bonusMatch) {
                prizeTierIndex = 4; // 5th Prize
            } else if (matches == 3) {
                prizeTierIndex = 5; // 6th Prize
            } else if (matches == 2 && ticket.bonusMatch) {
                prizeTierIndex = 6; // 7th Prize
            } else if (matches == 2) {
                prizeTierIndex = 7; // 8th Prize
            }

            if (prizeTierIndex != type(uint256).max) {
                draw.winnerCounts[prizeTierIndex]++;
                // Optional: Add to winner set for potential future optimizations
                // drawWinners[_drawId].add(ticketId);
            }
        }

        // --- Calculate Prize Amounts Per Winner for Each Tier ---
        // Distribute the specified percentage of the effective prize pool to each tier.
        uint256[8] memory prizePoolDistribution = [
            (_effectivePrizePool * JACKPOT_PERCENTAGE) / 10000,
            (_effectivePrizePool * SECOND_PRIZE_PERCENTAGE) / 10000,
            (_effectivePrizePool * THIRD_PRIZE_PERCENTAGE) / 10000,
            (_effectivePrizePool * FOURTH_PRIZE_PERCENTAGE) / 10000,
            (_effectivePrizePool * FIFTH_PRIZE_PERCENTAGE) / 10000,
            (_effectivePrizePool * SIXTH_PRIZE_PERCENTAGE) / 10000,
            (_effectivePrizePool * SEVENTH_PRIZE_PERCENTAGE) / 10000,
            (_effectivePrizePool * EIGHTH_PRIZE_PERCENTAGE) / 10000
        ];

        // Calculate the prize per winner for each tier by dividing the tier's pool by winner count.
        for (uint256 i = 0; i < 8; i++) {
            if (draw.winnerCounts[i] > 0) {
                draw.prizeAmounts[i] = prizePoolDistribution[i] / draw.winnerCounts[i];
            }
            // If no winners in a tier, draw.prizeAmounts[i] remains 0.
            // The full prizePoolDistribution[i] for that tier rolls over automatically
            // because it's not deducted from accumulatedPrizePool.
        }
    }

    /**
     * @dev Generates pseudo-random numbers using on-chain data.
     * NOTE: This is NOT cryptographically secure. Suitable for low-stakes testing/games on Kasplex.
     * Relies on the speed and decentralization of Kasplex L2 for relative safety.
     * @return winningMainNumbers The 5 unique winning main numbers (1-35).
     * @return winningBonusNumber The winning bonus number (1-10).
     * @return seed The random seed used for generation.
     */
    function _generateSecureRandomNumbers()
        internal
        view // Make view if possible, though blockhash might have limitations.
        returns (uint8[MAIN_NUMBERS_PER_TICKET] memory, uint8, uint256)
    {
        // Use multiple sources of entropy available on-chain.
        // msg.sender is NOT used to prevent player manipulation of the draw they trigger.
        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp, // Current block timestamp.
                    block.number, // Current block number.
                    blockhash(block.number - 1), // Hash of a recent block.
                    address(this), // Contract's own address.
                    tx.gasprice // Gas price of the transaction triggering the draw.
                )
            )
        );

        // --- Generate winning main numbers (1-35) ---
        uint8[MAIN_NUMBERS_PER_TICKET] memory winningMainNumbers;
        // Create an array of all possible main numbers to select from.
        uint256[] memory availableMainNumbers = new uint256[](MAX_MAIN_NUMBER);
        for (uint256 i = 0; i < MAX_MAIN_NUMBER; i++) {
            availableMainNumbers[i] = i + MIN_MAIN_NUMBER;
        }
        uint256 remainingMainCount = MAX_MAIN_NUMBER;
        // Select 5 unique numbers using the Fisher-Yates shuffle approach.
        for (uint256 i = 0; i < MAIN_NUMBERS_PER_TICKET; i++) {
            uint256 entropy = uint256(keccak256(abi.encodePacked(seed, i)));
            uint256 randomIndex = entropy % remainingMainCount;
            winningMainNumbers[i] = uint8(availableMainNumbers[randomIndex]);
            // Replace the selected number with the last one in the available list.
            availableMainNumbers[randomIndex] = availableMainNumbers[remainingMainCount - 1];
            remainingMainCount--;
        }
        // No need to sort as order doesn't matter for matching.

        // --- Generate winning bonus number (1-10) ---
        uint256 bonusEntropy = uint256(keccak256(abi.encodePacked(seed, "bonus")));
        uint8 winningBonusNumber = uint8((bonusEntropy % MAX_BONUS_NUMBER) + MIN_BONUS_NUMBER);

        return (winningMainNumbers, winningBonusNumber, seed);
    }

    // ============ HELPER & VIEW FUNCTIONS ============
    /**
     * @dev Validates the numbers on a ticket to ensure they are within range and unique.
     * @param _mainNumbers The 5 main numbers to validate.
     * @param _bonusNumber The bonus number to validate.
     */
    function _validateTicketNumbers(uint8[MAIN_NUMBERS_PER_TICKET] memory _mainNumbers, uint8 _bonusNumber) internal pure {
        // Validate main numbers
        for (uint256 i = 0; i < MAIN_NUMBERS_PER_TICKET; i++) {
            require(_mainNumbers[i] >= MIN_MAIN_NUMBER && _mainNumbers[i] <= MAX_MAIN_NUMBER, "Main number out of range");
            // Check for duplicates among the main numbers.
            for (uint256 j = i + 1; j < MAIN_NUMBERS_PER_TICKET; j++) {
                require(_mainNumbers[i] != _mainNumbers[j], "Duplicate main numbers in ticket");
            }
        }
        // Validate bonus number
        require(_bonusNumber >= MIN_BONUS_NUMBER && _bonusNumber <= MAX_BONUS_NUMBER, "Bonus number out of range");
    }

    /**
     * @dev Calculates the prize amount for a specific ticket based on the draw results.
     * @param _ticketId The ID of the ticket to calculate the prize for.
     * @return The prize amount in KAS, or 0 if the ticket is not a winner.
     */
    function _calculateTicketPrize(uint256 _ticketId) internal view returns (uint256) {
        Ticket storage ticket = tickets[_ticketId];
        Draw storage draw = draws[ticket.drawId];

        if (!draw.executed) {
            return 0; // Prize cannot be calculated if draw hasn't happened.
        }

        uint256 prizeTierIndex = type(uint256).max; // Invalid index
        uint8 matches = ticket.matchCount;
        bool bonusMatch = ticket.bonusMatch;

        // Map match/bonus result to a prize tier index.
        if (matches == 5 && bonusMatch) {
            prizeTierIndex = 0; // Jackpot
        } else if (matches == 5) {
            prizeTierIndex = 1; // 2nd Prize
        } else if (matches == 4 && bonusMatch) {
            prizeTierIndex = 2; // 3rd Prize
        } else if (matches == 4) {
            prizeTierIndex = 3; // 4th Prize
        } else if (matches == 3 && bonusMatch) {
            prizeTierIndex = 4; // 5th Prize
        } else if (matches == 3) {
            prizeTierIndex = 5; // 6th Prize
        } else if (matches == 2 && bonusMatch) {
            prizeTierIndex = 6; // 7th Prize
        } else if (matches == 2) {
            prizeTierIndex = 7; // 8th Prize
        }

        // If a valid tier was found, return the prize amount for that tier.
        if (prizeTierIndex != type(uint256).max) {
            return draw.prizeAmounts[prizeTierIndex];
        }
        return 0; // Not a winning ticket.
    }

    /**
     * @dev Calculates the total KAS distributed as prizes for a specific draw.
     * @param _drawId The ID of the draw.
     * @return The sum of (winner count * prize per winner) for all tiers.
     */
    function _calculateTotalDistributedPrizes(uint256 _drawId) internal view returns (uint256) {
        Draw storage draw = draws[_drawId];
        uint256 total = 0;
        for (uint256 i = 0; i < 8; i++) {
            total += draw.winnerCounts[i] * draw.prizeAmounts[i];
        }
        return total;
    }

    /**
     * @dev Counts how many of a ticket's main numbers match the winning main numbers.
     * @param _ticketMainNumbers The 5 main numbers on the player's ticket.
     * @param _winningMainNumbers The 5 winning main numbers for the draw.
     * @return The number of matching main numbers.
     */
    function _countMatches(
        uint8[MAIN_NUMBERS_PER_TICKET] memory _ticketMainNumbers,
        uint8[MAIN_NUMBERS_PER_TICKET] memory _winningMainNumbers
    ) internal pure returns (uint256) {
        uint256 matches = 0;
        for (uint256 i = 0; i < MAIN_NUMBERS_PER_TICKET; i++) {
            for (uint256 j = 0; j < MAIN_NUMBERS_PER_TICKET; j++) {
                if (_ticketMainNumbers[i] == _winningMainNumbers[j]) {
                    matches++;
                    break; // Break inner loop once a match is found for this ticket number.
                }
            }
        }
        return matches;
    }

    /**
     * @notice Returns key information about the current state of the lottery.
     * @return _currentDrawId The ID of the draw tickets are currently being purchased for.
     * @return _nextDrawTimestamp The scheduled time (Unix timestamp) of the next draw.
     * @return _currentPrizePool The total KAS currently in the prize pool.
     * @return _ticketsSoldForCurrentDraw The number of tickets sold for the upcoming draw.
     */
    function getLotteryInfo() external view returns (
        uint256 _currentDrawId,
        uint256 _nextDrawTimestamp,
        uint256 _currentPrizePool,
        uint256 _ticketsSoldForCurrentDraw
    ) {
        return (
            currentDrawId,
            nextDrawTime,
            accumulatedPrizePool,
            drawTickets[currentDrawId].length
        );
    }

    /**
     * @notice Returns detailed information about a past draw.
     * @param _drawId The ID of the draw to query.
     * @return The Draw struct containing all details of the specified draw.
     */
    function getDraw(uint256 _drawId) external view returns (Draw memory) {
        require(_drawId > 0 && _drawId < currentDrawId, "Draw not yet executed or invalid ID");
        return draws[_drawId];
    }

    /**
     * @notice Returns detailed information about a specific ticket.
     * @param _ticketId The ID of the ticket to query.
     * @return The Ticket struct containing all details of the specified ticket.
     */
    function getTicket(uint256 _ticketId) external view returns (Ticket memory) {
        require(_ticketId > 0 && _ticketId < ticketCounter, "Invalid ticket ID");
        return tickets[_ticketId];
    }

    /**
     * @notice Returns the list of ticket IDs for a given draw.
     * @param _drawId The ID of the draw.
     * @return An array of ticket IDs associated with the draw.
     */
    function getDrawTickets(uint256 _drawId) external view returns (uint256[] memory) {
        return drawTickets[_drawId];
    }

    /**
     * @notice Returns the list of ticket IDs for a given player.
     * @param _player The player's address.
     * @return An array of ticket IDs owned by the player.
     */
    function getPlayerTickets(address _player) external view returns (uint256[] memory) {
        return playerTickets[_player];
    }

    /**
     * @notice Returns the Analytics struct containing overall lottery statistics.
     * @return The current Analytics data.
     */
    function getAnalytics() external view returns (Analytics memory) {
        return analytics;
    }

    /**
     * @notice Calculates the total unclaimed and claimed prizes for a specific player.
     * @param _player The player's address.
     * @return unclaimed The total KAS in prizes the player has won but not yet claimed.
     * @return claimed The total KAS in prizes the player has already claimed.
     */
    function getPlayerPrizes(address _player) external view returns (uint256 unclaimed, uint256 claimed) {
        uint256[] memory playerTicketIds = playerTickets[_player];
        for (uint256 i = 0; i < playerTicketIds.length; i++) {
            uint256 ticketId = playerTicketIds[i];
            Ticket storage ticket = tickets[ticketId];
            if (ticket.player == _player && draws[ticket.drawId].executed) {
                uint256 prize = _calculateTicketPrize(ticketId);
                if (ticket.claimed) {
                    claimed += prize;
                } else if (prize > 0) {
                    unclaimed += prize;
                }
            }
        }
        return (unclaimed, claimed);
    }

    /**
     * @notice Returns the winner counts for each prize tier of a specific draw.
     * @param _drawId The ID of the draw.
     * @return An array of winner counts, indexed by prize tier (0-7).
     */
    function getDrawWinners(uint256 _drawId) external view returns (uint256[8] memory) {
        require(_drawId > 0 && _drawId < currentDrawId, "Draw not yet executed or invalid ID");
        return draws[_drawId].winnerCounts;
    }

    /**
     * @notice Returns the amount of excess funds available for withdrawal by the owner.
     * Excess funds are contract balance minus the tracked accumulatedPrizePool.
     * @return The amount of KAS that can be withdrawn via `withdrawExcessFunds`.
     */
    function getExcessFunds() external view returns (uint256) {
        return address(this).balance - accumulatedPrizePool;
    }

    // ============ UPGRADEABILITY ============
    /**
     * @dev Authorizes an upgrade to a new implementation contract.
     * Only the owner can initiate an upgrade.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Returns the current version of the contract.
     * @return The version string.
     */
    function getVersion() external pure returns (string memory) {
        return "1.2.1"; // Updated version number
    }

    // ============ FALLBACK ============
    /**
     * @notice Fallback function to receive direct KAS transfers.
     * These funds are NOT automatically added to the prize pool.
     * They are tracked separately and can be withdrawn using `withdrawExcessFunds`.
     * This prevents accidental sends from disrupting the lottery's financial model.
     */
    receive() external payable {
        // Log the donation but do not modify accumulatedPrizePool.
        emit DonationReceived(msg.sender, msg.value);
        // The funds are now part of address(this).balance.
        // Owner can withdraw excess via withdrawExcessFunds.
    }
}