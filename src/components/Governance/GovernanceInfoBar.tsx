// src/components/Governance/GovernanceInfoBar.tsx
import React from 'react';
import {
    Grid, Paper, Box, ListItemIcon, Typography, Chip
} from '@mui/material';
import TagIcon from '@mui/icons-material/Tag';
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // <-- Add back AccessTimeIcon
import FlagIcon from '@mui/icons-material/Flag';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

import { GovernanceMetaData } from '../../contexts/GovernanceContext';
import InfoBox from './InfoBox';
import { formatBalance } from '../../utils/formatters';
import { TickMath } from '../../utils/tickMath';
import { useBalancesContext } from '../../contexts/BalancesContext';
import { usePoolsContext } from '../../contexts/PoolsContext';

interface GovernanceInfoBarProps {
    vDPPBalance: number;
    metaData: GovernanceMetaData | null;
}

// MetaItem component (Keep as before, it handles ReactNode)
const MetaItem: React.FC<{ icon: React.ReactNode; label: string; value: string | React.ReactNode;}> =
    ({ icon, label, value }) => (
     <Box display="flex" alignItems="center" sx={{ width: '100%', py: 0.5 }}>
        <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: 'action.active', display: 'flex', alignItems: 'center' }}>
            {icon}
        </ListItemIcon>
        <Box>
            <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.1}>
                {label}
            </Typography>
             {typeof value === 'string' ? (
                <Typography variant="body2" fontWeight={500} lineHeight={1.2}>
                    {value}
                </Typography>
             ) : (
                 value
             )}
        </Box>
    </Box>
);

const GovernanceInfoBar: React.FC<GovernanceInfoBarProps> = ({ vDPPBalance, metaData }) => {
     const { tokenDecimals } = useBalancesContext();
     const { selectedPool } = usePoolsContext();

     const decimals0 = selectedPool?.tokenA_Address ? (tokenDecimals[selectedPool.tokenA_Address] ?? 18) : 18;
     const decimals1 = selectedPool?.tokenB_Address ? (tokenDecimals[selectedPool.tokenB_Address] ?? 18) : 18;
     const desiredPriceDisplay = metaData?.desiredPriceTick !== null && metaData?.desiredPriceTick !== undefined
        ? formatBalance(TickMath.getPriceAtTick(metaData.desiredPriceTick, decimals0, decimals1), 6)
        : 'N/A';
     const desiredTickDisplay = (metaData && metaData.desiredPriceTick !== null) ? `(Tick: ${metaData.desiredPriceTick})` : '';

     const pollIdDisplay = metaData?.pollId ?? 'N/A';
     const pollStageDisplay = metaData?.pollStage ?? 'N/A';
     const pollPausedDisplay = metaData?.pollIsPaused ?? true;
     const pollTimeLeftDisplay = metaData?.pollTimeLeft ?? 'N/A'; // Get time left

    return (
        <Grid container spacing={2} sx={{ mb: 3 }} alignItems="stretch">

            {/* Desired Price InfoBox */}
            <Grid item xs={12} sm={6} md={3}>
                 <InfoBox title="Current Desired Price">
                    {desiredPriceDisplay} {desiredTickDisplay}
                </InfoBox>
             </Grid>

            {/* Poll Status InfoBox */}
             <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                    <Typography variant="overline" color="text.secondary" display="block" align="center" gutterBottom sx={{ lineHeight: 1.2, mb: 1 }}>
                        Poll Status
                    </Typography>
                    <MetaItem icon={<TagIcon fontSize="small" />} label="Poll ID" value={pollIdDisplay} />
                     {/* --- ADD TIME LEFT --- */}
                     <MetaItem icon={<AccessTimeIcon fontSize="small" />} label="Time Left" value={pollTimeLeftDisplay} />
                     {/* --- END ADD TIME LEFT --- */}
                    <MetaItem
                        icon={<FlagIcon fontSize="small" />}
                        label="Stage"
                        value={
                            <Chip
                                icon={pollPausedDisplay ? <PauseCircleOutlineIcon /> : <PlayCircleOutlineIcon />}
                                label={pollStageDisplay}
                                size="small"
                                color={pollPausedDisplay ? "warning" : "success"}
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                            />
                        }
                    />
                </Paper>
             </Grid>

            {/* Voting Power and Balance */}
             <Grid item xs={6} sm={6} md={3}>
                 <InfoBox title="Your Voting Power">
                     {formatBalance(vDPPBalance, 2)} vDPP
                 </InfoBox>
             </Grid>
             <Grid item xs={6} sm={6} md={3}>
                 <InfoBox title="vDPP Balance">
                     {formatBalance(vDPPBalance, 2)}
                 </InfoBox>
             </Grid>
        </Grid>
    );
};

export default GovernanceInfoBar;