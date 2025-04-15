// src/components/Governance/GovernanceInfoBar.tsx
import React, { useCallback } from 'react'; // Import useCallback
import {
    Grid, Paper, Box, ListItemIcon, Typography, Chip, Tooltip, IconButton
} from '@mui/material';
import TagIcon from '@mui/icons-material/Tag';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FlagIcon from '@mui/icons-material/Flag';
import PriceCheckIcon from '@mui/icons-material/PriceCheck'; // Keep just in case
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ethers, formatUnits } from 'ethers';

import { GovernanceMetaData, useGovernanceContext } from '../../contexts/GovernanceContext';
import { useTimeContext } from '../../contexts/TimeContext'; // <<< Import TimeContext hook
import InfoBox from './InfoBox';
import { formatBalance } from '../../utils/formatters';
import { TickMath } from '../../utils/tickMath';
import { useBalancesContext } from '../../contexts/BalancesContext';
import { usePoolsContext } from '../../contexts/PoolsContext';
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants';

interface GovernanceInfoBarProps {
    DPPBalanceRaw: bigint;
    metaData: GovernanceMetaData | null;
    votingPower?: number;
}

// MetaItem component (Keep as before)
const MetaItem: React.FC<{ icon: React.ReactNode; label: string; value: string | React.ReactNode;}> =
    ({ icon, label, value }) => ( /* ... implementation ... */
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


const GovernanceInfoBar: React.FC<GovernanceInfoBarProps> = ({ DPPBalanceRaw: DPPBalanceRaw, metaData, votingPower }) => {
    const { tokenDecimals } = useBalancesContext();
    const { selectedPool } = usePoolsContext();
    const { fetchGovernanceData } = useGovernanceContext();
    const { fetchRealTimestamp } = useTimeContext(); // <<< Get function to sync time

    const DPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;

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
    const DPPBalanceFormatted = formatUnits(DPPBalanceRaw, DPPDecimals);

    // Refresh handler syncs time AND governance data
    const handleRefreshClick = useCallback(async () => {
        // First, sync the time context back to the actual block time
        await fetchRealTimestamp();
        // Then, refetch governance data which will now use the real time for calcs
        if (selectedPool) {
            await fetchGovernanceData(selectedPool);
        }
    }, [fetchRealTimestamp, fetchGovernanceData, selectedPool]);

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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                         <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                            Poll Status
                        </Typography>
                        {/* Refresh button now calls combined handler */}
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
                                color={pollPausedDisplay ? "warning" : pollStageDisplay.startsWith('Exec') ? 'info' : 'success'} // Color logic
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
                     {formatBalance(votingPower, 2)}
                 </InfoBox>
             </Grid>
             <Grid item xs={6} sm={6} md={3}>
                 <InfoBox title="DPP Balance">
                     {formatBalance(DPPBalanceFormatted, 2)}
                 </InfoBox>
             </Grid>
        </Grid>
    );
};

export default GovernanceInfoBar;