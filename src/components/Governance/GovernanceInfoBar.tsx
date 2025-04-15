// src/components/Governance/GovernanceInfoBar.tsx
import React, { useCallback } from 'react';
import {
    Grid, Paper, Box, ListItemIcon, Typography, Chip, Tooltip, IconButton
} from '@mui/material';
import TagIcon from '@mui/icons-material/Tag';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FlagIcon from '@mui/icons-material/Flag';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ethers, formatUnits } from 'ethers';

import { GovernanceMetaData, useGovernanceContext } from '../../contexts/GovernanceContext';
import { useTimeContext } from '../../contexts/TimeContext';
import InfoBox from './InfoBox';
import { formatBalance } from '../../utils/formatters';
import { TickMath } from '../../utils/tickMath';
import { useBalancesContext } from '../../contexts/BalancesContext';
import { usePoolsContext } from '../../contexts/PoolsContext';
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants';

interface GovernanceInfoBarProps {
    mockDppBalanceRaw: bigint; // <<< UPDATED PROP NAME
    mockVotingPowerRaw: bigint; // <<< UPDATED PROP NAME
    metaData: GovernanceMetaData | null; // Keep using real metadata
}

// MetaItem component (Keep as before)
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
                 value // Render ReactNode directly
             )}
        </Box>
    </Box>
);


// <<< UPDATED: Accept mock props >>>
const GovernanceInfoBar: React.FC<GovernanceInfoBarProps> = ({ mockDppBalanceRaw, mockVotingPowerRaw, metaData }) => {
    const { tokenDecimals } = useBalancesContext();
    const { selectedPool } = usePoolsContext();
    const { fetchGovernanceData } = useGovernanceContext();
    const { fetchRealTimestamp } = useTimeContext();

    // <<< Use mock values for calculations and display >>>
    const DPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;
    const DPPBalanceFormatted = formatUnits(mockDppBalanceRaw, DPPDecimals);
    const votingPowerFormatted = formatUnits(mockVotingPowerRaw, DPPDecimals); // Format mock power

     // --- Real Metadata Display (remains the same) ---
     const decimals0 = selectedPool?.tokenA_Address ? (tokenDecimals[selectedPool.tokenA_Address] ?? 18) : 18;
     const decimals1 = selectedPool?.tokenB_Address ? (tokenDecimals[selectedPool.tokenB_Address] ?? 18) : 18;
     const desiredPriceDisplay = metaData?.desiredPriceTick !== null && metaData?.desiredPriceTick !== undefined
        ? formatBalance(TickMath.getPriceAtTick(metaData.desiredPriceTick, decimals0, decimals1), 6)
        : 'N/A';
     const desiredTickDisplay = (metaData && metaData.desiredPriceTick !== null) ? `(Tick: ${metaData.desiredPriceTick})` : '';

     const pollIdDisplay = metaData?.pollId ?? 'N/A';
     const pollStageDisplay = metaData?.pollStage ?? 'N/A';
     const pollPausedDisplay = metaData?.pollIsPaused ?? true;
     const pollTimeLeftDisplay = metaData?.pollTimeLeft ?? 'N/A';

    const handleRefreshClick = useCallback(async () => {
        await fetchRealTimestamp();
        if (selectedPool) {
            await fetchGovernanceData(selectedPool);
            // NOTE: This refresh might reset the mocked balance/power state in Governance.tsx
            // if it refetches the initial balance. Consider if this reset is desired on refresh.
        }
    }, [fetchRealTimestamp, fetchGovernanceData, selectedPool]);

    return (
        <Grid container spacing={2} sx={{ mb: 3 }} alignItems="stretch">
            {/* Desired Price (Real) */}
            <Grid item xs={12} sm={6} md={3}>
                 <InfoBox title="Current Desired Price">
                    {desiredPriceDisplay} {desiredTickDisplay}
                </InfoBox>
             </Grid>
            {/* Poll Status (Real/Derived) */}
             <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                    {/* Refresh button and MetaItems */}
                     <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                         <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                            Poll Status
                        </Typography>
                        <Tooltip title="Refresh Poll Status & Sync Time">
                            <IconButton size="small" onClick={handleRefreshClick}>
                                <RefreshIcon fontSize="inherit" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <MetaItem icon={<TagIcon fontSize="small" />} label="Poll ID" value={pollIdDisplay} />
                     <MetaItem icon={<AccessTimeIcon fontSize="small" />} label="Time Left" value={pollTimeLeftDisplay} />
                    <MetaItem
                        icon={<FlagIcon fontSize="small" />}
                        label="Stage"
                        value={
                            <Chip
                                icon={pollPausedDisplay ? <PauseCircleOutlineIcon /> : <PlayCircleOutlineIcon />}
                                label={pollStageDisplay}
                                size="small"
                                color={pollPausedDisplay ? "warning" : pollStageDisplay.startsWith('Exec') ? 'info' : 'success'}
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                            />
                        }
                    />
                </Paper>
             </Grid>
            {/* Voting Power (Mock) */}
             <Grid item xs={6} sm={6} md={3}>
                 <InfoBox title="Your Voting Power">
                     {/* Format the MOCKED voting power */}
                     {formatBalance(votingPowerFormatted, 2)}
                 </InfoBox>
             </Grid>
             {/* DPP Balance (Mock) */}
             <Grid item xs={6} sm={6} md={3}>
                 <InfoBox title="DPP Balance">
                     {/* Format the MOCKED balance */}
                     {formatBalance(DPPBalanceFormatted, 2)}
                 </InfoBox>
             </Grid>
        </Grid>
    );
};

export default GovernanceInfoBar;