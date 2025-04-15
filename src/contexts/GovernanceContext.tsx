// src/contexts/GovernanceContext.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useMemo,
    useCallback,
} from 'react';
import { ethers, ZeroAddress, Contract, formatUnits as ethersFormatUnits } from 'ethers';
import { Proposal } from '../types'; // Keep Proposal type for potential future use
import { useAuthContext } from './AuthContext';
import { usePoolsContext, V4Pool } from './PoolsContext';
import { GOVERNANCE_CONTRACT_ADDRESS, TARGET_NETWORK_CHAIN_ID } from '../constants';
import DesiredPricePoolABI from '../abis/DesiredPricePool.json'; // Ensure ABI is imported
// Removed bad import: import { Poll } from '../libraries/Poll';

// --- Ensure this interface is defined and exported ---
export interface GovernanceMetaData {
    poolId: string;
    desiredPriceTick: number | null;
    governanceTokenAddress: string | null; // Renamed for clarity
    // --- Poll State Fields ---
    pollId: string;
    pollStartTime: number | null; // In seconds since epoch
    pollPauseRequested: boolean;
    pollFlags: number | null;
    // --- Derived Poll Fields ---
    pollStage: string;
    pollIsPaused: boolean;
    pollIsManualExecution: boolean;
    pollIsMajor: boolean;
    pollTimeLeft: string; // Added: Human-readable time left
}

// --- Ensure this interface is defined ---
interface GovernanceContextType {
    proposals: Proposal[]; // Keep for potential future expansion
    governanceStatus: number[]; // Expecting vote diffs as numbers
    metaData: GovernanceMetaData | null;
    isLoadingGovernanceData: boolean;
    errorGovernanceData: string | null;
    fetchGovernanceData: (pool?: V4Pool | null) => Promise<void>;
}

// --- Ensure Context is created ---
const GovernanceContext = createContext<GovernanceContextType | undefined>(undefined);

// --- Ensure hook is exported ---
export const useGovernanceContext = () => {
    const context = useContext(GovernanceContext);
    if (!context) {
        throw new Error('useGovernanceContext must be used within a GovernanceProvider');
    }
    return context;
};

// --- Ensure props interface is defined ---
interface GovernanceProviderProps {
    children: ReactNode;
}

// --- Ensure ABI variable is defined ---
const GovernanceABI = DesiredPricePoolABI;

// --- Constants for Poll Durations (Mirror Poll.sol) ---
const CYCLE_LENGTH = 5;
const REGULAR_POLL_PREVOTE_END_S = 1 * 24 * 60 * 60; // 1 day
const REGULAR_POLL_VOTE_END_S = 3 * 24 * 60 * 60; // 3 days
const REGULAR_POLL_FINALVOTE_END_S = 4 * 24 * 60 * 60; // 4 days
const REGULAR_POLL_EXECUTION_READY_S = 5 * 24 * 60 * 60; // 5 days
const MAJOR_POLL_PREVOTE_END_S = 1 * 24 * 60 * 60; // 1 day
const MAJOR_POLL_VOTE_END_S = 6 * 24 * 60 * 60; // 6 days
const MAJOR_POLL_FINALVOTE_END_S = 8 * 24 * 60 * 60; // 8 days
const MAJOR_POLL_EXECUTION_READY_S = 10 * 24 * 60 * 60; // 10 days

// Poll Flags (Mirror Poll.sol)
const FLAG_MANUAL_EXECUTION = 1 << 0;
const FLAG_IN_TIME_EXECUTION = 1 << 1; // Important for execution logic

// Helper function formatDuration (keep as before)
const formatDuration = (seconds: number): string => {
    if (seconds < 0) return "Ended";
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${Math.floor(seconds % 60)}s`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${Math.floor(minutes % 60)}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${Math.floor(hours % 24)}h`;
};

// Helper function calculatePollInfo (updated to use constants)
const calculatePollInfo = (
     pollIdNum: number,
    startTimeNum: number,
    pauseRequested: boolean
): { stage: string; timeLeft: string; isPaused: boolean; isMajor: boolean } => {
     if (startTimeNum === 0) {
        // If paused, check if a pause was requested (implies it's about to pause or already paused awaiting reset)
        return { stage: pauseRequested ? "Pause Req." : "Paused", timeLeft: "N/A", isPaused: true, isMajor: false };
    }

    const currentTimeS = Math.floor(Date.now() / 1000);
    const timePassedS = currentTimeS - startTimeNum;
    const isMajor = pollIdNum % CYCLE_LENGTH === (CYCLE_LENGTH - 1);

    let stage: string;
    let stageEndTimeS: number;

    // Uses constants defined above
    if (isMajor) {
        if (timePassedS < MAJOR_POLL_PREVOTE_END_S) { stage = "PreVote"; stageEndTimeS = startTimeNum + MAJOR_POLL_PREVOTE_END_S; }
        else if (timePassedS < MAJOR_POLL_VOTE_END_S) { stage = "Vote"; stageEndTimeS = startTimeNum + MAJOR_POLL_VOTE_END_S; }
        else if (timePassedS < MAJOR_POLL_FINALVOTE_END_S) { stage = "Final Vote"; stageEndTimeS = startTimeNum + MAJOR_POLL_FINALVOTE_END_S; }
        else if (timePassedS < MAJOR_POLL_EXECUTION_READY_S) { stage = "PreExecution"; stageEndTimeS = startTimeNum + MAJOR_POLL_EXECUTION_READY_S; }
        else { stage = "Exec. Ready"; stageEndTimeS = startTimeNum + MAJOR_POLL_EXECUTION_READY_S; }
    } else {
        if (timePassedS < REGULAR_POLL_PREVOTE_END_S) { stage = "PreVote"; stageEndTimeS = startTimeNum + REGULAR_POLL_PREVOTE_END_S; }
        else if (timePassedS < REGULAR_POLL_VOTE_END_S) { stage = "Vote"; stageEndTimeS = startTimeNum + REGULAR_POLL_VOTE_END_S; }
        else if (timePassedS < REGULAR_POLL_FINALVOTE_END_S) { stage = "Final Vote"; stageEndTimeS = startTimeNum + REGULAR_POLL_FINALVOTE_END_S; }
        else if (timePassedS < REGULAR_POLL_EXECUTION_READY_S) { stage = "PreExecution"; stageEndTimeS = startTimeNum + REGULAR_POLL_EXECUTION_READY_S; }
        else { stage = "Exec. Ready"; stageEndTimeS = startTimeNum + REGULAR_POLL_EXECUTION_READY_S; }
    }

    const timeLeftS = stageEndTimeS - currentTimeS;
    const timeLeftFormatted = stage === "Exec. Ready" ? "Ready" : formatDuration(timeLeftS);

    // If pauseRequested is true and we're not paused yet, reflect that in the stage
    if (pauseRequested && startTimeNum !== 0) {
        stage = `${stage} (Pause Req.)`;
    }

    return { stage, timeLeft: timeLeftFormatted, isPaused: false, isMajor }; // isPaused is false if startTime > 0
};


// --- Governance Provider Component ---
export const GovernanceProvider: React.FC<GovernanceProviderProps> = ({ children }) => {
    const { provider, network } = useAuthContext();
    const { selectedPool: contextSelectedPool } = usePoolsContext();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [governanceStatus, setGovernanceStatus] = useState<number[]>([]);
    const [metaData, setMetaData] = useState<GovernanceMetaData | null>(null);
    const [isLoadingGovernanceData, setIsLoadingGovernanceData] = useState<boolean>(false);
    const [errorGovernanceData, setErrorGovernanceData] = useState<string | null>(null);

     const fetchGovernanceData = useCallback(async (poolToFetch?: V4Pool | null) => {
        const currentPool = poolToFetch ?? contextSelectedPool;

        // --- Prerequisite Checks ---
         if (!provider || network?.chainId !== TARGET_NETWORK_CHAIN_ID || !currentPool || !currentPool.poolId) {
            setProposals([]); setGovernanceStatus([]); setMetaData(null); setErrorGovernanceData(null); setIsLoadingGovernanceData(false);
            return;
        }
        // Check GovernanceABI is defined
        if (GOVERNANCE_CONTRACT_ADDRESS === ZeroAddress || !GovernanceABI || GovernanceABI.length === 0) {
             setErrorGovernanceData("Governance contract/ABI not configured."); setIsLoadingGovernanceData(false); setProposals([]); setGovernanceStatus([]); setMetaData(null);
             return;
         }

        setIsLoadingGovernanceData(true);
        setErrorGovernanceData(null);
        setMetaData(null);
        setProposals([]); // Clear proposals on fetch
        setGovernanceStatus([]); // Clear previous status

        const currentPoolId = currentPool.poolId;
        console.log(`[GovernanceContext] Fetching available governance data for PoolId: ${currentPoolId}`);

        try {
            const governanceContract = new Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernanceABI, provider);

             // Fetch REAL desired price and governance token address
             const [desiredPriceResult, govTokenResult] = await Promise.allSettled([
                  governanceContract.desiredPrice(currentPoolId),
                  governanceContract.governanceToken(),
             ]);

             // MOCK Poll State and Vote Distribution
             const mockPollIdNum = 1;
             const MOCK_TIME_LEFT_S = (3 * 24 * 60 * 60) + (12 * 60 * 60); // 3 days 12 hours
             // Calculate mock start time based on MOCK_TIME_LEFT_S relative to REGULAR_POLL_VOTE_END_S
             const timeNowS = Math.floor(Date.now() / 1000);
             // Time that should have passed since start to reach this point in the Vote stage
             const timePassedUntilNowS = REGULAR_POLL_VOTE_END_S - MOCK_TIME_LEFT_S;
             const mockStartTimeNum = timeNowS - timePassedUntilNowS;

             const mockPollState = {
                 id: BigInt(mockPollIdNum),
                 startTime: BigInt(mockStartTimeNum),
                 pauseRequested: false,
                 flags: BigInt(FLAG_IN_TIME_EXECUTION), // Use the constant defined above
                 totalVotes: ethers.parseUnits("1000", 18), // Mock 1000 DPP total power
                 // Mock some vote distribution (sum doesn't have to match totalVotes perfectly for this display)
                 voteDiffs: [
                    0n, 0n, 0n, 0n, 0n,
                    ethers.parseUnits("50", 18),    // Slot -5
                    ethers.parseUnits("100", 18),   // Slot -4
                    ethers.parseUnits("150", 18),   // Slot -3
                    ethers.parseUnits("200", 18),   // Slot -2
                    0n,                             // Slot -1 (example)
                    ethers.parseUnits("-250", 18), // Slot 0 (representing net power, can be negative)
                    ethers.parseUnits("-100", 18), // Slot +1
                    ethers.parseUnits("-50", 18),  // Slot +2
                    0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n // Slots +3 to +10
                 ]
             };
            // Convert mock bigints to numbers for the BarChart component
            const mockGovernanceStatus = mockPollState.voteDiffs.map(diff => Number(ethers.formatUnits(diff, 18))); // Assuming 18 decimals for DPP display in chart

            let fetchedDesiredPriceTick: number | null = null;
            let fetchedGovTokenAddr: string | null = null;

            if (desiredPriceResult.status === 'fulfilled') {
                fetchedDesiredPriceTick = Number(desiredPriceResult.value);
                 console.log("[GovernanceContext] Fetched real desired price tick:", fetchedDesiredPriceTick);
            } else {
                console.error(`[GovernanceContext] Failed desiredPrice fetch:`, desiredPriceResult.reason);
            }

            if (govTokenResult.status === 'fulfilled') {
                 fetchedGovTokenAddr = govTokenResult.value;
                 console.log("[GovernanceContext] Fetched real governance token address:", fetchedGovTokenAddr);
            } else {
                console.error(`[GovernanceContext] Failed gov token fetch:`, govTokenResult.reason);
            }

             let pollMetaData: Partial<GovernanceMetaData> = { /* defaults */
                pollId: 'N/A',
                pollStartTime: null,
                pollPauseRequested: false,
                pollFlags: null,
                pollStage: 'N/A',
                pollTimeLeft: 'N/A',
                pollIsPaused: true,
                pollIsManualExecution: false,
                pollIsMajor: false,
             };

            // Use MOCK poll state
            if (mockPollState) {
                 const pollIdNum = Number(mockPollState.id);
                 const startTimeNum = Number(mockPollState.startTime);
                 const pauseRequestedBool = Boolean(mockPollState.pauseRequested);
                 const flagsNum = Number(mockPollState.flags);

                // Calculate stage/timeleft based on MOCK start time
                const { stage, timeLeft, isPaused, isMajor } = calculatePollInfo(pollIdNum, startTimeNum, pauseRequestedBool);

                pollMetaData = {
                     pollId: pollIdNum.toString(),
                     pollStartTime: startTimeNum,
                     pollPauseRequested: pauseRequestedBool,
                     pollFlags: flagsNum,
                     pollStage: stage, // Use calculated stage
                     pollTimeLeft: timeLeft, // Use calculated time left
                     pollIsPaused: isPaused, // Use calculated paused status
                     pollIsMajor: isMajor,
                     pollIsManualExecution: (flagsNum & FLAG_MANUAL_EXECUTION) !== 0,
                 };
                  console.log("[GovernanceContext] Using MOCK Poll State:", pollMetaData);
             }

            setMetaData({
                 poolId: currentPoolId,
                 desiredPriceTick: fetchedDesiredPriceTick, // Real
                 governanceTokenAddress: fetchedGovTokenAddr, // Real
                 pollId: pollMetaData.pollId ?? 'N/A', // Mock
                 pollStartTime: pollMetaData.pollStartTime ?? null, // Mock
                 pollPauseRequested: pollMetaData.pollPauseRequested ?? false, // Mock
                 pollFlags: pollMetaData.pollFlags ?? null, // Mock
                 pollStage: pollMetaData.pollStage ?? 'N/A', // Mock derived
                 pollTimeLeft: pollMetaData.pollTimeLeft ?? 'N/A', // Mock derived
                 pollIsPaused: pollMetaData.pollIsPaused ?? true, // Mock derived
                 pollIsManualExecution: pollMetaData.pollIsManualExecution ?? false, // Mock derived
                 pollIsMajor: pollMetaData.pollIsMajor ?? false, // Mock derived
             });

            setGovernanceStatus(mockGovernanceStatus); // Use the mock distribution for the chart
            setProposals([]); // Keep proposals empty for now

        } catch (err: any) {
            console.error(`[GovernanceContext] General error fetching data for ${currentPoolId}:`, err);
            setErrorGovernanceData(`Failed to load governance data: ${err.message || String(err)}`);
            setProposals([]); setGovernanceStatus([]); setMetaData(null);
        } finally {
            setIsLoadingGovernanceData(false);
        }
    }, [provider, network, contextSelectedPool]); // Keep dependencies

     useEffect(() => {
        // Fetch data only when the selected pool is available and matches the network
        if (contextSelectedPool && network?.chainId === TARGET_NETWORK_CHAIN_ID) {
             fetchGovernanceData(contextSelectedPool);
        } else {
             // Clear data if pool/network is wrong or unset
             setProposals([]);
             setGovernanceStatus([]);
             setMetaData(null);
             setErrorGovernanceData(null);
             setIsLoadingGovernanceData(false);
        }
    }, [provider, network, contextSelectedPool, fetchGovernanceData]); // Added contextSelectedPool

    const contextValue = useMemo(
        () => ({
            proposals,
            governanceStatus,
            metaData,
            isLoadingGovernanceData,
            errorGovernanceData,
            fetchGovernanceData,
        }),
        [
            proposals,
            governanceStatus,
            metaData,
            isLoadingGovernanceData,
            errorGovernanceData,
            fetchGovernanceData,
        ]
    );

    // Ensure correct Context variable is used
    return (
        <GovernanceContext.Provider value={contextValue}>
            {children}
        </GovernanceContext.Provider>
    );
};