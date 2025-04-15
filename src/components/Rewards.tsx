// src/components/Rewards.tsx
import React, { useState, useEffect, useCallback } from 'react'; // <<< Added useCallback
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
// <<< Import NEW utility functions >>>
import { getTokenIdHistoryList, getMostRecentPosition } from '../utils/localStorageUtils';

// const LS_TOKEN_ID = 'liquidity_tokenId'; // No longer needed here
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
    // <<< History state now stores only IDs for Autocomplete >>>
    const [tokenIdHistoryList, setTokenIdHistoryList] = useState<string[]>([]);
    const [justCollectedTokenId, setJustCollectedTokenId] = useState<string | null>(null);

    // --- Loading States ---
    const isLoadingCalculate = loadingStates[`calculateReward_${positionIdStr}`] ?? false;
    const isLoadingCollect = loadingStates[`collectReward_${positionIdStr}`] ?? false;

    // --- Load history on mount ---
    useEffect(() => {
        // <<< Use new utility functions >>>
        const historyList = getTokenIdHistoryList();
        setTokenIdHistoryList(historyList);
        const mostRecentPosition = getMostRecentPosition();
        setPositionIdStr(mostRecentPosition?.tokenId ?? '');
        // <<< End history load >>>
        setJustCollectedTokenId(null);
    }, []);

    // --- Effect to reset 'justCollected' if the position ID changes ---
     useEffect(() => {
        setJustCollectedTokenId(null);
        setCalculatedRewards(null); // Also clear calculated rewards
    }, [positionIdStr]);

    // --- Handlers ---
    const handlePositionIdChange = (event: React.SyntheticEvent, newValue: string | null) => {
        const newId = newValue ?? '';
        if (newId !== positionIdStr) {
            setPositionIdStr(newId);
            setErrorMsg(null);
        }
    };

    const handlePositionIdInputChange = (event: React.SyntheticEvent, newInputValue: string) => {
        setPositionIdStr(newInputValue ?? '');
        setErrorMsg(null);
        setCalculatedRewards(null);
     };

    const handleCalculateClick = async () => {
        setErrorMsg(null);
        setCalculatedRewards(null);
        if (!positionIdStr || isNaN(parseInt(positionIdStr))) {
            setErrorMsg('Please enter or select a valid Position Token ID.');
            return;
        }

        if (positionIdStr === justCollectedTokenId) {
            console.log(`[Rewards] Showing 0 for recently collected ID: ${positionIdStr}`);
            setCalculatedRewards({
                amount0: '0.0',
                amount1: '0.0',
                earnedTimestamp: simulatedTimestamp ?? Math.floor(Date.now() / 1000)
            });
            return;
        }

        const rewardsResult = await handleCalculateReward(positionIdStr);
        if (rewardsResult) {
            setCalculatedRewards(rewardsResult);
        }
    };

    const handleCollectClick = async () => {
        setErrorMsg(null);
        const currentTokenIdToCollect = positionIdStr;
        if (!currentTokenIdToCollect || isNaN(parseInt(currentTokenIdToCollect))) {
             setErrorMsg('Please enter or select a valid Position Token ID.');
            return;
        }

        const success = await handleCollectReward(currentTokenIdToCollect, calculatedRewards?.earnedTimestamp ?? null);
        if (success) {
            setJustCollectedTokenId(currentTokenIdToCollect);
            setCalculatedRewards(null);
            // <<< Refresh history list state in case it was touched >>>
            setTokenIdHistoryList(getTokenIdHistoryList());
        }
    };

    // --- Derived Values for UI ---
    const currentSimulatedTime = simulatedTimestamp ?? Math.floor(Date.now() / 1000);
    const unlockTimestamp = calculatedRewards ? calculatedRewards.earnedTimestamp + REWARD_LOCK_PERIOD_S : null;
    const isLocked = unlockTimestamp !== null && currentSimulatedTime < unlockTimestamp;
    const timeUntilUnlockS = unlockTimestamp !== null ? Math.max(0, unlockTimestamp - currentSimulatedTime) : null;
    const canCollect = calculatedRewards !== null &&
                       (parseFloat(calculatedRewards.amount0) > 0 || parseFloat(calculatedRewards.amount1) > 0) &&
                       !isLocked;

    // --- Render Logic (remains largely the same, just update Autocomplete options) ---
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
                            options={tokenIdHistoryList} // <<< Use list of IDs
                            value={positionIdStr}
                            onChange={handlePositionIdChange}
                            onInputChange={handlePositionIdInputChange} // Handles typing
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

                        {/* Calculated Rewards Display (remains the same) */}
                        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, mb: 2, minHeight: '80px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', bgcolor: 'action.hover' }}>
                           {calculatedRewards ? ( /* ... content ... */
                                <Grid container spacing={1} textAlign="center">
                                    <Grid item xs={6}>
                                         <Typography variant="overline" color="text.secondary">Reward {symbolA}</Typography>
                                        <Typography variant="h6">{formatBalance(calculatedRewards.amount0, 6)}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                         <Typography variant="overline" color="text.secondary">Reward {symbolB}</Typography>
                                        <Typography variant="h6">{formatBalance(calculatedRewards.amount1, 6)}</Typography>
                                    </Grid>
                                     {isLocked && timeUntilUnlockS !== null && (
                                         <Grid item xs={12} sx={{ mt: 1 }}>
                                             <Typography variant="caption" color="text.secondary">
                                                 Locked for: {formatDuration(timeUntilUnlockS)}
                                             </Typography>
                                         </Grid>
                                     )}
                                     {positionIdStr === justCollectedTokenId && (
                                          <Grid item xs={12} sx={{ mt: 1 }}>
                                             <Typography variant="caption" color="text.secondary">
                                                 (Rewards just collected)
                                             </Typography>
                                         </Grid>
                                     )}
                                </Grid>
                            ) : isLoadingCalculate ? ( <CircularProgress size={24} /> ) : ( <Typography variant="body2" color="text.secondary"> Enter/Select ID and click 'Calculate'. </Typography> )}
                        </Box>

                         {/* Action Buttons (remain the same) */}
                         <Grid container spacing={2}>
                            {/* ... buttons ... */}
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
                                    disabled={ !positionIdStr || isLoadingCalculate || isLoadingCollect || !canCollect }
                                    size="large"
                                    startIcon={isLoadingCollect ? <CircularProgress size={20} color="inherit"/> : <RedeemIcon />}
                                >
                                    Collect
                                </Button>
                            </Grid>
                        </Grid>

                         {/* ... caption ... */}
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