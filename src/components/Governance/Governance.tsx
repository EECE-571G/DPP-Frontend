// src/components/Governance/Governance.tsx
import React from 'react';
import { Box, Typography, Grid, CircularProgress, Alert } from '@mui/material';

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

const Governance: React.FC = () => {
    // --- Get state from Contexts ---
    const { governanceStatus, metaData, isLoadingGovernanceData, errorGovernanceData, fetchGovernanceData } = useGovernanceContext();
    const { userBalancesRaw, isLoadingBalances, errorBalances } = useBalancesContext(); // Use raw for bigint
    const { selectedPool } = usePoolsContext(); // Get selected pool for context

    // --- Derived State ---
    // Use raw bigint balance, default to 0n if not found
    const DPPBalanceRaw = userBalancesRaw[GOVERNANCE_TOKEN_ADDRESS] ?? 0n;
    const isLoading = isLoadingGovernanceData || isLoadingBalances; // Simplified loading check
    const displayError = errorGovernanceData || errorBalances; // Simplified error check

    // --- Render Logic ---
    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', mb: 3 }}>
                Governance Center
            </Typography>

            {displayError && <Alert severity="error" sx={{ mb: 2 }}>Error loading data: {displayError}</Alert>}

            {/* Pass potentially null metaData and the raw balance */}
            <GovernanceInfoBar
                DPPBalanceRaw={DPPBalanceRaw} // Pass raw bigint balance
                metaData={metaData}
            />

             {/* Status Chart - Pass empty array if governanceStatus is null/undefined */}
             <GovernanceStatusChart governanceStatus={governanceStatus || []} />

            {/* VoteForm & Delegation Area */}
            <Grid container spacing={3} alignItems="stretch"> {/* Added alignItems */}
                {/* VoteForm - Needs robust proposal ID handling if proposals were fetched */}
                {/* For now, disable if metadata (implying pool context) is missing */}
                <Grid item xs={12} md={6}>
                     <VoteForm proposalId={metaData ? parseInt(metaData.pollId, 10) || 0 : 0} /> {/* Pass current Poll ID */}
                 </Grid>

                {/* Delegation */}
                <Grid item xs={12} md={6}>
                    <DelegationForm />
                </Grid>
            </Grid>
        </Box>
    );
};

export default Governance;