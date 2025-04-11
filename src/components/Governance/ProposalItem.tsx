import React from 'react';
import { ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Tooltip, Collapse, Box } from '@mui/material';
import { Proposal } from '../../types';
import { getStatusIcon } from './governanceUtils';
import { formatBalance, shortenAddress } from '../../utils/formatters';
import VoteForm from './VoteForm';
import { useAuthContext } from '../../contexts/AuthContext';
interface ProposalItemProps {
    proposal: Proposal;
    isSelected: boolean;
    onSelect: (id: number | null) => void;
}

const ProposalItem: React.FC<ProposalItemProps> = ({
    proposal,
    isSelected,
    onSelect,
}) => {
    const { session } = useAuthContext(); // Get session info if needed for display logic
    const currentUserAddress = session?.user.address;
    const statusProps = getStatusIcon(proposal.status);

    return (
        <React.Fragment>
            <ListItem disablePadding sx={{ display: 'block', mb: 0.5 }}>
                <ListItemButton onClick={() => onSelect(isSelected ? null : proposal.id)} selected={isSelected} sx={{ borderRadius: 1, '&.Mui-selected': { bgcolor: 'action.hover' } }}>
                    <ListItemIcon sx={{ minWidth: 35 }}>
                        <Tooltip title={proposal.status.toUpperCase()}>{statusProps.icon}</Tooltip>
                    </ListItemIcon>
                    <ListItemText
                        primary={`#${proposal.id}: ${proposal.description.substring(0, 45)}${proposal.description.length > 45 ? '...' : ''}`}
                        secondary={`Proposed: ${formatBalance(proposal.proposedDesiredPrice, 4)} | By: ${shortenAddress(proposal.proposer)}`}
                    />
                    <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>{formatBalance(proposal.votingPowerCommitted ?? 0, 0)} vDPP</Typography>
                </ListItemButton>
            </ListItem>

            <Collapse in={isSelected} timeout="auto" unmountOnExit>
                <Box sx={{ pl: {xs: 2, sm: 5}, pr: 1, py: 2, borderLeft: {xs: 0, sm:`2px solid`}, borderColor: 'divider', ml: {xs: 0, sm: 2}, mb: 1 }}>
                    <Typography variant="body2" gutterBottom>{proposal.description}</Typography>
                    <Typography variant="body1" gutterBottom>Pool Target Price Proposal: <strong>{formatBalance(proposal.proposedDesiredPrice, 6)}</strong></Typography>

                    {proposal.status === 'active' && currentUserAddress && (
                       <VoteForm proposalId={proposal.id} /> // Pass only proposalId
                    )}
                    {proposal.status !== 'active' && (<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Voting has ended for this proposal.</Typography>)}
                    {!currentUserAddress && proposal.status === 'active' && (<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Connect wallet to vote.</Typography>)}
                </Box>
            </Collapse>
        </React.Fragment>
    );
};

export default ProposalItem;