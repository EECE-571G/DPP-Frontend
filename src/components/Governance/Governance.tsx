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

const Governance: React.FC = () => {
    // --- Get state from Contexts ---
    const { proposals, governanceStatus, metaData, isLoadingProposals, isLoadingGovernanceData, errorProposals, errorGovernanceData } = useGovernanceContext();
    const { userBalances, isLoadingBalances, errorBalances } = useBalancesContext();

    // --- Derived State ---
    const vDPPBalance = typeof userBalances['vDPP'] === 'string' ? parseFloat(userBalances['vDPP']) : (userBalances['vDPP'] ?? 0);
    const isLoading = isLoadingProposals || isLoadingGovernanceData || isLoadingBalances;
    const displayError = errorProposals || errorGovernanceData || errorBalances;

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

            {displayError && <Alert severity="error" sx={{ mb: 2 }}>Error loading governance data: {displayError}</Alert>}

            {/* Top Row - Pass only needed data */}
            <GovernanceInfoBar
                vDPPBalance={vDPPBalance}
                metaData={metaData ?? { id: 'N/A', time: 'N/A', stage: 'Loading...' }}
            />

            {/* Status Chart */}
            <GovernanceStatusChart governanceStatus={governanceStatus} />

            {/* VoteForm & Delegation Area */}
            <Grid container spacing={3}>
                {/* VoteForm */}
                <Grid item xs={12} md={6}>
                    <VoteForm proposalId={proposals[0]?.id} />
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