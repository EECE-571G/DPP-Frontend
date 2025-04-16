// src/components/AnvilTimeControls.tsx
import React, { useState, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import AddAlarmIcon from '@mui/icons-material/AddAlarm';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuthContext } from '../contexts/AuthContext';
import { useTimeContext } from '../contexts/TimeContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { TARGET_NETWORK_CHAIN_ID } from '../constants';

const AnvilTimeControls: React.FC = () => {
    // Get provider/network for connection check, but time state comes from TimeContext
    const { provider, network } = useAuthContext();
    const {
        simulatedTimestamp,
        isSimulating,
        isLoadingTime, // Use loading state from TimeContext
        fetchRealTimestamp,
        advanceSimulatedTime
    } = useTimeContext();
    const { showSnackbar } = useSnackbarContext(); // Keep for direct feedback here
    const [isAdvancingLoading, setIsAdvancingLoading] = useState(false); // Local loading for button visual

    const isConnectedToTarget = network?.chainId === TARGET_NETWORK_CHAIN_ID;

    // --- Handle advancing time ---
    const handleAdvanceClick = useCallback(async () => {
        setIsAdvancingLoading(true);
        console.log("[AnvilTimeControls] Requesting simulated time advance (+1 day)...");

        // Simulate delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 300));

        advanceSimulatedTime(86400); // Call context function to advance by 1 day

        showSnackbar("Simulated display time advanced (+1 day).", "info");

        setIsAdvancingLoading(false);
    }, [advanceSimulatedTime, showSnackbar]);

     // --- Handle Refresh Click ---
     const handleRefreshClick = useCallback(async () => {
        // Call the context function to fetch real time
        await fetchRealTimestamp();
        showSnackbar("Synced display time to latest block.", "info")
    }, [fetchRealTimestamp, showSnackbar]);

    // Format the timestamp FROM CONTEXT
    const formattedTimestamp = simulatedTimestamp
        ? new Date(simulatedTimestamp * 1000).toLocaleString()
        : 'N/A';

    const tooltipTitleAdvance = isConnectedToTarget
        ? "Advancing display time by 1 Day"
        : `Connect to Anvil (Chain ID ${TARGET_NETWORK_CHAIN_ID}) to control actual time`;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
            <Tooltip title={`Displayed Timestamp ${isSimulating ? '(Simulated)' : '(Real)'}`}>
                 <Typography variant="caption" sx={{ display: { xs: 'none', md: 'inline' }, color: 'text.secondary' }}>
                     {isLoadingTime ? <CircularProgress size={12} color="inherit"/> : formattedTimestamp}
                     {!isConnectedToTarget && provider && <Typography variant="caption" color="warning.main" sx={{ml: 0.5}}>(Wrong Network)</Typography>}
                </Typography>
            </Tooltip>
            {/* Refresh button calls context function */}
            <Tooltip title="Refresh Timestamp (Sync to Real Time)">
                 <span>
                    <IconButton size="small" color="inherit" onClick={handleRefreshClick} disabled={isLoadingTime || isAdvancingLoading || !provider}>
                         <RefreshIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            {/* Advance button calls context function */}
            <Tooltip title={tooltipTitleAdvance}>
                 <span>
                    <IconButton size="small" color="inherit" onClick={handleAdvanceClick} disabled={isAdvancingLoading || !provider}>
                        {isAdvancingLoading ? <CircularProgress size={20} color="inherit" /> : <AddAlarmIcon fontSize="small" />}
                    </IconButton>
                 </span>
            </Tooltip>
        </Box>
    );
};

export default AnvilTimeControls;