// src/components/Governance/Governance.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Grid, CircularProgress, Alert } from '@mui/material';
import { formatUnits, parseUnits } from 'ethers';

// Context Imports
import { GovernanceMetaData, useGovernanceContext } from '../../contexts/GovernanceContext'; // Import GovernanceMetaData
import { useBalancesContext } from '../../contexts/BalancesContext';
import { usePoolsContext } from '../../contexts/PoolsContext';
import { useTimeContext } from '../../contexts/TimeContext';
import { useLoadingContext } from '../../contexts/LoadingContext'; // Import LoadingContext
import { useSnackbarContext } from '../../contexts/SnackbarProvider'; // Import SnackbarContext

// Child Component Imports
import GovernanceInfoBar from './GovernanceInfoBar';
import GovernanceStatusChart from './GovernanceStatusChart';
import DelegationForm from './DelegationForm';
import VoteForm from './VoteForm';
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants';
import { useGovernanceActions } from '../../hooks/useGovernanceActions';

// --- localStorage Keys ---
const LS_MOCK_DPP_BALANCE = 'governance_mockDppBalanceRaw';
const LS_MOCK_VOTING_POWER = 'governance_mockVotingPowerRaw';
const LS_MOCK_GOV_STATUS = 'governance_mockGovernanceStatus';
const LS_MOCK_POLL_ID = 'governance_mockPollIdNum';
const LS_MOCK_POLL_START_TIME = 'governance_mockPollStartTime';

// Helper to read bigint from localStorage
const getBigIntFromLS = (key: string): bigint | null => {
    const stored = localStorage.getItem(key);
    if (stored === null) return null;
    try {
        return BigInt(stored);
    } catch (e) {
        console.warn(`Failed to parse BigInt from localStorage key "${key}", removing item.`);
        localStorage.removeItem(key);
        return null;
    }
};

// Helper to read number array from localStorage
const getNumberArrayFromLS = (key: string): number[] | null => {
    const stored = localStorage.getItem(key);
    if (stored === null) return null;
    try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'number')) {
            return parsed;
        } else {
            console.warn(`Invalid array data in localStorage key "${key}", removing item.`);
            localStorage.removeItem(key);
            return null;
        }
    } catch (e) {
        console.warn(`Failed to parse JSON array from localStorage key "${key}", removing item.`);
        localStorage.removeItem(key);
        return null;
    }
};

// Helper to read number from localStorage
const getNumberFromLS = (key: string): number | null => {
    const stored = localStorage.getItem(key);
    if (stored === null) return null;
    try {
        const num = parseInt(stored, 10);
        return !isNaN(num) ? num : null;
    } catch (e) {
        console.warn(`Failed to parse Number from localStorage key "${key}", removing item.`);
        localStorage.removeItem(key);
        return null;
    }
};


// --- Default Mock Values ---
const DEFAULT_DPP_DECIMALS = 18;
const DEFAULT_MOCK_BALANCE_RAW = parseUnits("100", DEFAULT_DPP_DECIMALS);
const VOTE_SLOTS = 21; // -10 to +10 inclusive
const DEFAULT_MOCK_STATUS = Array(VOTE_SLOTS).fill(0);
const DEFAULT_MOCK_POLL_ID = 1;
const DEFAULT_MOCK_START_TIME = Math.floor(Date.now() / 1000) - (2 * 24 * 60 * 60); // Start default poll ~2 days ago

// Poll Durations (Mirror Poll.sol - can move to constants)
const CYCLE_LENGTH = 5;
const REGULAR_POLL_PREVOTE_END_S = 1 * 24 * 60 * 60; // 1 day
const REGULAR_POLL_VOTE_END_S = 3 * 24 * 60 * 60; // 3 days
const REGULAR_POLL_FINALVOTE_END_S = 4 * 24 * 60 * 60; // 4 days
const REGULAR_POLL_EXECUTION_READY_S = 5 * 24 * 60 * 60; // 5 days
const MAJOR_POLL_PREVOTE_END_S = 1 * 24 * 60 * 60; // 1 day
const MAJOR_POLL_VOTE_END_S = 6 * 24 * 60 * 60; // 6 days
const MAJOR_POLL_FINALVOTE_END_S = 8 * 24 * 60 * 60; // 8 days
const MAJOR_POLL_EXECUTION_READY_S = 10 * 24 * 60 * 60; // 10 days

// Define formatDuration locally or import it
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


const Governance: React.FC = () => {
    // --- Get state from Contexts ---
    const {
        metaData: realMetaData,
        // initialGovernanceStatus is not directly used for mock state init anymore
        isLoadingGovernanceData,
        errorGovernanceData,
    } = useGovernanceContext();
    const { tokenDecimals } = useBalancesContext(); // Only need decimals
    const { selectedPool } = usePoolsContext();
    const { handleVoteWithRange, handleDelegate } = useGovernanceActions();
    const { simulatedTimestamp } = useTimeContext();
    const { setLoading, isLoading: loadingStates } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();

    // --- Mock State Management ---
    const [mockDppBalanceRaw, setMockDppBalanceRaw] = useState<bigint | null>(null);
    const [mockVotingPowerRaw, setMockVotingPowerRaw] = useState<bigint | null>(null);
    const [mockGovernanceStatus, setMockGovernanceStatus] = useState<number[] | null>(null);
    const [mockPollIdNum, setMockPollIdNum] = useState<number | null>(null);
    const [mockPollStartTime, setMockPollStartTime] = useState<number | null>(null);

    const DPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? DEFAULT_DPP_DECIMALS;

    // --- Effect to Initialize Mock State from localStorage or Defaults (Runs Once) ---
     useEffect(() => {
        const initBalance = getBigIntFromLS(LS_MOCK_DPP_BALANCE) ?? DEFAULT_MOCK_BALANCE_RAW;
        const initPower = getBigIntFromLS(LS_MOCK_VOTING_POWER) ?? 0n;
        const initStatus = getNumberArrayFromLS(LS_MOCK_GOV_STATUS) ?? DEFAULT_MOCK_STATUS;
        const initPollId = getNumberFromLS(LS_MOCK_POLL_ID) ?? DEFAULT_MOCK_POLL_ID;
        const initStartTime = getNumberFromLS(LS_MOCK_POLL_START_TIME) ?? DEFAULT_MOCK_START_TIME;

        // Only set state if it's currently null to avoid overwriting after first load
        if (mockDppBalanceRaw === null) setMockDppBalanceRaw(initBalance);
        if (mockVotingPowerRaw === null) setMockVotingPowerRaw(initPower);
        if (mockGovernanceStatus === null) setMockGovernanceStatus(initStatus);
        if (mockPollIdNum === null) setMockPollIdNum(initPollId);
        if (mockPollStartTime === null) setMockPollStartTime(initStartTime);

        // Ensure defaults are saved back if LS was initially empty
        if (getBigIntFromLS(LS_MOCK_DPP_BALANCE) === null) localStorage.setItem(LS_MOCK_DPP_BALANCE, initBalance.toString());
        if (getBigIntFromLS(LS_MOCK_VOTING_POWER) === null) localStorage.setItem(LS_MOCK_VOTING_POWER, initPower.toString());
        if (getNumberArrayFromLS(LS_MOCK_GOV_STATUS) === null) try { localStorage.setItem(LS_MOCK_GOV_STATUS, JSON.stringify(initStatus)); } catch (e) { console.error("LS Error (Status Init Save):", e); }
        if (getNumberFromLS(LS_MOCK_POLL_ID) === null) localStorage.setItem(LS_MOCK_POLL_ID, initPollId.toString());
        if (getNumberFromLS(LS_MOCK_POLL_START_TIME) === null) localStorage.setItem(LS_MOCK_POLL_START_TIME, initStartTime.toString());


        console.log("[Governance Mock] State Initialized (from LS or Default):", {
            balance: initBalance.toString(),
            power: initPower.toString(),
            statusLength: initStatus.length,
            pollId: initPollId,
            startTime: initStartTime,
        });

    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this runs only once

    // --- Effects to Persist Mock State Changes to localStorage ---
    useEffect(() => { if (mockDppBalanceRaw !== null) localStorage.setItem(LS_MOCK_DPP_BALANCE, mockDppBalanceRaw.toString()); }, [mockDppBalanceRaw]);
    useEffect(() => { if (mockVotingPowerRaw !== null) localStorage.setItem(LS_MOCK_VOTING_POWER, mockVotingPowerRaw.toString()); }, [mockVotingPowerRaw]);
    useEffect(() => { if (mockGovernanceStatus !== null) try { localStorage.setItem(LS_MOCK_GOV_STATUS, JSON.stringify(mockGovernanceStatus)); } catch (e) { console.error("LS Error (Status Save):", e); } }, [mockGovernanceStatus]);
    useEffect(() => { if (mockPollIdNum !== null) localStorage.setItem(LS_MOCK_POLL_ID, mockPollIdNum.toString()); }, [mockPollIdNum]);
    useEffect(() => { if (mockPollStartTime !== null) localStorage.setItem(LS_MOCK_POLL_START_TIME, mockPollStartTime.toString()); }, [mockPollStartTime]);


    // --- Derive Poll Info Dynamically ---
    const derivedMockPollInfo = useMemo(() => {
        if (mockPollIdNum === null || mockPollStartTime === null) {
            return { stage: 'Loading...', timeLeft: 'N/A', isPaused: true, isMajor: false };
        }
        const currentTimeS = simulatedTimestamp ?? Math.floor(Date.now() / 1000);
        const timePassedS = currentTimeS - mockPollStartTime;
        const isMajor = mockPollIdNum % CYCLE_LENGTH === (CYCLE_LENGTH - 1);

        let stage: string;
        const cycleDurationS = isMajor ? MAJOR_POLL_EXECUTION_READY_S : REGULAR_POLL_EXECUTION_READY_S;
        const cycleEndTimeS = mockPollStartTime + cycleDurationS;

        if (timePassedS < 0) { stage = "Not Started"; }
        else if (timePassedS >= cycleDurationS) { stage = "Exec. Ready"; }
        else if (isMajor) {
            if (timePassedS < MAJOR_POLL_PREVOTE_END_S) { stage = "PreVote"; }
            else if (timePassedS < MAJOR_POLL_VOTE_END_S) { stage = "Vote"; }
            else if (timePassedS < MAJOR_POLL_FINALVOTE_END_S) { stage = "Final Vote"; }
            else { stage = "PreExecution"; }
        } else { // Regular Poll
            if (timePassedS < REGULAR_POLL_PREVOTE_END_S) { stage = "PreVote"; }
            else if (timePassedS < REGULAR_POLL_VOTE_END_S) { stage = "Vote"; }
            else if (timePassedS < REGULAR_POLL_FINALVOTE_END_S) { stage = "Final Vote"; }
            else { stage = "PreExecution"; }
        }

        const timeLeftUntilCycleEndS = cycleEndTimeS - currentTimeS;
        const timeLeftFormatted = stage === "Exec. Ready" ? "Ready" : formatDuration(timeLeftUntilCycleEndS);

        return { stage, timeLeft: timeLeftFormatted, isPaused: false, isMajor };
    }, [mockPollIdNum, mockPollStartTime, simulatedTimestamp]);


    // --- Combine Real Meta with Mock Poll Info ---
    const finalMetaData: GovernanceMetaData | null = useMemo(() => {
         if (!realMetaData || mockPollIdNum === null || mockPollStartTime === null) return null;
         // Ensure poolId from selectedPool takes precedence if available
         const currentPoolId = selectedPool?.poolId ?? realMetaData.poolId;
         return {
             // Data likely coming from the real hook/contract
             desiredPriceTick: realMetaData.desiredPriceTick,
             governanceTokenAddress: realMetaData.governanceTokenAddress,
             // Data now primarily derived from mock state
             poolId: currentPoolId, // Use selected pool's ID primarily
             pollId: mockPollIdNum.toString(),
             pollStartTime: mockPollStartTime,
             pollPauseRequested: false, // Mocked value
             pollFlags: 0, // Mocked value
             pollStage: derivedMockPollInfo.stage,
             pollTimeLeft: derivedMockPollInfo.timeLeft,
             pollIsPaused: derivedMockPollInfo.isPaused,
             pollIsMajor: derivedMockPollInfo.isMajor,
             pollIsManualExecution: false, // Mocked value
         };
    }, [realMetaData, mockPollIdNum, mockPollStartTime, derivedMockPollInfo, selectedPool?.poolId]);


    // --- Derived State ---
    const isLoading = isLoadingGovernanceData || mockDppBalanceRaw === null || mockVotingPowerRaw === null || mockGovernanceStatus === null || mockPollIdNum === null || mockPollStartTime === null;
    const displayError = errorGovernanceData;

    const canVote = !!(
        !isLoadingGovernanceData &&
        (mockVotingPowerRaw ?? 0n) > 0n &&
        finalMetaData?.pollStage && // Use derived stage
        (finalMetaData.pollStage === 'Vote' || finalMetaData.pollStage === 'Final Vote')
    );

    // --- Mock Action Wrappers ---
     const handleMockVote = useCallback(async (proposalId: number, lower: number, upper: number) => {
          if (mockVotingPowerRaw === null || mockGovernanceStatus === null) {
               console.error("Cannot vote: Mock state not initialized."); return false;
          }
          return handleVoteWithRange(
              proposalId, lower, upper,
              mockVotingPowerRaw, mockGovernanceStatus,
              setMockVotingPowerRaw, setMockGovernanceStatus
          );
      }, [handleVoteWithRange, mockVotingPowerRaw, mockGovernanceStatus]);

      const handleMockDelegate = useCallback(async (targetAddress: string, amount: number) => {
           if (mockVotingPowerRaw === null || mockDppBalanceRaw === null) {
                console.error("Cannot delegate: Mock state not initialized."); return false;
            }
           return handleDelegate(
               targetAddress, amount,
               mockVotingPowerRaw, mockDppBalanceRaw,
               setMockVotingPowerRaw, setMockDppBalanceRaw
           );
       }, [handleDelegate, mockVotingPowerRaw, mockDppBalanceRaw]);


    // --- Execute Action Handler ---
    const handleMockExecute = useCallback(async () => {
         if (isLoading || !finalMetaData || finalMetaData.pollStage !== 'Exec. Ready') {
             showSnackbar("Poll is not ready for execution.", "warning");
             return;
         }
         if (mockPollIdNum === null || mockDppBalanceRaw === null) {
             showSnackbar("Cannot execute: Mock state not ready.", "error");
             return;
         }

        const executeKey = `executePoll_${mockPollIdNum}`;
        setLoading(executeKey, true);
        console.log(`[Mock Execute] Executing poll ID: ${mockPollIdNum}`);

        try {
            await new Promise(resolve => setTimeout(resolve, 700)); // Simulate delay

            const newPollId = mockPollIdNum + 1;
            const newStartTime = simulatedTimestamp ?? Math.floor(Date.now() / 1000); // Start next poll now

            // Reset state for the new poll
            setMockPollIdNum(newPollId);
            setMockPollStartTime(newStartTime);
            setMockGovernanceStatus(DEFAULT_MOCK_STATUS); // Reset chart
            // setMockVotingPowerRaw(mockDppBalanceRaw); // Reset voting power to full balance
            console.log(`[Mock Execute] New Poll Started: ID=${newPollId}, StartTime=${newStartTime}, VotingPower Reset to ${mockDppBalanceRaw.toString()}`);


            showSnackbar(`Mock Poll ${mockPollIdNum} Executed! Starting Poll ${newPollId}.`, 'success');

        } catch (e) {
            console.error("Mock Execute Error:", e);
            showSnackbar("Failed to simulate poll execution.", "error");
        } finally {
            setLoading(executeKey, false);
        }
    }, [
        isLoading, finalMetaData, mockPollIdNum, mockDppBalanceRaw,
        setLoading, showSnackbar, simulatedTimestamp,
        setMockPollIdNum, setMockPollStartTime, setMockGovernanceStatus, setMockVotingPowerRaw
    ]);


    // --- Render Logic ---
    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Initializing Governance Mock State...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', mb: 3 }}>
                Governance Center (Mock Actions)
            </Typography>

            {displayError && <Alert severity="error" sx={{ mb: 2 }}>Error loading pool data: {displayError}</Alert>}

            {/* Pass derived metaData (combined real + mock poll state) */}
            <GovernanceInfoBar
                mockDppBalanceRaw={mockDppBalanceRaw ?? 0n}
                mockVotingPowerRaw={mockVotingPowerRaw ?? 0n}
                metaData={finalMetaData} // Use the combined metadata
                onExecute={handleMockExecute} // Pass execute handler
                isLoadingExecute={loadingStates[`executePoll_${mockPollIdNum ?? 0}`] ?? false} // Pass loading state for execute
            />

            <GovernanceStatusChart mockGovernanceStatus={mockGovernanceStatus || []} />

            <Grid container spacing={3} alignItems="stretch">
                <Grid item xs={12} md={6}>
                    <VoteForm
                        proposalId={mockPollIdNum ?? 0} // Use mock poll ID
                        mockVotingPowerRaw={mockVotingPowerRaw ?? 0n}
                        onVoteSubmit={handleMockVote}
                        canVote={canVote}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <DelegationForm
                        mockDppBalanceRaw={mockDppBalanceRaw ?? 0n}
                        onDelegateSubmit={handleMockDelegate}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default Governance;