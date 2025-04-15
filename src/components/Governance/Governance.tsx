// src/components/Governance/Governance.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Grid, CircularProgress, Alert } from '@mui/material';
import { formatUnits } from 'ethers';

// Context Imports
import { useGovernanceContext } from '../../contexts/GovernanceContext';
import { useBalancesContext } from '../../contexts/BalancesContext';
import { usePoolsContext } from '../../contexts/PoolsContext';

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


const Governance: React.FC = () => {
    // --- Get state from Contexts ---
    const {
        governanceStatus: initialGovernanceStatus,
        metaData,
        isLoadingGovernanceData,
        errorGovernanceData,
        fetchGovernanceData
    } = useGovernanceContext();
    const { userBalancesRaw, tokenDecimals, isLoadingBalances, errorBalances } = useBalancesContext();
    const { selectedPool } = usePoolsContext();
    const { handleVoteWithRange, handleDelegate } = useGovernanceActions();

    // --- Mock State Management with localStorage Initialization ---
    // Initialize state from localStorage OR null if not found/invalid
    const [mockDppBalanceRaw, setMockDppBalanceRaw] = useState<bigint | null>(
        () => getBigIntFromLS(LS_MOCK_DPP_BALANCE)
    );
    const [mockVotingPowerRaw, setMockVotingPowerRaw] = useState<bigint | null>(
        () => getBigIntFromLS(LS_MOCK_VOTING_POWER) ?? 0n // Default power to 0 if not in LS
    );
    const [mockGovernanceStatus, setMockGovernanceStatus] = useState<number[] | null>(
        () => getNumberArrayFromLS(LS_MOCK_GOV_STATUS)
    );

    const DPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;

    // --- Effect to Sync with Context/Defaults IF localStorage was empty ---
    useEffect(() => {
        let balanceUpdated = false;
        let statusUpdated = false;

        // If balance wasn't loaded from LS, try to initialize from context *after* it loads
        if (mockDppBalanceRaw === null && !isLoadingBalances) {
            const initialBalance = userBalancesRaw[GOVERNANCE_TOKEN_ADDRESS] ?? 0n;
            console.log("[Governance Mock] LS empty, initializing mock balance from context:", initialBalance.toString());
            setMockDppBalanceRaw(initialBalance);
            balanceUpdated = true;
        }

        // If voting power is still null (should only happen on first ever load with empty LS), set to 0
        if (mockVotingPowerRaw === null) {
             console.log("[Governance Mock] LS empty, initializing mock voting power to: 0");
             setMockVotingPowerRaw(0n);
             // No need for powerUpdated flag, it defaults above
        }

        // If chart status wasn't loaded from LS, try to initialize from context
        if (mockGovernanceStatus === null && initialGovernanceStatus) {
            console.log("[Governance Mock] LS empty, initializing mock status from context");
            setMockGovernanceStatus(initialGovernanceStatus);
            statusUpdated = true;
        } else if (mockGovernanceStatus === null && !initialGovernanceStatus) {
            // If context is also empty/null, initialize to default empty array
            // This might happen briefly during initial load cycles
             console.log("[Governance Mock] LS and Context empty, initializing mock status to default");
             setMockGovernanceStatus([]);
             statusUpdated = true;
        }

        // If we initialized balance/status from context/defaults because LS was empty,
        // immediately save these initial values back to LS.
        // Check the initial values read *during this effect run*
        const initialBalanceForLS = userBalancesRaw[GOVERNANCE_TOKEN_ADDRESS] ?? 0n;
        if (balanceUpdated && initialBalanceForLS !== null) {
             localStorage.setItem(LS_MOCK_DPP_BALANCE, initialBalanceForLS.toString());
        }
        // Power defaults to 0n if LS is empty, save that
        if (getBigIntFromLS(LS_MOCK_VOTING_POWER) === null) { // Check LS directly to avoid race condition with state update
             localStorage.setItem(LS_MOCK_VOTING_POWER, '0');
        }
        if (statusUpdated && (initialGovernanceStatus || [])) {
            try {
                localStorage.setItem(LS_MOCK_GOV_STATUS, JSON.stringify(initialGovernanceStatus || []));
            } catch (e) { console.error("Failed to stringify initial governance status for LS:", e); }
        }

    // Dependencies carefully chosen: only run when context values we initialize *from* change,
    // or when the loading state allows initialization. Avoid depending on the mock states themselves here.
    }, [userBalancesRaw, isLoadingBalances, initialGovernanceStatus]);

    // --- Effects to Persist Mock State Changes to localStorage ---
    useEffect(() => {
        if (mockDppBalanceRaw !== null) {
            localStorage.setItem(LS_MOCK_DPP_BALANCE, mockDppBalanceRaw.toString());
            console.log("[Governance Mock] Saved mockDppBalanceRaw to LS:", mockDppBalanceRaw.toString());
        }
    }, [mockDppBalanceRaw]);

    useEffect(() => {
        if (mockVotingPowerRaw !== null) {
            localStorage.setItem(LS_MOCK_VOTING_POWER, mockVotingPowerRaw.toString());
            console.log("[Governance Mock] Saved mockVotingPowerRaw to LS:", mockVotingPowerRaw.toString());
        }
    }, [mockVotingPowerRaw]);

    useEffect(() => {
        if (mockGovernanceStatus !== null) {
             try {
                 localStorage.setItem(LS_MOCK_GOV_STATUS, JSON.stringify(mockGovernanceStatus));
                 console.log("[Governance Mock] Saved mockGovernanceStatus to LS:", mockGovernanceStatus);
             } catch (e) { console.error("Failed to stringify governance status for LS:", e); }
        }
    }, [mockGovernanceStatus]);

    // --- Derived State ---
    // Updated isLoading check: Now waits for all mock states to be non-null
    const isLoading = isLoadingGovernanceData || isLoadingBalances || mockDppBalanceRaw === null || mockVotingPowerRaw === null || mockGovernanceStatus === null;
    const displayError = errorGovernanceData || errorBalances;

    const canVote = !!(
        !isLoadingGovernanceData && // Still check real metadata loading
        (mockVotingPowerRaw ?? 0n) > 0n &&
        metaData?.pollStage &&
        (metaData.pollStage === 'Vote' || metaData.pollStage === 'Final Vote')
    );

    // --- Mock Action Wrappers (pass current state and setters) ---
    const handleMockVote = useCallback(async (proposalId: number, lower: number, upper: number) => {
        // Guard against null state before calling action
         if (mockVotingPowerRaw === null || mockGovernanceStatus === null) {
             console.error("Cannot vote: Mock state not initialized.");
             return false;
         }
         return handleVoteWithRange(
             proposalId,
             lower,
             upper,
             mockVotingPowerRaw,
             mockGovernanceStatus,
             setMockVotingPowerRaw,
             setMockGovernanceStatus
         );
     }, [handleVoteWithRange, mockVotingPowerRaw, mockGovernanceStatus]); // Removed setters from deps, they are stable

     const handleMockDelegate = useCallback(async (targetAddress: string, amount: number) => {
         // Guard against null state before calling action
          if (mockVotingPowerRaw === null || mockDppBalanceRaw === null) {
               console.error("Cannot delegate: Mock state not initialized.");
               return false;
          }
          return handleDelegate(
              targetAddress,
              amount,
              mockVotingPowerRaw,
              mockDppBalanceRaw,
              setMockVotingPowerRaw,
              setMockDppBalanceRaw
          );
      }, [handleDelegate, mockVotingPowerRaw, mockDppBalanceRaw]); // Removed setters from deps

    // --- Render Logic ---
    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Initializing Governance Data...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', mb: 3 }}>
                Governance Center (Mock Actions)
            </Typography>

            {displayError && <Alert severity="error" sx={{ mb: 2 }}>Error loading data: {displayError}</Alert>}

            {/* Pass MOCKED balance and voting power to InfoBar */}
            <GovernanceInfoBar
                mockDppBalanceRaw={mockDppBalanceRaw ?? 0n} // Default 0n if somehow still null
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