// src/contexts/GovernanceContext.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useMemo,
    useCallback,
    // useRef removed as it's not strictly needed with the functional update approach for setMockPollStartTimeRef
} from 'react';
import { ethers, ZeroAddress, Contract, formatUnits as ethersFormatUnits } from 'ethers';
import { Proposal } from '../types'; // Keep Proposal type for potential future use
import { useAuthContext } from './AuthContext';
import { usePoolsContext, V4Pool } from './PoolsContext';
import { useTimeContext } from './TimeContext'; // <<< IMPORT useTimeContext
import { GOVERNANCE_CONTRACT_ADDRESS, TARGET_NETWORK_CHAIN_ID } from '../constants';
import DesiredPricePoolABI from '../abis/DesiredPricePool.json'; // Ensure ABI is imported

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

// Helper function formatDuration
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

// Helper function calculatePollInfo (modified to calculate time left until cycle end)
const calculatePollInfo = (
     pollIdNum: number,
    startTimeNum: number,
    pauseRequested: boolean,
    currentTimeS: number // <<< Added currentTime argument
): { stage: string; timeLeft: string; isPaused: boolean; isMajor: boolean } => {
     if (startTimeNum === 0) {
        // If paused, check if a pause was requested (implies it's about to pause or already paused awaiting reset)
        return { stage: pauseRequested ? "Pause Req." : "Paused", timeLeft: "N/A", isPaused: true, isMajor: false };
    }

    // Use provided currentTimeS instead of Date.now()
    const timePassedS = currentTimeS - startTimeNum;
    const isMajor = pollIdNum % CYCLE_LENGTH === (CYCLE_LENGTH - 1);

    let stage: string;
    // --- Determine the ABSOLUTE end time of the entire poll cycle ---
    const cycleDurationS = isMajor ? MAJOR_POLL_EXECUTION_READY_S : REGULAR_POLL_EXECUTION_READY_S;
    const cycleEndTimeS = startTimeNum + cycleDurationS;
    // ---------------------------------------------------------------

    // Determine the current stage based on timePassedS (logic remains the same)
    if (isMajor) {
        if (timePassedS < MAJOR_POLL_PREVOTE_END_S) { stage = "PreVote"; }
        else if (timePassedS < MAJOR_POLL_VOTE_END_S) { stage = "Vote"; }
        else if (timePassedS < MAJOR_POLL_FINALVOTE_END_S) { stage = "Final Vote"; }
        else if (timePassedS < MAJOR_POLL_EXECUTION_READY_S) { stage = "PreExecution"; }
        else { stage = "Exec. Ready"; }
    } else {
        if (timePassedS < REGULAR_POLL_PREVOTE_END_S) { stage = "PreVote"; }
        else if (timePassedS < REGULAR_POLL_VOTE_END_S) { stage = "Vote"; }
        else if (timePassedS < REGULAR_POLL_FINALVOTE_END_S) { stage = "Final Vote"; }
        else if (timePassedS < REGULAR_POLL_EXECUTION_READY_S) { stage = "PreExecution"; }
        else { stage = "Exec. Ready"; }
    }

    // --- Calculate time left relative to the CYCLE END ---
    const timeLeftUntilCycleEndS = cycleEndTimeS - currentTimeS;
    // Use formatDuration, but handle the case where the cycle has already ended
    const timeLeftFormatted = stage === "Exec. Ready" ? "Ready" : formatDuration(timeLeftUntilCycleEndS);
    // ----------------------------------------------------

    // Add pause request indicator if needed
    if (pauseRequested && startTimeNum !== 0) {
        stage = `${stage} (Pause Req.)`;
    }

    // isPaused is determined solely by startTimeNum being 0
    return { stage, timeLeft: timeLeftFormatted, isPaused: (startTimeNum === 0), isMajor };
};
// --- End Poll Helpers ---


// --- Governance Provider Component ---
export const GovernanceProvider: React.FC<GovernanceProviderProps> = ({ children }) => {
    const { provider, network } = useAuthContext();
    const { selectedPool: contextSelectedPool } = usePoolsContext();
    const { simulatedTimestamp } = useTimeContext();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [governanceStatus, setGovernanceStatus] = useState<number[]>([]);
    const [metaData, setMetaData] = useState<GovernanceMetaData | null>(null);
    const [isLoadingGovernanceData, setIsLoadingGovernanceData] = useState<boolean>(false);
    const [errorGovernanceData, setErrorGovernanceData] = useState<string | null>(null);

    // State to store the *fixed* mock start time for the current pool
    const [mockPollStartTimeRef, setMockPollStartTimeRef] = useState<number | null>(null);

    // Memoize fetchGovernanceData to prevent infinite loops
    const fetchGovernanceData = useCallback(async (poolToFetch?: V4Pool | null) => {
        const currentPool = poolToFetch ?? contextSelectedPool;

        // --- Prerequisite Checks ---
         if (!provider || network?.chainId !== TARGET_NETWORK_CHAIN_ID || !currentPool || !currentPool.poolId) {
            setProposals([]); setGovernanceStatus([]); setMetaData(null); setErrorGovernanceData(null); setIsLoadingGovernanceData(false);
            setMockPollStartTimeRef(null); // Reset mock start time if pool/network invalid
            return;
        }
        if (GOVERNANCE_CONTRACT_ADDRESS === ZeroAddress || !GovernanceABI || GovernanceABI.length === 0) {
             setErrorGovernanceData("Governance contract/ABI not configured."); setIsLoadingGovernanceData(false); setProposals([]); setGovernanceStatus([]); setMetaData(null);
             setMockPollStartTimeRef(null);
             return;
         }

        setIsLoadingGovernanceData(true);
        setErrorGovernanceData(null);
        // Note: metaData is not cleared immediately to allow comparison below

        const currentPoolId = currentPool.poolId;
        console.log(`[GovernanceContext] Fetching governance data for PoolId: ${currentPoolId}`);

        try {
            const governanceContract = new Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernanceABI, provider);

             // Fetch REAL desired price and governance token address
             const [desiredPriceResult, govTokenResult] = await Promise.allSettled([
                  governanceContract.desiredPrice(currentPoolId),
                  governanceContract.governanceToken(),
             ]);

             // Determine currentTime to use (simulated or real)
             const currentTimeToUse = simulatedTimestamp !== null
                ? simulatedTimestamp
                : Math.floor(Date.now() / 1000);

            // --- Calculate or retrieve the FIXED mock start time ---
            let fixedMockStartTime: number;
            // Check if it's the initial load for this specific pool
            // Use a local variable to prevent dependency on metaData state within useCallback
            const isInitialLoadForPool = metaData === null || metaData.poolId !== currentPoolId;

            if (isInitialLoadForPool) {
                 const mockPollIdNumCalc = 1; // Regular poll
                 // Target: Initial stage is PreVote, approx 4.5 days left in *total cycle*
                 const TARGET_TOTAL_TIME_LEFT_S = (4 * 24 * 60 * 60) + (12 * 60 * 60); // 4.5 days
                 const initialRealTimeS = Math.floor(Date.now() / 1000); // Base initial calculation on real time
                 const initialEndTimeTarget = initialRealTimeS + TARGET_TOTAL_TIME_LEFT_S;
                 fixedMockStartTime = initialEndTimeTarget - REGULAR_POLL_EXECUTION_READY_S; // StartTime = EndTime - Duration

                 // Use functional update for the state setter
                 setMockPollStartTimeRef(fixedMockStartTime);
                 console.log(`[GovernanceContext] Calculated NEW fixed mock start time: ${fixedMockStartTime} for pool ${currentPoolId} (Targeting PreVote initially)`);
            } else {
                // Use the stored start time if available, otherwise default (should normally be available after first load)
                fixedMockStartTime = mockPollStartTimeRef ?? Math.floor(Date.now() / 1000); // Fallback needed if state not set yet
                console.log(`[GovernanceContext] Using STORED fixed mock start time: ${fixedMockStartTime} for pool ${currentPoolId}`);
            }
            // --------------------------------------------------------

             // MOCK Poll State and Vote Distribution (using the fixed mock start time)
             const mockPollIdNum = 1;
             const mockPollState = {
                 id: BigInt(mockPollIdNum),
                 startTime: BigInt(fixedMockStartTime), // <<< Use the determined fixed start time
                 pauseRequested: false,
                 flags: BigInt(FLAG_IN_TIME_EXECUTION),
                 totalVotes: ethers.parseUnits("1000", 18), // Mock 1000 DPP total power
                 // Mock some vote distribution
                 voteDiffs: [
                    0n, 0n, 0n, 0n, 0n,
                    ethers.parseUnits("50", 18),    // Slot -5
                    ethers.parseUnits("100", 18),   // Slot -4
                    ethers.parseUnits("150", 18),   // Slot -3
                    ethers.parseUnits("200", 18),   // Slot -2
                    0n,                             // Slot -1
                    ethers.parseUnits("-250", 18), // Slot 0
                    ethers.parseUnits("-100", 18), // Slot +1
                    ethers.parseUnits("-50", 18),  // Slot +2
                    0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n // Slots +3 to +10
                 ]
             };
            // Convert mock bigints to numbers for the BarChart component
            const mockGovernanceStatus = mockPollState.voteDiffs.map(diff => Number(ethers.formatUnits(diff, 18)));

            // --- Process fetched REAL data ---
            let fetchedDesiredPriceTick: number | null = null;
            let fetchedGovTokenAddr: string | null = null;
            if (desiredPriceResult.status === 'fulfilled') fetchedDesiredPriceTick = Number(desiredPriceResult.value);
            else console.error(`[GovernanceContext] Failed desiredPrice fetch:`, desiredPriceResult.reason);
            if (govTokenResult.status === 'fulfilled') fetchedGovTokenAddr = govTokenResult.value;
            else console.error(`[GovernanceContext] Failed gov token fetch:`, govTokenResult.reason);

             // --- Calculate Poll Info using FIXED MOCK start time and potentially advanced currentTimeToUse ---
            let pollMetaData: Partial<GovernanceMetaData> = { /* defaults */ };
            if (mockPollState) {
                 const pollIdNum = Number(mockPollState.id);
                 const startTimeNum = Number(mockPollState.startTime); // Use fixed start time
                 const pauseRequestedBool = Boolean(mockPollState.pauseRequested);
                 const flagsNum = Number(mockPollState.flags);
                // Pass the potentially advanced current time to the calculation
                // Use the CORRECTED calculatePollInfo function
                const { stage, timeLeft, isPaused, isMajor } = calculatePollInfo(pollIdNum, startTimeNum, pauseRequestedBool, currentTimeToUse);
                pollMetaData = { pollId: pollIdNum.toString(), pollStartTime: startTimeNum, pollPauseRequested: pauseRequestedBool, pollFlags: flagsNum, pollStage: stage, pollTimeLeft: timeLeft, pollIsPaused: isPaused, pollIsMajor: isMajor, pollIsManualExecution: (flagsNum & FLAG_MANUAL_EXECUTION) !== 0 };
                console.log(`[GovernanceContext] Calculated poll info (using time: ${currentTimeToUse}, start: ${startTimeNum}): stage=${stage}, timeLeft=${timeLeft}`);
             }

            // --- Set Final State ---
            setMetaData({
                 poolId: currentPoolId,
                 desiredPriceTick: fetchedDesiredPriceTick, // Real
                 governanceTokenAddress: fetchedGovTokenAddr, // Real
                 pollId: pollMetaData.pollId ?? 'N/A', // Mock
                 pollStartTime: pollMetaData.pollStartTime ?? null, // Mock (fixed)
                 pollPauseRequested: pollMetaData.pollPauseRequested ?? false, // Mock
                 pollFlags: pollMetaData.pollFlags ?? null, // Mock
                 pollStage: pollMetaData.pollStage ?? 'N/A', // Mock derived (using potentially simulated time)
                 pollTimeLeft: pollMetaData.pollTimeLeft ?? 'N/A', // Mock derived (now reflects time left in cycle)
                 pollIsPaused: pollMetaData.pollIsPaused ?? true, // Mock derived
                 pollIsManualExecution: pollMetaData.pollIsManualExecution ?? false, // Mock derived
                 pollIsMajor: pollMetaData.pollIsMajor ?? false, // Mock derived
             });
            setGovernanceStatus(mockGovernanceStatus); // Mock chart data
            setProposals([]); // Keep proposals empty

        } catch (err: any) {
            console.error(`[GovernanceContext] General error fetching data for ${currentPoolId}:`, err);
            setErrorGovernanceData(`Failed to load governance data: ${err.message || String(err)}`);
            // Clear state on error
            setProposals([]); setGovernanceStatus([]); setMetaData(null);
             setMockPollStartTimeRef(null); // Reset mock start time on error
        } finally {
            setIsLoadingGovernanceData(false);
        }
        // Dependencies only include external values that should trigger a refetch
    }, [provider, network, contextSelectedPool, simulatedTimestamp, mockPollStartTimeRef]); // mockPollStartTimeRef needed here because the *logic* inside depends on reading it

     // useEffect to trigger fetch when relevant contexts change
     useEffect(() => {
        // Fetch data only when the selected pool is available and matches the network
        // Also refetches when simulatedTimestamp changes
        if (contextSelectedPool && network?.chainId === TARGET_NETWORK_CHAIN_ID) {
             fetchGovernanceData(contextSelectedPool);
        } else {
             // Clear state if pool/network is invalid
             setProposals([]); setGovernanceStatus([]); setMetaData(null); setErrorGovernanceData(null); setIsLoadingGovernanceData(false);
             setMockPollStartTimeRef(null); // Clear stored mock start time
        }
        // fetchGovernanceData is stable due to useCallback
    }, [provider, network, contextSelectedPool, simulatedTimestamp, fetchGovernanceData]);

    // Memoize the context value provided to consumers
    const contextValue = useMemo(
        () => ({
            proposals,
            governanceStatus,
            metaData,
            isLoadingGovernanceData,
            errorGovernanceData,
            fetchGovernanceData, // Provide the memoized function
        }),
        [ proposals, governanceStatus, metaData, isLoadingGovernanceData, errorGovernanceData, fetchGovernanceData ] // Include fetchGovernanceData here
    );

    return (
        <GovernanceContext.Provider value={contextValue}>
            {children}
        </GovernanceContext.Provider>
    );
};