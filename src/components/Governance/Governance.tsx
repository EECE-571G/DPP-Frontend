import React, { useState } from 'react';
import { Box, Typography, Grid } from '@mui/material';

import { Proposal } from '../../types';
import GovernanceInfoBar from './GovernanceInfoBar';
import GovernanceStatusChart from './GovernanceStatusChart';
import ProposalList from './ProposalList';
import DelegationForm from './DelegationForm';

interface GovernanceProps {
  proposals: Proposal[];
  governanceStatus: number[];
  userBalances: Record<string, number>;
  currentUserAddress?: string;
  voteWithRange: (proposalId: number, lower: number, upper: number, power: number) => Promise<void> | void;
  delegateVotes: (targetAddress: string, amount: number) => Promise<void> | void;
  loadingStates: Record<string, boolean>;
}

// Main Governance Component
const Governance: React.FC<GovernanceProps> = ({
    proposals,
    governanceStatus,
    userBalances,
    currentUserAddress,
    voteWithRange,
    delegateVotes,
    loadingStates,
}) => {
    // State only needed across components: selected proposal ID
    const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);

    const vDPPBalance = userBalances['vDPP'] ?? 0;

    // Mock Meta Data (Keep here or lift to App.tsx if needed globally)
    const mockMeta = {
        id: 'Epoch 15',
        time: '2d 5h left',
        stage: 'Voting Phase'
    };

    const handleSelectProposal = (id: number | null) => {
        setSelectedProposalId(id);
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', mb: 3 }}>
                Governance Center
            </Typography>

            {/* Top Row */}
            <GovernanceInfoBar vDPPBalance={vDPPBalance} mockMeta={mockMeta} />

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
                        currentUserAddress={currentUserAddress}
                        vDPPBalance={vDPPBalance}
                        voteWithRange={voteWithRange}
                        loadingStates={loadingStates}
                    />
                </Grid>

                {/* Delegation */}
                <Grid item xs={12} md={6}>
                    <DelegationForm
                        vDPPBalance={vDPPBalance}
                        delegateVotes={delegateVotes}
                        loadingStates={loadingStates}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default Governance;