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
import { Proposal } from '../types'; // Keep if needed elsewhere
import { useAuthContext } from './AuthContext';
import { usePoolsContext, V4Pool } from './PoolsContext';
import { GOVERNANCE_CONTRACT_ADDRESS, TARGET_NETWORK_CHAIN_ID } from '../constants';
import DesiredPricePoolABI from '../abis/DesiredPricePool.json'; // Ensure ABI is imported

// --- Ensure this interface is defined and exported ---
export interface GovernanceMetaData {
    poolId: string;
    desiredPriceTick: number | null;
    governanceToken: string | null;
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
    proposals: Proposal[];
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

// --- Constants for Poll Durations (Define them here at module scope) ---
const CYCLE_LENGTH = 5;
const REGULAR_POLL_PREVOTE_END_S = 1 * 24 * 60 * 60;
const REGULAR_POLL_VOTE_END_S = 3 * 24 * 60 * 60;
const REGULAR_POLL_FINALVOTE_END_S = 4 * 24 * 60 * 60;
const REGULAR_POLL_EXECUTION_READY_S = 5 * 24 * 60 * 60;
const MAJOR_POLL_PREVOTE_END_S = 1 * 24 * 60 * 60;
const MAJOR_POLL_VOTE_END_S = 6 * 24 * 60 * 60;
const MAJOR_POLL_FINALVOTE_END_S = 8 * 24 * 60 * 60;
const MAJOR_POLL_EXECUTION_READY_S = 10 * 24 * 60 * 60;

// Poll Flags
const FLAG_MANUAL_EXECUTION = 1 << 0;

// Helper function formatDuration (keep as before)
const formatDuration = (seconds: number): string => { /* ... keep implementation ... */
    if (seconds < 0) return "Ended";
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${Math.floor(seconds % 60)}s`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${Math.floor(minutes % 60)}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${Math.floor(hours % 24)}h`;
};

// Helper function calculatePollInfo (keep as before, now constants are in scope)
const calculatePollInfo = ( /* ... keep implementation ... */
     pollIdNum: number,
    startTimeNum: number,
    pauseRequested: boolean
): { stage: string; timeLeft: string; isPaused: boolean; isMajor: boolean } => {
    // ... keep implementation ...
     if (startTimeNum === 0) {
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

    return { stage, timeLeft: timeLeftFormatted, isPaused: false, isMajor };
};

// --- Ensure Provider uses the correct type and Context variable ---
export const GovernanceProvider: React.FC<GovernanceProviderProps> = ({ children }) => {
    // ... (keep state variables: proposals, governanceStatus, metaData, etc.) ...
    const { provider, network } = useAuthContext();
    const { selectedPool: contextSelectedPool } = usePoolsContext();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [governanceStatus, setGovernanceStatus] = useState<number[]>([]);
    const [metaData, setMetaData] = useState<GovernanceMetaData | null>(null);
    const [isLoadingGovernanceData, setIsLoadingGovernanceData] = useState<boolean>(false);
    const [errorGovernanceData, setErrorGovernanceData] = useState<string | null>(null);

    // ... (keep fetchGovernanceData function as previously corrected) ...
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
        setProposals([]);
        setGovernanceStatus([]);

        const currentPoolId = currentPool.poolId;
        console.log(`[GovernanceContext] Fetching available governance data for PoolId: ${currentPoolId}`);

        try {
            // Use GovernanceABI
            const governanceContract = new Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernanceABI, provider);

             // --- Fetch Available Data Concurrently ---
            //  const results = await Promise.allSettled([
                //  governanceContract.desiredPrice(currentPoolId),
                //  governanceContract.governanceToken(),
                //  governanceContract.getPollState(currentPoolId) // <<< Check if this returns voteDiffs
            //  ]);

             // Mock data for testing
             const results = [
                    { status: 'fulfilled', value: 1, reason: null }, // Mock desired price tick
                    { status: 'fulfilled', value: await governanceContract.governanceToken(), reason: null }, // Mock governance token address
                    { status: 'fulfilled', value: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], reason: null }, // Mock poll state
             ]

             // ... (rest of the processing logic inside try block remains the same) ...
            let fetchedDesiredPriceTick: number | null = null;
            let fetchedGovTokenAddr: string | null = null;
            let fetchedPollState: any = null;
            let fetchedVoteDiffs: bigint[] = [];

            if (results[0].status === 'fulfilled') fetchedDesiredPriceTick = Number(results[0].value);
            else console.error(`[GovernanceContext] Failed desiredPrice fetch:`, results[0].reason);

            if (results[1].status === 'fulfilled') fetchedGovTokenAddr = results[1].value;
            else console.error(`[GovernanceContext] Failed gov token fetch:`, results[1].reason);

             if (results[2].status === 'fulfilled') {
                 fetchedPollState = results[2].value;
                 if (fetchedPollState && typeof fetchedPollState === 'object' && fetchedPollState !== null) {
                     // Assuming voteDiffs is the 6th element (index 5) based on Poll.State struct
                     const voteDiffsMaybe = fetchedPollState[5] ?? fetchedPollState.voteDiffs;
                     if (Array.isArray(voteDiffsMaybe)) {
                         fetchedVoteDiffs = voteDiffsMaybe.map(v => {
                             try { return BigInt(v); } catch { return 0n; } // Safely convert to BigInt
                         });
                     }
                 }
                 console.log(`[GovernanceContext] Fetched Poll State:`, fetchedPollState);
             } else {
                 console.error(`[GovernanceContext] Failed poll state fetch:`, results[2].reason);
             }

             let pollMetaData: Partial<GovernanceMetaData> & { pollVoteDiffs?: number[] } = { /* defaults */
                pollId: 'N/A',
                pollStartTime: null,
                pollPauseRequested: false,
                pollFlags: null,
                pollStage: 'N/A',
                pollTimeLeft: 'N/A',
                pollIsPaused: true,
                pollIsManualExecution: false,
                pollIsMajor: false,
                pollVoteDiffs: [],
             };

            if (fetchedPollState) {
                 const pollIdNum = Number(fetchedPollState[0]);
                 const startTimeNum = Number(fetchedPollState[1]);
                 const pauseRequestedBool = Boolean(fetchedPollState[2]);
                 const flagsNum = Number(fetchedPollState[3]);

                const { stage, timeLeft, isPaused, isMajor } = calculatePollInfo(pollIdNum, startTimeNum, pauseRequestedBool);

                pollMetaData = {
                     ...pollMetaData,
                     pollId: pollIdNum.toString(),
                     pollStartTime: startTimeNum,
                     pollPauseRequested: pauseRequestedBool,
                     pollFlags: flagsNum,
                     pollStage: stage,
                     pollTimeLeft: timeLeft,
                     pollIsPaused: isPaused,
                     pollIsMajor: isMajor,
                     pollIsManualExecution: (flagsNum & FLAG_MANUAL_EXECUTION) !== 0,
                     pollVoteDiffs: fetchedVoteDiffs.map(diff => Number(diff)),
                 };
             }

            setMetaData({
                 poolId: currentPoolId,
                 desiredPriceTick: fetchedDesiredPriceTick,
                 governanceToken: fetchedGovTokenAddr,
                 pollId: pollMetaData.pollId ?? 'N/A',
                 pollStartTime: pollMetaData.pollStartTime ?? null,
                 pollPauseRequested: pollMetaData.pollPauseRequested ?? false,
                 pollFlags: pollMetaData.pollFlags ?? null,
                 pollStage: pollMetaData.pollStage ?? 'N/A',
                 pollTimeLeft: pollMetaData.pollTimeLeft ?? 'N/A',
                 pollIsPaused: pollMetaData.pollIsPaused ?? true,
                 pollIsManualExecution: pollMetaData.pollIsManualExecution ?? false,
                 pollIsMajor: pollMetaData.pollIsMajor ?? false,
             });

            setGovernanceStatus(pollMetaData.pollVoteDiffs ?? []);
            setProposals([]);


        } catch (err: any) {
            console.error(`[GovernanceContext] General error fetching data for ${currentPoolId}:`, err);
            setErrorGovernanceData(`Failed to load governance data: ${err.message || String(err)}`);
            setProposals([]); setGovernanceStatus([]); setMetaData(null);
        } finally {
            setIsLoadingGovernanceData(false);
        }
    }, [provider, network, contextSelectedPool]); // Keep dependencies

    // ... (keep useEffect and contextValue memoization) ...
     useEffect(() => {
        fetchGovernanceData(contextSelectedPool);
    }, [provider, network, contextSelectedPool, fetchGovernanceData]);

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