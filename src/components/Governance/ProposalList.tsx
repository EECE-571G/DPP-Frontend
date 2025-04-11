import React from 'react';
import { Paper, Typography, List, ListItem, ListItemText } from '@mui/material';
import { Proposal } from '../../types';
import ProposalItem from './ProposalItem';

interface ProposalListProps {
    proposals: Proposal[];
    selectedProposalId: number | null;
    onSelectProposal: (id: number | null) => void;
}

const ProposalList: React.FC<ProposalListProps> = ({
    proposals,
    selectedProposalId,
    onSelectProposal,
}) => {
    return (
        <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
                Proposals
            </Typography>
            <List dense sx={{ maxHeight: 'calc(100% - 40px)', overflow: 'auto' }}>
                {proposals.length === 0 && <ListItem><ListItemText primary="No proposals found." /></ListItem>}
                {proposals.map(proposal => (
                    <ProposalItem
                        key={proposal.id}
                        proposal={proposal}
                        isSelected={selectedProposalId === proposal.id}
                        onSelect={onSelectProposal}
                    />
                ))}
            </List>
        </Paper>
    );
};

export default ProposalList;