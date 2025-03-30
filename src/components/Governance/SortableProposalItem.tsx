import React from 'react';
import {
  ListItem, ListItemText, Box, Typography, Grid, Chip, Button, CircularProgress,
  ListItemIcon, Tooltip
} from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Proposal } from '../../types'; 
import { ProposalGauge } from './ProposalGauge';
import { formatBalance } from '../../utils/formatters';

interface SortableProposalItemProps {
  proposal: Proposal;
  isVoting: (id: number) => boolean;
  voteOnProposal: (id: number, vote: "yes" | "no") => void;
  getPoolName: (id: number) => string;
}

export function SortableProposalItem({
  proposal,
  isVoting,
  voteOnProposal,
  getPoolName
}: SortableProposalItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: proposal.id.toString() });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'none',
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : 1,
    cursor: 'default',
  };

  const isLoading = isVoting(proposal.id);

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      {...attributes}
      disablePadding
      alignItems="flex-start"
      sx={{
        // Styling for the list item itself
        py: 1.5,
        pr: 2,
        pl: 0,
        bgcolor: isDragging ? 'action.focus' : 'inherit',
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-child': {
            borderBottom: 0
        },
        listStyle: 'none',
        display: 'flex',
        gap: 1,
      }}
    >
      {/* Drag Handle */}
      <Tooltip title="Drag to reorder" placement="left">
        <ListItemIcon
            {...listeners}
            sx={{
            minWidth: 'auto',
            p: 1.5,
            cursor: 'grab',
            borderRadius: 1,
            alignSelf: 'center',
            '&:hover': { backgroundColor: 'action.hover' },
            '&:active': { cursor: 'grabbing' },
            }}
        >
            <DragHandleIcon sx={{ color: 'text.disabled' }} fontSize="small" />
        </ListItemIcon>
      </Tooltip>

      {/* Gauge */}
      <Box sx={{ alignSelf: 'center', mr: 1 }}> 
        <ProposalGauge votes={proposal.votes} size={80}/> 
      </Box>

      {/* Main Content */}
      <ListItemText
        sx={{ my: 0 }}
        primary={
          <Typography variant="body1" fontWeight="medium" gutterBottom>
            {/* More descriptive title */}
            Proposal #{proposal.id}: Set {getPoolName(proposal.poolId)} Desired Price to {proposal.proposedDesiredPrice}
          </Typography>
        }
        secondary={
          <Box component="div" sx={{ width: '100%' }}>
            {/* Description */}
            <Typography
              component="div"
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1.5 }}
            >
              {proposal.description || <i>No description provided.</i>}
            </Typography>

            {/* Vote Counts & Buttons */}
            <Grid container spacing={1} alignItems="center" justifyContent="space-between">
              {/* Vote Counts */}
              <Grid item display="flex" gap={1}>
                 <Tooltip title={`Yes Votes: ${formatBalance(proposal.votes.yes, 0)} vDPP`}>
                    <Chip label={`Yes: ${formatBalance(proposal.votes.yes, 0)}`} color="success" size="small" variant="outlined" />
                 </Tooltip>
                 <Tooltip title={`No Votes: ${formatBalance(proposal.votes.no, 0)} vDPP`}>
                    <Chip label={`No: ${formatBalance(proposal.votes.no, 0)}`} color="error" size="small" variant="outlined" />
                 </Tooltip>
                 <Chip label={proposal.status} size="small" color={ proposal.status === 'active' ? 'info' : 'default'}/>
              </Grid>

              {/* Voting Buttons (only show for active proposals) */}
              {proposal.status === 'active' && (
                  <Grid item>
                    <Button
                      variant="outlined"
                      color="success"
                      size="small"
                      onClick={() => voteOnProposal(proposal.id, "yes")}
                      disabled={isLoading}
                      sx={{ mr: 0.5, minWidth: 90 }}
                      startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : null}
                    >
                      {isLoading ? 'Voting...' : 'Vote Yes'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => voteOnProposal(proposal.id, "no")}
                      disabled={isLoading}
                      sx={{ minWidth: 90 }}
                      startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : null}
                    >
                      {isLoading ? 'Voting...' : 'Vote No'}
                    </Button>
                  </Grid>
              )}
            </Grid>
          </Box>
        }
        // Ensure secondary content is treated as a block element
        secondaryTypographyProps={{ component: 'div' }}
      />
    </ListItem>
  );
}