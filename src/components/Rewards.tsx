// src/components/Rewards.tsx
import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, TextField, Button,
    CircularProgress, Fade, Alert, Skeleton, Grid,
    Autocomplete
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import RedeemIcon from '@mui/icons-material/Redeem';

import { usePoolsContext } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useTimeContext } from '../contexts/TimeContext';
import { useRewardActions } from '../hooks/useRewardActions';
import { formatBalance } from '../utils/formatters';
import { getTokenIdHistory, getMostRecentTokenId } from '../utils/localStorageUtils';

const LS_TOKEN_ID = 'liquidity_tokenId';
const REWARD_LOCK_PERIOD_S = 1 * 24 * 60 * 60; // 1 day in seconds

interface CalculatedRewardState {
    amount0: string;
    amount1: string;
    earnedTimestamp: number;
}

// Helper function (can be moved)
const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return "now";
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${Math.floor(seconds % 60)}s`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${Math.floor(minutes % 60)}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${Math.floor(hours % 24)}h`;
};


const Rewards: React.FC = () => {
    const { selectedPool, isLoadingPools, errorPools } = usePoolsContext();
    const { tokenSymbols, isLoadingBalances, errorBalances } = useBalancesContext();
    const { isLoading: loadingStates } = useLoadingContext();
    const { simulatedTimestamp } = useTimeContext();
    const { handleCalculateReward, handleCollectReward } = useRewardActions();

    const [positionIdStr, setPositionIdStr] = useState<string>('');
    const [calculatedRewards, setCalculatedRewards] = useState<CalculatedRewardState | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [tokenIdHistory, setTokenIdHistory] = useState<string[]>([]);
    // --- State to track the last collected ID ---
    const [justCollectedTokenId, setJustCollectedTokenId] = useState<string | null>(null);

    // --- Loading States ---
    const isLoadingCalculate = loadingStates[`calculateReward_${positionIdStr}`] ?? false;
    const isLoadingCollect = loadingStates[`collectReward_${positionIdStr}`] ?? false;

    // --- Load history on mount ---
    useEffect(() => {
        const history = getTokenIdHistory(LS_TOKEN_ID);
        setTokenIdHistory(history);
        const mostRecentId = getMostRecentTokenId(LS_TOKEN_ID);
        setPositionIdStr(mostRecentId);
        setJustCollectedTokenId(null); // Reset collected tracker on mount/pool change implicitly
    }, []); // Run only once on mount

     // Effect to reset 'justCollected' if the position ID changes
     useEffect(() => {
        setJustCollectedTokenId(null);
        setCalculatedRewards(null); // Also clear calculated rewards
    }, [positionIdStr]);

    // --- Handlers ---
    const handlePositionIdChange = (event: React.SyntheticEvent, newValue: string | null) => {
        const newId = newValue ?? '';
        // Check if the ID actually changed before updating state
        // This prevents resetting 'justCollectedTokenId' unnecessarily if user clicks the same value
        if (newId !== positionIdStr) {
            setPositionIdStr(newId);
            setErrorMsg(null);
            // State reset happens in the useEffect dependent on positionIdStr
        }
    };

     const handlePositionIdInputChange = (event: React.SyntheticEvent, newInputValue: string) => {
         // Update the input field value directly
         setPositionIdStr(newInputValue ?? '');
         // Don't reset justCollectedTokenId here, wait for blur or selection (handled by useEffect)
         // Clear error/rewards immediately on typing
         setErrorMsg(null);
         setCalculatedRewards(null);
     };

    const handleCalculateClick = async () => {
        setErrorMsg(null);
        setCalculatedRewards(null); // Clear previous display first
        if (!positionIdStr || isNaN(parseInt(positionIdStr))) {
            setErrorMsg('Please enter or select a valid Position Token ID.');
            return;
        }

        // If we just collected this ID, show 0 immediately and skip hook call
        if (positionIdStr === justCollectedTokenId) {
            console.log(`[Rewards] Showing 0 for recently collected ID: ${positionIdStr}`);
            setCalculatedRewards({
                amount0: '0.0',
                amount1: '0.0',
                earnedTimestamp: simulatedTimestamp ?? Math.floor(Date.now() / 1000) // Use current time for timestamp
            });
            return; // Stop here
        }

        // Otherwise, call the hook to get calculated rewards
        const rewardsResult = await handleCalculateReward(positionIdStr);
        if (rewardsResult) {
            setCalculatedRewards(rewardsResult);
        }
        // If rewardsResult is null (error in hook), state remains null
    };

    const handleCollectClick = async () => {
        setErrorMsg(null);
        const currentTokenIdToCollect = positionIdStr; // Capture ID before potential state changes
        if (!currentTokenIdToCollect || isNaN(parseInt(currentTokenIdToCollect))) {
             setErrorMsg('Please enter or select a valid Position Token ID.');
            return;
        }

        const success = await handleCollectReward(currentTokenIdToCollect, calculatedRewards?.earnedTimestamp ?? null);
        if (success) {
            // Set the ID that was just collected
            setJustCollectedTokenId(currentTokenIdToCollect);
            // Clear the displayed reward amounts
            setCalculatedRewards(null);
        }
    };

    // --- Derived Values for UI ---
    const currentSimulatedTime = simulatedTimestamp ?? Math.floor(Date.now() / 1000);
    // Check based on calculatedRewards state, which might be null or zeroed out
    const unlockTimestamp = calculatedRewards ? calculatedRewards.earnedTimestamp + REWARD_LOCK_PERIOD_S : null;
    const isLocked = unlockTimestamp !== null && currentSimulatedTime < unlockTimestamp;
    const timeUntilUnlockS = unlockTimestamp !== null ? Math.max(0, unlockTimestamp - currentSimulatedTime) : null;
    // Can collect if rewards are calculated, amounts > 0, and not locked
    const canCollect = calculatedRewards !== null &&
                       (parseFloat(calculatedRewards.amount0) > 0 || parseFloat(calculatedRewards.amount1) > 0) &&
                       !isLocked;


    // --- Render Logic ---
    const tokenA = selectedPool?.tokenA;
    const tokenB = selectedPool?.tokenB;
    const tokenAAddress = selectedPool?.tokenA_Address;
    const tokenBAddress = selectedPool?.tokenB_Address;

    const symbolA = tokenAAddress ? (tokenSymbols[tokenAAddress] ?? tokenA ?? 'Token A') : 'Token A';
    const symbolB = tokenBAddress ? (tokenSymbols[tokenBAddress] ?? tokenB ?? 'Token B') : 'Token B';

    if (isLoadingPools || isLoadingBalances) {
         return ( /* ... Skeleton Loader ... */
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}>
                <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>Rewards Center</Typography>
                <Card sx={{ width: '100%', maxWidth: 500, borderRadius: 3 }}>
                    <Skeleton variant="rectangular" height={60} sx={{ borderBottom: 1, borderColor: 'divider' }} />
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Skeleton variant="text" sx={{ mb: 2 }} />
                        <Skeleton variant="rounded" height={100} sx={{ mb: 2 }} />
                        <Skeleton variant="rounded" height={50} sx={{ mb: 1 }}/>
                        <Skeleton variant="rounded" height={50} />
                    </CardContent>
                </Card>
            </Box>
        );
    }

    if (!selectedPool) {
        return ( /* ... No Pool Selected Message ... */
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
                {errorPools ? (
                    <Alert severity="error">Error loading pool: {errorPools}</Alert>
                ) : (
                    <Typography variant="h6" color="text.secondary" align="center">
                        Please select a pool from the Dashboard to check rewards.
                    </Typography>
                )}
            </Box>
        );
    }

     const renderBalanceError = errorBalances && !isLoadingBalances && (
        <Alert severity="warning" sx={{ mb: 2 }}>Could not load balances: {errorBalances}</Alert>
    );

    return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>Rewards Center</Typography>
            <Fade in={true} timeout={500}>
                <Card elevation={1} sx={{ width: '100%', maxWidth: 500, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        {renderBalanceError}
                        {errorMsg && <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2 }}>{errorMsg}</Alert>}

                        <Typography variant="body1" sx={{ mb: 2 }}>
                            Check and collect rewards associated with your Desired Price Pool liquidity position (NFT). Rewards are locked for 1 day after calculation.
                        </Typography>

                        <Autocomplete
                            freeSolo
                            options={tokenIdHistory}
                            value={positionIdStr}
                            onChange={handlePositionIdChange} // Handles selection/clearing
                            onInputChange={(event, newInputValue) => { // Handles typing
                                handlePositionIdInputChange(event, newInputValue ?? ''); // Use specific handler
                            }}
                            disabled={isLoadingCalculate || isLoadingCollect}
                            fullWidth
                            size="small"
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Position Token ID"
                                    type="number"
                                    variant="outlined"
                                    sx={{ mb: 2 }}
                                     InputProps={{ ...params.InputProps, type: 'string' }}
                                     inputProps={{ ...params.inputProps, min: 0 }}
                                />
                            )}
                        />

                        {/* Calculated Rewards Display */}
                        <Box sx={{
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 2,
                                p: 2,
                                mb: 2,
                                minHeight: '80px',
                                display: 'flex',
                                justifyContent: 'space-around',
                                alignItems: 'center',
                                bgcolor: 'action.hover'
                            }}
                        >
                           {calculatedRewards ? (
                                <Grid container spacing={1} textAlign="center">
                                    <Grid item xs={6}>
                                         <Typography variant="overline" color="text.secondary">Reward {symbolA}</Typography>
                                        <Typography variant="h6">{formatBalance(calculatedRewards.amount0, 6)}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                         <Typography variant="overline" color="text.secondary">Reward {symbolB}</Typography>
                                        <Typography variant="h6">{formatBalance(calculatedRewards.amount1, 6)}</Typography>
                                    </Grid>
                                    {/* Display Unlock Time Info */}
                                     {isLocked && timeUntilUnlockS !== null && (
                                         <Grid item xs={12} sx={{ mt: 1 }}>
                                             <Typography variant="caption" color="text.secondary">
                                                 Locked for: {formatDuration(timeUntilUnlockS)}
                                             </Typography>
                                         </Grid>
                                     )}
                                     {/* Indicate if showing zero due to recent collection */}
                                     {positionIdStr === justCollectedTokenId && (
                                          <Grid item xs={12} sx={{ mt: 1 }}>
                                             <Typography variant="caption" color="text.secondary">
                                                 (Rewards just collected)
                                             </Typography>
                                         </Grid>
                                     )}
                                </Grid>
                            ) : isLoadingCalculate ? (
                                <CircularProgress size={24} />
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    Enter/Select ID and click 'Calculate'.
                                </Typography>
                            )}
                        </Box>

                         {/* Action Buttons */}
                         <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={handleCalculateClick}
                                    disabled={!positionIdStr || isLoadingCalculate || isLoadingCollect}
                                    size="large"
                                    startIcon={isLoadingCalculate ? <CircularProgress size={20} color="inherit"/> : <CalculateIcon />}
                                >
                                    Calculate
                                </Button>
                             </Grid>
                             <Grid item xs={6}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={handleCollectClick}
                                    disabled={
                                        !positionIdStr ||
                                        isLoadingCalculate ||
                                        isLoadingCollect ||
                                        !canCollect // Use derived boolean
                                    }
                                    size="large"
                                    startIcon={isLoadingCollect ? <CircularProgress size={20} color="inherit"/> : <RedeemIcon />}
                                >
                                    Collect
                                </Button>
                            </Grid>
                        </Grid>

                         <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                            Collected rewards will be sent to your connected wallet address. Collection is possible after the 1-day lock period.
                        </Typography>

                    </CardContent>
                </Card>
            </Fade>
        </Box>
    );
};

export default Rewards;