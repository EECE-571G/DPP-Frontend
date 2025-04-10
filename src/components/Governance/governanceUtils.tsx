import React from 'react';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import GavelIcon from '@mui/icons-material/Gavel';
import { ProposalStatus } from '../../types';

export const getStatusIcon = (status: ProposalStatus): { icon: React.ReactElement } => {
    switch (status) {
        case 'active': return { icon: <HowToVoteIcon color='primary' /> };
        case 'pending': return { icon: <PendingIcon color='warning' /> };
        case 'succeeded': return { icon: <CheckCircleIcon color='success' /> };
        case 'defeated': return { icon: <CancelIcon color='error' /> };
        case 'executed': return { icon: <GavelIcon color='secondary' /> };
        default: return { icon: <PendingIcon color='disabled' /> };
    }
};