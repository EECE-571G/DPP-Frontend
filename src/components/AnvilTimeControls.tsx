// src/components/AnvilTimeControls.tsx
// FAKE Time Advancement Implementation - UPDATED TO CHANGE DISPLAYED TIME
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import AddAlarmIcon from '@mui/icons-material/AddAlarm';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuthContext } from '../contexts/AuthContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { TARGET_NETWORK_CHAIN_ID } from '../constants';

const AnvilTimeControls: React.FC = () => {
    const { provider, network } = useAuthContext();
    const { showSnackbar } = useSnackbarContext();
    // Store the timestamp (could be real or simulated)
    const [displayTimestamp, setDisplayTimestamp] = useState<number | null>(null);
    const [isLoadingTime, setIsLoadingTime] = useState(false);
    const [isAdvancingTime, setIsAdvancingTime] = useState(false);

    const isConnectedToTarget = network?.chainId === TARGET_NETWORK_CHAIN_ID;

    // Fetches the REAL timestamp from the connected node
    const fetchRealTimestamp = useCallback(async () => {
        if (!provider) {
             setDisplayTimestamp(null);
             return;
        }
        setIsLoadingTime(true);
        try {
            console.log("[AnvilTimeControls] Fetching REAL latest block timestamp...");
            const block = await provider.getBlock('latest');
            if (block) {
                // Set the display timestamp to the fetched REAL time
                setDisplayTimestamp(block.timestamp);
                 console.log("[AnvilTimeControls] Fetched REAL timestamp:", block.timestamp);
            } else {
                 setDisplayTimestamp(null);
                 console.log("[AnvilTimeControls] Failed to get latest block.");
            }
        } catch (error) {
            console.error("Failed to fetch block timestamp:", error);
            setDisplayTimestamp(null);
        } finally {
            setIsLoadingTime(false);
        }
    }, [provider]);

    // --- FAKE Time Advancement Function ---
    const advanceDisplayTime = useCallback(async () => {
        setIsAdvancingTime(true);
        console.log("[AnvilTimeControls] Simulating time advance...");

        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // --- Update Display Timestamp State ---
        setDisplayTimestamp(prevTimestamp => {
            if (prevTimestamp === null) {
                // If we don't have a current time, maybe fetch the real one first?
                // Or just add 1 day to 'now' as a rough estimate.
                // Let's fetch real time first if null.
                fetchRealTimestamp(); // Trigger fetch, display will update when it finishes
                return null; // Keep it null until fetch completes
            }
            const newTimestamp = prevTimestamp + 86400; // Add 1 day in seconds
            console.log(`[AnvilTimeControls] Simulated timestamp updated from ${prevTimestamp} to ${newTimestamp}`);
            return newTimestamp;
        });
        // ------------------------------------

        showSnackbar("Simulated display time advance (+1 day).", "info"); // Clarify it's display time

        setIsAdvancingTime(false);

    }, [showSnackbar, fetchRealTimestamp]); // Added fetchRealTimestamp dependency

    // Effect to fetch the initial REAL timestamp when provider/network changes
    useEffect(() => {
        if (provider && isConnectedToTarget) {
             fetchRealTimestamp();
        } else {
             setDisplayTimestamp(null); // Clear if disconnected or wrong network
        }
    }, [provider, isConnectedToTarget, fetchRealTimestamp]); // fetchRealTimestamp dependency

    // Format the timestamp stored in state
    const formattedTimestamp = displayTimestamp
        ? new Date(displayTimestamp * 1000).toLocaleString()
        : 'N/A';

    const tooltipTitleAdvance = isConnectedToTarget
        ? "Simulate advancing display time by 1 Day"
        : `Connect to Anvil (Chain ID ${TARGET_NETWORK_CHAIN_ID}) to control actual time`;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
            <Tooltip title="Current Displayed Timestamp (Real/Simulated)">
                 <Typography variant="caption" sx={{ display: { xs: 'none', md: 'inline' }, color: 'text.secondary' }}>
                     {isLoadingTime ? <CircularProgress size={12} color="inherit"/> : formattedTimestamp}
                     {!isConnectedToTarget && provider && <Typography variant="caption" color="warning.main" sx={{ml: 0.5}}>(Wrong Network)</Typography>}
                </Typography>
            </Tooltip>
            {/* Refresh button fetches REAL time */}
            <Tooltip title="Refresh Timestamp (Fetch Real)">
                 <span>
                    <IconButton size="small" color="inherit" onClick={fetchRealTimestamp} disabled={isLoadingTime || isAdvancingTime || !provider}>
                         <RefreshIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            {/* Advance button now calls the fake advance function */}
            <Tooltip title={tooltipTitleAdvance}>
                 <span>
                    <IconButton size="small" color="inherit" onClick={advanceDisplayTime} disabled={isAdvancingTime || !provider /* Disable if no provider */}>
                        {isAdvancingTime ? <CircularProgress size={20} color="inherit" /> : <AddAlarmIcon fontSize="small" />}
                    </IconButton>
                 </span>
            </Tooltip>
        </Box>
    );
};

export default AnvilTimeControls;