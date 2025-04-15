// src/components/Governance/Governance.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Grid, CircularProgress, Alert } from '@mui/material';
import { formatUnits } from 'ethers'; // <<< Import formatUnits

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
        governanceStatus: initialGovernanceStatus, // Rename initial context state
        metaData, // Still get real metadata (desired price, poll state etc.)
        isLoadingGovernanceData,
        errorGovernanceData,
        fetchGovernanceData
    } = useGovernanceContext();
    const { userBalancesRaw, tokenDecimals, isLoadingBalances, errorBalances } = useBalancesContext();
    const { selectedPool } = usePoolsContext();
    const { handleVoteWithRange, handleDelegate } = useGovernanceActions(); // Get actions

    // --- Mock State Management ---
    const [mockDppBalanceRaw, setMockDppBalanceRaw] = useState<bigint | null>(null);
    const [mockVotingPowerRaw, setMockVotingPowerRaw] = useState<bigint | null>(null);
    // Initialize mock chart data from context or default
    const [mockGovernanceStatus, setMockGovernanceStatus] = useState<number[] | null>(initialGovernanceStatus || []);

    const DPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;

    // --- Initialize Mock State Effect ---
    useEffect(() => {
        const initialBalance = userBalancesRaw[GOVERNANCE_TOKEN_ADDRESS] ?? 0n;
        if (mockDppBalanceRaw === null) { // Initialize only once or if reset
            console.log("[Governance Mock] Initializing mock balance and power:", initialBalance.toString());
            setMockDppBalanceRaw(initialBalance);
            setMockVotingPowerRaw(initialBalance); // Initially, voting power equals balance
        }
        // Initialize or update chart data when context data changes
        setMockGovernanceStatus(initialGovernanceStatus || []);

    // Only re-run if the initial balance or status from context changes fundamentally
    // Avoid depending on the mock states themselves here to prevent loops
    }, [userBalancesRaw, initialGovernanceStatus]); // Removed mockDppBalanceRaw

    // --- Derived State ---
    const isLoading = isLoadingGovernanceData || isLoadingBalances || mockDppBalanceRaw === null; // Add null check for init
    const displayError = errorGovernanceData || errorBalances;

    // --- CORRECTED canVote derivation ---
    const canVote = !!( // Use double negation to ensure boolean result
        !isLoadingGovernanceData &&
        (mockVotingPowerRaw ?? 0n) > 0n &&
        metaData?.pollStage &&
        (metaData.pollStage === 'Vote' || metaData.pollStage === 'Final Vote')
    );
    // --- End correction ---

    // --- Mock Action Wrappers ---
    // These wrappers pass the current mock state and setters to the hook's functions
    const handleMockVote = useCallback(async (proposalId: number, lower: number, upper: number) => {
         if (mockVotingPowerRaw === null || mockGovernanceStatus === null) return false; // Guard against null state
         return handleVoteWithRange(
             proposalId,
             lower,
             upper,
             mockVotingPowerRaw, // Pass current power
             mockGovernanceStatus, // Pass current chart data
             setMockVotingPowerRaw, // Pass setter for power
             setMockGovernanceStatus // Pass setter for chart
         );
     }, [handleVoteWithRange, mockVotingPowerRaw, mockGovernanceStatus, setMockVotingPowerRaw, setMockGovernanceStatus]);

     const handleMockDelegate = useCallback(async (targetAddress: string, amount: number) => {
          if (mockVotingPowerRaw === null || mockDppBalanceRaw === null) return false; // Guard against null state
          return handleDelegate(
              targetAddress,
              amount,
              mockVotingPowerRaw, // Pass current power
              mockDppBalanceRaw, // Pass current balance
              setMockVotingPowerRaw, // Pass setter for power
              setMockDppBalanceRaw // Pass setter for balance
          );
      }, [handleDelegate, mockVotingPowerRaw, mockDppBalanceRaw, setMockVotingPowerRaw, setMockDppBalanceRaw]);

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
                Governance Center (Mock Actions)
            </Typography>

            {displayError && <Alert severity="error" sx={{ mb: 2 }}>Error loading data: {displayError}</Alert>}

            {/* Pass MOCKED balance and voting power to InfoBar */}
            <GovernanceInfoBar
                mockDppBalanceRaw={mockDppBalanceRaw ?? 0n} // Pass bigint, handle null default
                mockVotingPowerRaw={mockVotingPowerRaw ?? 0n} // Pass bigint, handle null default
                metaData={metaData} // Pass real metadata
            />

            {/* Pass MOCKED status to Chart */}
            <GovernanceStatusChart mockGovernanceStatus={mockGovernanceStatus || []} />

            <Grid container spacing={3} alignItems="stretch">
                <Grid item xs={12} md={6}>
                    {/* Pass MOCKED voting power and wrapped action handler */}
                    <VoteForm
                        proposalId={metaData ? parseInt(metaData.pollId, 10) || 0 : 0}
                        mockVotingPowerRaw={mockVotingPowerRaw ?? 0n} // Pass bigint
                        onVoteSubmit={handleMockVote} // Pass wrapped handler
                        canVote={canVote} // <<< Pass the corrected boolean value
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    {/* Pass MOCKED balance and wrapped action handler */}
                    <DelegationForm
                        mockDppBalanceRaw={mockDppBalanceRaw ?? 0n} // Pass bigint
                        onDelegateSubmit={handleMockDelegate} // Pass wrapped handler
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default Governance;