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
// Import action hook to pass setters
import { useGovernanceActions } from '../../hooks/useGovernanceActions';

const Governance: React.FC = () => {
    // --- Get state from Contexts ---
    const {
        governanceStatus: initialGovernanceStatus,
        metaData,
        isLoadingGovernanceData,
        errorGovernanceData,
        fetchGovernanceData
    } = useGovernanceContext();
    // <<< Destructure isLoadingBalances directly >>>
    const { userBalancesRaw, tokenDecimals, isLoadingBalances, errorBalances } = useBalancesContext();
    const { selectedPool } = usePoolsContext();
    const { handleVoteWithRange, handleDelegate } = useGovernanceActions();

    // --- Mock State Management ---
    const [mockDppBalanceRaw, setMockDppBalanceRaw] = useState<bigint | null>(null);
    const [mockVotingPowerRaw, setMockVotingPowerRaw] = useState<bigint | null>(null);
    const [mockGovernanceStatus, setMockGovernanceStatus] = useState<number[] | null>(null); // Initialize as null

    const DPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;

    // --- Initialize Mock State Effect ---
    useEffect(() => {
        // <<< CONDITION 1: Only proceed if balances are NOT loading >>>
        if (!isLoadingBalances) {
            const initialBalance = userBalancesRaw[GOVERNANCE_TOKEN_ADDRESS]; // Get potential balance

            // <<< CONDITION 2: Only initialize if the specific balance exists and mock state is still null >>>
            if (initialBalance !== undefined && mockDppBalanceRaw === null) {
                console.log("[Governance Mock] Initializing mock balance:", initialBalance.toString());
                setMockDppBalanceRaw(initialBalance);
            } else if (mockDppBalanceRaw === null) {
                 // If balance isn't found after loading, default to 0
                 console.log("[Governance Mock] Balance not found after load, initializing mock balance to 0");
                 setMockDppBalanceRaw(0n);
            }

            // Initialize voting power similarly (should happen only once)
            if (mockVotingPowerRaw === null) {
                console.log("[Governance Mock] Initializing mock voting power to: 0");
                setMockVotingPowerRaw(0n);
            }
        }

        // Always try to initialize chart data from context when it changes
        if (mockGovernanceStatus === null && initialGovernanceStatus) {
             setMockGovernanceStatus(initialGovernanceStatus || []);
        }


    }, [
        userBalancesRaw, // Re-run if balances change
        initialGovernanceStatus,
        isLoadingBalances, // Re-run when loading state changes
        mockDppBalanceRaw, // Prevent re-init balance once set
        mockVotingPowerRaw, // Prevent re-init power once set
        mockGovernanceStatus // Prevent re-init chart once set
    ]);

    // --- Derived State ---
    // <<< Adjust isLoading check to handle null state during init >>>
    const isLoading = isLoadingGovernanceData || isLoadingBalances || mockDppBalanceRaw === null || mockVotingPowerRaw === null;
    const displayError = errorGovernanceData || errorBalances;

    const canVote = !!(
        !isLoadingGovernanceData && // Keep check on real gov data loading
        (mockVotingPowerRaw ?? 0n) > 0n &&
        metaData?.pollStage &&
        (metaData.pollStage === 'Vote' || metaData.pollStage === 'Final Vote')
    );

    // --- Mock Action Wrappers (remain the same) ---
     const handleMockVote = useCallback(async (proposalId: number, lower: number, upper: number) => {
          if (mockVotingPowerRaw === null || mockGovernanceStatus === null) return false;
          return handleVoteWithRange(
              proposalId, lower, upper,
              mockVotingPowerRaw, mockGovernanceStatus,
              setMockVotingPowerRaw, setMockGovernanceStatus
          );
      }, [handleVoteWithRange, mockVotingPowerRaw, mockGovernanceStatus]);

      const handleMockDelegate = useCallback(async (targetAddress: string, amount: number) => {
           if (mockVotingPowerRaw === null || mockDppBalanceRaw === null) return false;
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
                <Typography sx={{ ml: 2 }}>Loading Governance Data...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', mb: 3 }}>
                Governance Center
            </Typography>

            {displayError && <Alert severity="error" sx={{ mb: 2 }}>Error loading data: {displayError}</Alert>}

            {/* Pass MOCKED balance and voting power to InfoBar */}
            <GovernanceInfoBar
                mockDppBalanceRaw={mockDppBalanceRaw ?? 0n} // Default to 0n if still null (shouldn't happen after loading)
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