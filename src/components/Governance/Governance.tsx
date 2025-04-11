import React, { useState } from 'react';
import { Box, Typography, Grid, CircularProgress, Alert } from '@mui/material';

// Context Imports
import { useGovernanceContext } from '../../contexts/GovernanceContext';
import { useBalancesContext } from '../../contexts/BalancesContext';
// import { useAuthContext } from '../../contexts/AuthContext';

// Child Component Imports
import GovernanceInfoBar from './GovernanceInfoBar';
import GovernanceStatusChart from './GovernanceStatusChart';
import ProposalList from './ProposalList';
import DelegationForm from './DelegationForm';

const Governance: React.FC = () => {
    // --- Get state from Contexts ---
    const { proposals, governanceStatus, metaData, isLoadingProposals, isLoadingGovernanceData, errorProposals, errorGovernanceData } = useGovernanceContext();
    const { userBalances, isLoadingBalances, errorBalances } = useBalancesContext();
    // const { session } = useAuthContext();

    // --- Local State ---
    const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);

    // --- Derived State ---
    const vDPPBalance = userBalances['vDPP'] ?? 0;
    // const currentUserAddress = session?.user.address;
    const isLoading = isLoadingProposals || isLoadingGovernanceData || isLoadingBalances;
    const displayError = errorProposals || errorGovernanceData || errorBalances;

    const handleSelectProposal = (id: number | null) => {
        setSelectedProposalId(id);
    };

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

            {/* Proposals List & Delegation Area */}
            <Grid container spacing={3}>
                {/* Proposals List */}
                <Grid item xs={12} md={6}>
                    <ProposalList
                        proposals={proposals}
                        selectedProposalId={selectedProposalId}
                        onSelectProposal={handleSelectProposal}
                        // Pass necessary props down to ProposalItem/VoteForm if they don't use context directly
                        // currentUserAddress={currentUserAddress} // Pass if ProposalItem needs it directly
                        // vDPPBalance={vDPPBalance} // Pass if needed by children that don't use context
                    />
                </Grid>

                {/* Delegation */}
                <Grid item xs={12} md={6}>
                    {/* DelegationForm now uses context directly */}
                    <DelegationForm />
                </Grid>
            </Grid>
        </Box>
    );
};

export default Governance;