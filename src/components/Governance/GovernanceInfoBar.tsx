// src/components/Governance/GovernanceInfoBar.tsx
import React, { useCallback } from 'react';
import {
    Grid, Paper, Box, ListItemIcon, Typography, Chip, Tooltip, IconButton, Button, CircularProgress
} from '@mui/material';
import TagIcon from '@mui/icons-material/Tag';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FlagIcon from '@mui/icons-material/Flag';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { formatUnits } from 'ethers';

import { GovernanceMetaData, useGovernanceContext } from '../../contexts/GovernanceContext';
import { useTimeContext } from '../../contexts/TimeContext';
import InfoBox from './InfoBox';
import { formatBalance } from '../../utils/formatters';
import { TickMath } from '../../utils/tickMath';
import { useBalancesContext } from '../../contexts/BalancesContext';
import { usePoolsContext } from '../../contexts/PoolsContext';
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants';

interface GovernanceInfoBarProps {
    mockDppBalanceRaw: bigint;
    mockVotingPowerRaw: bigint;
    metaData: GovernanceMetaData | null;
    onExecute: () => Promise<void>;
    isLoadingExecute: boolean;
}

// MetaItem component
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


const GovernanceInfoBar: React.FC<GovernanceInfoBarProps> = ({
    mockDppBalanceRaw,
    mockVotingPowerRaw,
    metaData,
    onExecute,
    isLoadingExecute
 }) => {
    // Still need tokenDecimals for formatting, but use default if not found
    const { tokenDecimals } = useBalancesContext();
    const { selectedPool } = usePoolsContext();
    const { fetchGovernanceData } = useGovernanceContext(); // Keep for refresh context
    const { fetchRealTimestamp } = useTimeContext();

    // Use default if token decimals context isn't ready or token isn't listed
    const DPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS];
    const DPPBalanceFormatted = formatUnits(mockDppBalanceRaw, DPPDecimals);
    const votingPowerFormatted = formatUnits(mockVotingPowerRaw, DPPDecimals);

    // --- Metadata Display ---
    const decimals0 = selectedPool?.tokenA_Address ? (tokenDecimals[selectedPool.tokenA_Address] ?? 18) : 18;
    const decimals1 = selectedPool?.tokenB_Address ? (tokenDecimals[selectedPool.tokenB_Address] ?? 18) : 18;
    const desiredPriceDisplay = metaData?.desiredPriceTick !== null && metaData?.desiredPriceTick !== undefined
        ? formatBalance(TickMath.getPriceAtTick(metaData.desiredPriceTick, decimals0, decimals1), 6)
        : 'N/A';
    const desiredTickDisplay = (metaData && metaData.desiredPriceTick !== null) ? `(Tick: ${metaData.desiredPriceTick})` : '';

    // --- Poll Data Display ---
    const pollIdDisplay = metaData?.pollId ?? 'N/A';
    const pollStageDisplay = metaData?.pollStage ?? 'N/A';
    const pollPausedDisplay = metaData?.pollIsPaused ?? true;
    const pollTimeLeftDisplay = metaData?.pollTimeLeft ?? 'N/A';

    const handleRefreshClick = useCallback(async () => {
        await fetchRealTimestamp();
        if (selectedPool) {
            // await fetchGovernanceData(selectedPool);
        }
         // Trigger a reload of state from LS if needed, though setters should handle it
         console.log("Refreshed time, state persists via localStorage.");
    }, [fetchRealTimestamp, selectedPool]);

    // --- Determine if Execute button should be shown/enabled ---
    const canExecute = metaData?.pollStage === 'Exec. Ready';

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
                <Paper elevation={1} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                         <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                            Poll Status
                        </Typography>
                        <Tooltip title="Refresh Poll Status & Sync Time">
                            <IconButton size="small" onClick={handleRefreshClick} disabled={isLoadingExecute}>
                                <RefreshIcon fontSize="inherit" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    {/* MetaItems */}
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
                                color={pollPausedDisplay ? "warning" : pollStageDisplay === 'Exec. Ready' ? 'info' : (pollStageDisplay === 'Vote' || pollStageDisplay === 'Final Vote' ? 'success' : 'default')}
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                            />
                        }
                    />
                    {/* Execute Button */}
                    <Button
                        variant="contained"
                        size="small"
                        onClick={onExecute}
                        disabled={!canExecute || isLoadingExecute}
                        startIcon={isLoadingExecute ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                        sx={{ mt: 'auto', alignSelf: 'flex-end' }}
                    >
                        {isLoadingExecute ? "Executing..." : "Execute Poll"}
                    </Button>
                </Paper>
             </Grid>

            {/* Voting Power and Balance InfoBoxes */}
             <Grid item xs={6} sm={6} md={3}>
                 <InfoBox title="Your Voting Power">
                     {formatBalance(votingPowerFormatted, 2)}
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