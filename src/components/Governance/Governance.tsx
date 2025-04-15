import React from 'react';
import { Box, Typography, Grid, CircularProgress, Alert } from '@mui/material';

// Context Imports
import { useGovernanceContext } from '../../contexts/GovernanceContext';
import { useBalancesContext } from '../../contexts/BalancesContext';

// Child Component Imports
import GovernanceInfoBar from './GovernanceInfoBar';
import GovernanceStatusChart from './GovernanceStatusChart';
import DelegationForm from './DelegationForm';
import VoteForm from './VoteForm';
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants';

const Governance: React.FC = () => {
    // --- Get state from Contexts ---
    const { governanceStatus, metaData, isLoadingGovernanceData, errorGovernanceData } = useGovernanceContext();
    const { userBalances, isLoadingBalances, errorBalances } = useBalancesContext();

    // --- Derived State ---
    const vDPPBalance = parseFloat(userBalances[GOVERNANCE_TOKEN_ADDRESS] ?? '0'); // Use constant
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

            {/* Pass potentially null metaData */}
            <GovernanceInfoBar
                vDPPBalance={vDPPBalance}
                metaData={metaData}
            />

             {/* Status Chart - Pass empty array if governanceStatus is null/undefined */}
             <GovernanceStatusChart governanceStatus={governanceStatus || []} />

            {/* VoteForm & Delegation Area */}
            <Grid container spacing={3}>
                {/* VoteForm - Needs robust proposal ID handling if proposals were fetched */}
                {/* For now, disable if metadata (implying pool context) is missing */}
                <Grid item xs={12} md={6}>
                     <VoteForm proposalId={metaData ? 1 : 0} /> {/* Placeholder ID, disabled logic inside VoteForm should handle no pool */}
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