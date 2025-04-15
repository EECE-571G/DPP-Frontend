// src/components/Governance/Governance.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Grid, CircularProgress, Alert } from '@mui/material';
import { formatUnits, parseUnits } from 'ethers'; // Need parseUnits for default value

// Context Imports
import { useGovernanceContext } from '../../contexts/GovernanceContext';
// <<< Remove BalancesContext import for balance >>>
import { useBalancesContext } from '../../contexts/BalancesContext';
import { usePoolsContext } from '../../contexts/PoolsContext';

// Child Component Imports
import GovernanceInfoBar from './GovernanceInfoBar';
import GovernanceStatusChart from './GovernanceStatusChart';
import DelegationForm from './DelegationForm';
import VoteForm from './VoteForm';
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants'; // Still needed for decimals guess
import { useGovernanceActions } from '../../hooks/useGovernanceActions';

// --- localStorage Keys (Keep these) ---
const LS_MOCK_DPP_BALANCE = 'governance_mockDppBalanceRaw';
const LS_MOCK_VOTING_POWER = 'governance_mockVotingPowerRaw';
const LS_MOCK_GOV_STATUS = 'governance_mockGovernanceStatus';

// Helper to read bigint from localStorage (Keep)
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

// Helper to read number array from localStorage (Keep)
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

// --- Default Mock Values ---
const DEFAULT_DPP_DECIMALS = 18; // Assume 18 if context isn't available/needed
const DEFAULT_MOCK_BALANCE_RAW = parseUnits("100", DEFAULT_DPP_DECIMALS); // e.g., 1000 DPP
const VOTE_SLOTS = 21; // -10 to +10 inclusive
const DEFAULT_MOCK_STATUS = [0, 0, 0, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 90, 80, 70, 60, 50, 40, 30]; // Example status

const Governance: React.FC = () => {
    // --- Get state from Contexts (Exclude BalancesContext for balance) ---
    const {
        metaData, // Still get real metadata (desired price, poll state etc.)
        isLoadingGovernanceData,
        errorGovernanceData,
        fetchGovernanceData
    } = useGovernanceContext();
    // We still need tokenDecimals for formatting, but not userBalancesRaw for the value itself
    const { tokenDecimals } = useBalancesContext();
    const { selectedPool } = usePoolsContext();
    const { handleVoteWithRange, handleDelegate } = useGovernanceActions();

    // --- Mock State Management with localStorage Initialization & Defaults ---
    const [mockDppBalanceRaw, setMockDppBalanceRaw] = useState<bigint | null>(null);
    const [mockVotingPowerRaw, setMockVotingPowerRaw] = useState<bigint | null>(null);
    const [mockGovernanceStatus, setMockGovernanceStatus] = useState<number[] | null>(null);

    const DPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? DEFAULT_DPP_DECIMALS;

    // --- Effect to Initialize Mock State from localStorage or Defaults (Runs Once) ---
    useEffect(() => {
        const initialBalance = getBigIntFromLS(LS_MOCK_DPP_BALANCE);
        if (initialBalance === null) {
            console.log("[Governance Mock] LS empty for balance, initializing to default:", DEFAULT_MOCK_BALANCE_RAW.toString());
            setMockDppBalanceRaw(DEFAULT_MOCK_BALANCE_RAW);
            localStorage.setItem(LS_MOCK_DPP_BALANCE, DEFAULT_MOCK_BALANCE_RAW.toString());
        } else {
            setMockDppBalanceRaw(initialBalance);
        }

        const initialPower = getBigIntFromLS(LS_MOCK_VOTING_POWER);
        if (initialPower === null) {
            console.log("[Governance Mock] LS empty for power, initializing to default: 0");
            setMockVotingPowerRaw(0n);
            localStorage.setItem(LS_MOCK_VOTING_POWER, '0');
        } else {
            setMockVotingPowerRaw(initialPower);
        }

        const initialStatus = getNumberArrayFromLS(LS_MOCK_GOV_STATUS);
        if (initialStatus === null) {
            console.log("[Governance Mock] LS empty for status, initializing to default (zeros)");
            setMockGovernanceStatus(DEFAULT_MOCK_STATUS);
            try { localStorage.setItem(LS_MOCK_GOV_STATUS, JSON.stringify(DEFAULT_MOCK_STATUS)); }
            catch (e) { console.error("Failed to save default status to LS:", e); }
        } else {
            setMockGovernanceStatus(initialStatus);
        }
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Effects to Persist Mock State Changes to localStorage (Keep These) ---
    useEffect(() => {
        // Only save if it's not null (i.e., after initialization)
        if (mockDppBalanceRaw !== null) {
            localStorage.setItem(LS_MOCK_DPP_BALANCE, mockDppBalanceRaw.toString());
            // console.log("[Governance Mock] Saved mockDppBalanceRaw to LS:", mockDppBalanceRaw.toString());
        }
    }, [mockDppBalanceRaw]);

    useEffect(() => {
        if (mockVotingPowerRaw !== null) {
            localStorage.setItem(LS_MOCK_VOTING_POWER, mockVotingPowerRaw.toString());
            // console.log("[Governance Mock] Saved mockVotingPowerRaw to LS:", mockVotingPowerRaw.toString());
        }
    }, [mockVotingPowerRaw]);

    useEffect(() => {
        if (mockGovernanceStatus !== null) {
             try {
                 localStorage.setItem(LS_MOCK_GOV_STATUS, JSON.stringify(mockGovernanceStatus));
                 // console.log("[Governance Mock] Saved mockGovernanceStatus to LS:", mockGovernanceStatus);
             } catch (e) { console.error("Failed to stringify governance status for LS:", e); }
        }
    }, [mockGovernanceStatus]);

    // --- Derived State ---
    // Updated isLoading check: Removed BalancesContext loading, check mock states are initialized
    const isLoading = isLoadingGovernanceData || mockDppBalanceRaw === null || mockVotingPowerRaw === null || mockGovernanceStatus === null;
    const displayError = errorGovernanceData; // Remove errorBalances

    const canVote = !!(
        !isLoadingGovernanceData && // Still check real metadata loading
        (mockVotingPowerRaw ?? 0n) > 0n &&
        metaData?.pollStage &&
        (metaData.pollStage === 'Vote' || metaData.pollStage === 'Final Vote')
    );

    // --- Mock Action Wrappers (remain the same, logic is inside the hook) ---
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

            {/* Pass MOCKED balance and voting power to InfoBar */}
            <GovernanceInfoBar
                mockDppBalanceRaw={mockDppBalanceRaw ?? 0n}
                mockVotingPowerRaw={mockVotingPowerRaw ?? 0n}
                metaData={metaData} // Pass real metadata
            />

            {/* Pass MOCKED status to Chart */}
            <GovernanceStatusChart mockGovernanceStatus={mockGovernanceStatus || []} />

            <Grid container spacing={3} alignItems="stretch">
                <Grid item xs={12} md={6}>
                    {/* Pass MOCKED voting power and wrapped action handler */}
                    <VoteForm
                        proposalId={metaData ? parseInt(metaData.pollId, 10) || 0 : 0}
                        mockVotingPowerRaw={mockVotingPowerRaw ?? 0n}
                        onVoteSubmit={handleMockVote}
                        canVote={canVote}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    {/* Pass MOCKED balance and wrapped action handler */}
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