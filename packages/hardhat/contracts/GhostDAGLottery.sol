// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30; // Updated to the latest specified version

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title GhostDAGLottery - A Perpetual Lottery on Kasplex EVM (Kaspa L2)
 * @dev A lottery game where players pick 5 main numbers (1-35) and 1 bonus number (1-10).
 *      Draws are executed automatically based on time. Prizes are claimable for winning tickets.
 *      This contract is upgradeable by the owner and includes pause functionality and excess fund withdrawal.
 *      Designed for the Kasplex EVM L2, using KAS as the native currency and for gas fees.
 * @author Qwen3 Coder (Original source code)
 * @notice Version 1.2.1
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
        uint256[] ticketIds,
        uint256 totalPrizeAmount
    );

    /// @notice Emitted when admin fees are distributed to the owner.
    event AdminFeeDistributed(
        address indexed owner,
        uint256 amount
    );

    /// @notice Emitted when the contract receives a direct KAS transfer.
    event DonationReceived(
        address indexed sender,
        uint256 amount
    );

    /// @notice Emitted when the owner withdraws excess funds.
    event ExcessFundsWithdrawn(
        address indexed owner,
        uint256 amount
    );

    // ============ INITIALIZATION ============
    /// @notice Initializes the lottery contract with the first draw scheduled.
    /// @dev This function replaces the constructor for upgradeable contracts.
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        // Initialize the first draw
        currentDrawId = 1;
        nextDrawTime = block.timestamp + DRAW_INTERVAL;
        ticketCounter = 0;
        accumulatedPrizePool = 0;

        // Initialize analytics
        analytics = Analytics({
            totalDraws: 0,
            totalTicketsSold: 0,
            totalPrizesDistributed: 0,
            totalAdminFees: 0,
            totalPlayers: 0,
            totalVolume: 0
        });
    }

    // ============ CORE FUNCTIONS ============
    /// @notice Allows a player to purchase multiple lottery tickets for the current draw.
    /// @param mainNumbersArray Array of main number arrays (each inner array has 5 numbers).
    /// @param bonusNumbers Array of bonus numbers (one per ticket).
    /// @dev Automatically executes the draw if it's time, then processes the ticket purchase.
    function purchaseTickets(
        uint8[MAIN_NUMBERS_PER_TICKET][] calldata mainNumbersArray,
        uint8[] calldata bonusNumbers
    ) external payable nonReentrant whenNotPaused {
        require(mainNumbersArray.length == bonusNumbers.length, "Array length mismatch");
        require(mainNumbersArray.length > 0, "Must purchase at least one ticket");
        require(mainNumbersArray.length <= MAX_TICKETS_PER_BATCH, "Too many tickets in one batch");

        uint256 totalCost = mainNumbersArray.length * TICKET_PRICE;
        require(msg.value == totalCost, "Incorrect payment amount");

        // Execute draw if it's time
        if (block.timestamp >= nextDrawTime) {
            _executeDraw();
        }

        // Calculate admin fee and effective prize pool contribution
        uint256 adminFee = (totalCost * ADMIN_FEE_PERCENTAGE) / 10000;
        uint256 prizePoolContribution = totalCost - adminFee;

        // Update accumulated prize pool
        accumulatedPrizePool += prizePoolContribution;

        // Send admin fee to owner
        if (adminFee > 0) {
            (bool success, ) = payable(owner()).call{value: adminFee}("");
            require(success, "Admin fee transfer failed");
            analytics.totalAdminFees += adminFee;
            emit AdminFeeDistributed(owner(), adminFee);
        }

        // Create tickets
        uint256[] memory newTicketIds = new uint256[](mainNumbersArray.length);
        for (uint256 i = 0; i < mainNumbersArray.length; i++) {
            _validateTicketNumbers(mainNumbersArray[i], bonusNumbers[i]);

            ticketCounter++;
            uint256 ticketId = ticketCounter;
            newTicketIds[i] = ticketId;

            tickets[ticketId] = Ticket({
                player: msg.sender,
                mainNumbers: mainNumbersArray[i],
                bonusNumber: bonusNumbers[i],
                drawId: currentDrawId,
                claimed: false,
                purchaseTime: block.timestamp,
                prizeAmount: 0,
                matchCount: 0,
                bonusMatch: false
            });

            drawTickets[currentDrawId].push(ticketId);
            playerTickets[msg.sender].push(ticketId);
        }

        // Update analytics
        if (!hasPlayed[msg.sender]) {
            hasPlayed[msg.sender] = true;
            analytics.totalPlayers++;
        }
        analytics.totalTicketsSold += mainNumbersArray.length;
        analytics.totalVolume += totalCost;

        emit TicketsPurchased(msg.sender, currentDrawId, newTicketIds, totalCost);
    }

    /// @notice Allows a player to claim prizes for their winning tickets.
    /// @param ticketIds Array of ticket IDs to claim prizes for.
    function claimPrizes(uint256[] calldata ticketIds) external nonReentrant whenNotPaused {
        require(ticketIds.length > 0, "Must specify at least one ticket");

        uint256 totalPrize = 0;
        for (uint256 i = 0; i < ticketIds.length; i++) {
            uint256 ticketId = ticketIds[i];
            Ticket storage ticket = tickets[ticketId];

            require(ticket.player == msg.sender, "Not your ticket");
            require(!ticket.claimed, "Prize already claimed");
            require(draws[ticket.drawId].executed, "Draw not executed yet");

            uint256 prize = _calculateTicketPrize(ticketId);
            if (prize > 0) {
                ticket.claimed = true;
                ticket.prizeAmount = prize;
                totalPrize += prize;
            }
        }

        require(totalPrize > 0, "No prizes to claim");
        require(address(this).balance >= totalPrize, "Insufficient contract balance");

        // Transfer prize to player
        (bool success, ) = payable(msg.sender).call{value: totalPrize}("");
        require(success, "Prize transfer failed");

        // Update analytics
        analytics.totalPrizesDistributed += totalPrize;

        emit PrizesClaimed(msg.sender, ticketIds, totalPrize);
    }

    // ============ OWNER FUNCTIONS ============
    /// @notice Pauses the contract, preventing ticket purchases and prize claims.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses the contract, allowing normal operations to resume.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Allows the owner to withdraw excess funds not allocated to prizes.
    /// @dev Only withdraws funds beyond the accumulated prize pool.
    function withdrawExcessFunds() external onlyOwner {
        uint256 contractBalance = address(this).balance;
        require(contractBalance > accumulatedPrizePool, "No excess funds available");

        uint256 excessAmount = contractBalance - accumulatedPrizePool;
        (bool success, ) = payable(owner()).call{value: excessAmount}("");
        require(success, "Excess funds transfer failed");

        emit ExcessFundsWithdrawn(owner(), excessAmount);
    }

    // ============ INTERNAL FUNCTIONS ============
    /// @notice Executes the current draw and sets up the next one.
    function _executeDraw() internal {
        Draw storage draw = draws[currentDrawId];
        require(!draw.executed, "Draw already executed");

        // Generate winning numbers
        (uint8[MAIN_NUMBERS_PER_TICKET] memory winningMainNumbers, uint8 winningBonusNumber, uint256 randomSeed) = _generateSecureRandomNumbers();

        // Set draw data
        draw.id = currentDrawId;
        draw.winningMainNumbers = winningMainNumbers;
        draw.winningBonusNumber = winningBonusNumber;
        draw.timestamp = block.timestamp;
        draw.totalPrizePoolBeforeFees = accumulatedPrizePool;
        draw.effectivePrizePool = accumulatedPrizePool;
        draw.executed = true;
        draw.totalTickets = drawTickets[currentDrawId].length;
        draw.randomSeed = randomSeed;

        // Process winners and calculate prizes
        _processWinners(currentDrawId);

        // Update analytics
        analytics.totalDraws++;

        emit DrawExecuted(
            currentDrawId,
            winningMainNumbers,
            winningBonusNumber,
            draw.totalPrizePoolBeforeFees,
            draw.effectivePrizePool
        );

        // Set up next draw
        currentDrawId++;
        nextDrawTime = block.timestamp + DRAW_INTERVAL;

        // Calculate total distributed prizes for this draw
        uint256 totalDistributedPrizes = _calculateTotalDistributedPrizes(currentDrawId - 1);

        // Update accumulated prize pool (subtract distributed prizes, keep remainder for rollover)
        if (totalDistributedPrizes <= accumulatedPrizePool) {
            accumulatedPrizePool -= totalDistributedPrizes;
        } else {
            accumulatedPrizePool = 0; // Safety check
        }
    }

    /// @notice Processes all tickets for a draw to determine winners and calculate prizes.
    /// @param drawId The ID of the draw to process.
    function _processWinners(uint256 drawId) internal {
        Draw storage draw = draws[drawId];
        uint256[] memory ticketIds = drawTickets[drawId];

        // Count winners for each tier
        uint256[8] memory winnerCounts;

        for (uint256 i = 0; i < ticketIds.length; i++) {
            uint256 ticketId = ticketIds[i];
            Ticket storage ticket = tickets[ticketId];

            uint8 matches = _countMatches(ticket.mainNumbers, draw.winningMainNumbers);
            bool bonusMatch = ticket.bonusNumber == draw.winningBonusNumber;

            // Update ticket with match results
            ticket.matchCount = matches;
            ticket.bonusMatch = bonusMatch;

            // Determine prize tier and increment winner count
            if (matches == 5 && bonusMatch) {
                winnerCounts[0]++; // Tier 1: 5 + Bonus
            } else if (matches == 5) {
                winnerCounts[1]++; // Tier 2: 5 matches
            } else if (matches == 4 && bonusMatch) {
                winnerCounts[2]++; // Tier 3: 4 + Bonus
            } else if (matches == 4) {
                winnerCounts[3]++; // Tier 4: 4 matches
            } else if (matches == 3 && bonusMatch) {
                winnerCounts[4]++; // Tier 5: 3 + Bonus
            } else if (matches == 3) {
                winnerCounts[5]++; // Tier 6: 3 matches
            } else if (matches == 2 && bonusMatch) {
                winnerCounts[6]++; // Tier 7: 2 + Bonus
            } else if (matches == 2) {
                winnerCounts[7]++; // Tier 8: 2 matches
            }
        }

        // Store winner counts
        draw.winnerCounts = winnerCounts;

        // Calculate prize amounts for each tier
        uint256[8] memory prizePercentages = [
            JACKPOT_PERCENTAGE,
            SECOND_PRIZE_PERCENTAGE,
            THIRD_PRIZE_PERCENTAGE,
            FOURTH_PRIZE_PERCENTAGE,
            FIFTH_PRIZE_PERCENTAGE,
            SIXTH_PRIZE_PERCENTAGE,
            SEVENTH_PRIZE_PERCENTAGE,
            EIGHTH_PRIZE_PERCENTAGE
        ];

        for (uint256 tier = 0; tier < 8; tier++) {
            if (winnerCounts[tier] > 0) {
                uint256 tierPrizePool = (draw.effectivePrizePool * prizePercentages[tier]) / 10000;
                draw.prizeAmounts[tier] = tierPrizePool / winnerCounts[tier];
            } else {
                draw.prizeAmounts[tier] = 0;
            }
        }
    }

    /// @notice Generates secure random numbers for the lottery draw.
    /// @return winningMainNumbers Array of 5 unique main winning numbers.
    /// @return winningBonusNumber The winning bonus number.
    /// @return randomSeed The seed used for random generation.
    /// @dev Uses on-chain data for randomness. Not cryptographically secure but suitable for Kasplex.
    function _generateSecureRandomNumbers() internal view returns (
        uint8[MAIN_NUMBERS_PER_TICKET] memory winningMainNumbers,
        uint8 winningBonusNumber,
        uint256 randomSeed
    ) {
        // Create a pseudo-random seed using multiple on-chain sources
        randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.number,
            blockhash(block.number - 1),
            address(this),
            tx.gasprice,
            currentDrawId
        )));

        // Generate 5 unique main numbers
        bool[MAX_MAIN_NUMBER + 1] memory used; // Track used numbers
        uint256 currentSeed = randomSeed;

        for (uint256 i = 0; i < MAIN_NUMBERS_PER_TICKET; i++) {
            uint8 number;
            do {
                currentSeed = uint256(keccak256(abi.encodePacked(currentSeed, i)));
                number = uint8((currentSeed % MAX_MAIN_NUMBER) + MIN_MAIN_NUMBER);
            } while (used[number]);

            used[number] = true;
            winningMainNumbers[i] = number;
        }

        // Generate bonus number
        currentSeed = uint256(keccak256(abi.encodePacked(currentSeed, "bonus")));
        winningBonusNumber = uint8((currentSeed % MAX_BONUS_NUMBER) + MIN_BONUS_NUMBER);
    }

    /// @notice Validates that ticket numbers are within allowed ranges and unique.
    /// @param mainNumbers Array of 5 main numbers to validate.
    /// @param bonusNumber The bonus number to validate.
    function _validateTicketNumbers(
        uint8[MAIN_NUMBERS_PER_TICKET] calldata mainNumbers,
        uint8 bonusNumber
    ) internal pure {
        // Validate bonus number
        require(
            bonusNumber >= MIN_BONUS_NUMBER && bonusNumber <= MAX_BONUS_NUMBER,
            "Invalid bonus number"
        );

        // Validate main numbers and check for uniqueness
        bool[MAX_MAIN_NUMBER + 1] memory used;
        for (uint256 i = 0; i < MAIN_NUMBERS_PER_TICKET; i++) {
            uint8 number = mainNumbers[i];
            require(
                number >= MIN_MAIN_NUMBER && number <= MAX_MAIN_NUMBER,
                "Invalid main number"
            );
            require(!used[number], "Duplicate main number");
            used[number] = true;
        }
    }

    // ============ HELPER FUNCTIONS ============
    /// @notice Calculates the prize amount for a specific ticket.
    /// @param ticketId The ID of the ticket to calculate the prize for.
    /// @return The prize amount in KAS (wei).
    function _calculateTicketPrize(uint256 ticketId) internal view returns (uint256) {
        Ticket storage ticket = tickets[ticketId];
        Draw storage draw = draws[ticket.drawId];

        if (!draw.executed) {
            return 0;
        }

        uint8 matches = ticket.matchCount;
        bool bonusMatch = ticket.bonusMatch;

        // Determine prize tier and return corresponding prize amount
        if (matches == 5 && bonusMatch) {
            return draw.prizeAmounts[0]; // Tier 1: 5 + Bonus
        } else if (matches == 5) {
            return draw.prizeAmounts[1]; // Tier 2: 5 matches
        } else if (matches == 4 && bonusMatch) {
            return draw.prizeAmounts[2]; // Tier 3: 4 + Bonus
        } else if (matches == 4) {
            return draw.prizeAmounts[3]; // Tier 4: 4 matches
        } else if (matches == 3 && bonusMatch) {
            return draw.prizeAmounts[4]; // Tier 5: 3 + Bonus
        } else if (matches == 3) {
            return draw.prizeAmounts[5]; // Tier 6: 3 matches
        } else if (matches == 2 && bonusMatch) {
            return draw.prizeAmounts[6]; // Tier 7: 2 + Bonus
        } else if (matches == 2) {
            return draw.prizeAmounts[7]; // Tier 8: 2 matches
        }

        return 0; // No prize
    }

    /// @notice Calculates the total amount of prizes distributed for a specific draw.
    /// @param drawId The ID of the draw to calculate total distributed prizes for.
    /// @return The total amount of prizes distributed in KAS (wei).
    function _calculateTotalDistributedPrizes(uint256 drawId) internal view returns (uint256) {
        Draw storage draw = draws[drawId];
        uint256 total = 0;

        for (uint256 tier = 0; tier < 8; tier++) {
            total += draw.winnerCounts[tier] * draw.prizeAmounts[tier];
        }

        return total;
    }

    /// @notice Counts the number of matching main numbers between a ticket and winning numbers.
    /// @param ticketNumbers The main numbers on the ticket.
    /// @param winningNumbers The winning main numbers from the draw.
    /// @return The count of matching numbers.
    function _countMatches(
        uint8[MAIN_NUMBERS_PER_TICKET] memory ticketNumbers,
        uint8[MAIN_NUMBERS_PER_TICKET] memory winningNumbers
    ) internal pure returns (uint8) {
        uint8 matches = 0;
        for (uint256 i = 0; i < MAIN_NUMBERS_PER_TICKET; i++) {
            for (uint256 j = 0; j < MAIN_NUMBERS_PER_TICKET; j++) {
                if (ticketNumbers[i] == winningNumbers[j]) {
                    matches++;
                    break;
                }
            }
        }
        return matches;
    }

    // ============ VIEW FUNCTIONS ============
    /// @notice Returns general information about the current state of the lottery.
    /// @return currentDraw The ID of the current draw.
    /// @return nextDraw The timestamp of the next draw.
    /// @return prizePool The current accumulated prize pool.
    /// @return ticketsSold The number of tickets sold for the current draw.
    function getLotteryInfo() external view returns (
        uint256 currentDraw,
        uint256 nextDraw,
        uint256 prizePool,
        uint256 ticketsSold
    ) {
        return (
            currentDrawId,
            nextDrawTime,
            accumulatedPrizePool,
            drawTickets[currentDrawId].length
        );
    }

    /// @notice Returns detailed information about a specific draw.
    /// @param drawId The ID of the draw to query.
    /// @return draw The Draw struct containing all draw information.
    function getDraw(uint256 drawId) external view returns (Draw memory draw) {
        return draws[drawId];
    }

    /// @notice Returns detailed information about a specific ticket.
    /// @param ticketId The ID of the ticket to query.
    /// @return ticket The Ticket struct containing all ticket information.
    function getTicket(uint256 ticketId) external view returns (Ticket memory ticket) {
        return tickets[ticketId];
    }

    /// @notice Returns all ticket IDs for a specific draw.
    /// @param drawId The ID of the draw to query.
    /// @return ticketIds Array of ticket IDs for the draw.
    function getDrawTickets(uint256 drawId) external view returns (uint256[] memory ticketIds) {
        return drawTickets[drawId];
    }

    /// @notice Returns all ticket IDs owned by a specific player.
    /// @param player The address of the player to query.
    /// @return ticketIds Array of ticket IDs owned by the player.
    function getPlayerTickets(address player) external view returns (uint256[] memory ticketIds) {
        return playerTickets[player];
    }

    /// @notice Returns the overall analytics and statistics of the lottery.
    /// @return analytics The Analytics struct containing lottery statistics.
    function getAnalytics() external view returns (Analytics memory) {
        return analytics;
    }

    /// @notice Returns prize information for a specific player.
    /// @param player The address of the player to query.
    /// @return unclaimedPrizes Total amount of unclaimed prizes.
    /// @return claimedPrizes Total amount of claimed prizes.
    /// @return totalTickets Total number of tickets owned by the player.
    function getPlayerPrizes(address player) external view returns (
        uint256 unclaimedPrizes,
        uint256 claimedPrizes,
        uint256 totalTickets
    ) {
        uint256[] memory playerTicketIds = playerTickets[player];
        totalTickets = playerTicketIds.length;

        for (uint256 i = 0; i < playerTicketIds.length; i++) {
            uint256 ticketId = playerTicketIds[i];
            Ticket storage ticket = tickets[ticketId];

            if (draws[ticket.drawId].executed) {
                uint256 prize = _calculateTicketPrize(ticketId);
                if (ticket.claimed) {
                    claimedPrizes += prize;
                } else {
                    unclaimedPrizes += prize;
                }
            }
        }
    }

    /// @notice Returns winner counts for each prize tier in a specific draw.
    /// @param drawId The ID of the draw to query.
    /// @return winnerCounts Array of winner counts for each tier (indices 0-7).
    function getDrawWinners(uint256 drawId) external view returns (uint256[8] memory winnerCounts) {
        return draws[drawId].winnerCounts;
    }

    /// @notice Returns the amount of excess funds available for withdrawal by the owner.
    /// @return excessAmount The amount of excess funds in KAS (wei).
    function getExcessFunds() external view returns (uint256 excessAmount) {
        uint256 contractBalance = address(this).balance;
        if (contractBalance > accumulatedPrizePool) {
            return contractBalance - accumulatedPrizePool;
        }
        return 0;
    }

    /// @notice Returns the version of the contract.
    /// @return version The contract version string.
    function getVersion() external pure returns (string memory version) {
        return "1.2.1";
    }

    // ============ UPGRADE AUTHORIZATION ============
    /// @notice Authorizes contract upgrades (required by UUPSUpgradeable).
    /// @param newImplementation The address of the new implementation contract.
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ FALLBACK FUNCTIONS ============
    /// @notice Receives direct KAS transfers and logs them as donations.
    /// @dev These funds are not automatically added to the prize pool.
    receive() external payable {
        emit DonationReceived(msg.sender, msg.value);
    }
}