// src/components/Rewards.tsx
import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, TextField, Button,
    CircularProgress, Fade, Alert, Skeleton, Grid,
    Autocomplete // Keep Autocomplete
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import RedeemIcon from '@mui/icons-material/Redeem';

import { usePoolsContext } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useRewardActions } from '../hooks/useRewardActions';
import { formatBalance } from '../utils/formatters';
// *** Import correct utilities and use SHARED KEY ***
import { getTokenIdHistory, getMostRecentTokenId } from '../utils/localStorageUtils';

const LS_TOKEN_ID = 'liquidity_tokenId'; // Use the shared key

const Rewards: React.FC = () => {
    const { selectedPool, isLoadingPools, errorPools } = usePoolsContext();
    const { tokenSymbols, isLoadingBalances, errorBalances } = useBalancesContext();
    const { isLoading: loadingStates } = useLoadingContext();
    const { handleCalculateReward, handleCollectReward } = useRewardActions();

    const [positionIdStr, setPositionIdStr] = useState<string>('');
    const [calculatedRewards, setCalculatedRewards] = useState<{ amount0: string; amount1: string } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [tokenIdHistory, setTokenIdHistory] = useState<string[]>([]);

    // --- Loading States ---
    const isLoadingCalculate = loadingStates[`calculateReward_${positionIdStr}`] ?? false;
    const isLoadingCollect = loadingStates[`collectReward_${positionIdStr}`] ?? false;

    // --- Load history on mount ---
    useEffect(() => {
        // *** Read from the SHARED key ***
        const history = getTokenIdHistory(LS_TOKEN_ID);
        setTokenIdHistory(history);
        // Set initial value from the SHARED history
        setPositionIdStr(getMostRecentTokenId(LS_TOKEN_ID));
    }, []);

    // --- Handlers ---
    const handlePositionIdChange = (event: React.SyntheticEvent, newValue: string | null) => {
        setPositionIdStr(newValue ?? '');
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
        const rewards = await handleCalculateReward(positionIdStr);
        if (rewards) {
            setCalculatedRewards(rewards);
            // *** REMOVED addTokenIdToHistory call here ***
        }
    };

    const handleCollectClick = async () => {
        setErrorMsg(null);
        if (!positionIdStr || isNaN(parseInt(positionIdStr))) {
             setErrorMsg('Please enter or select a valid Position Token ID.');
            return;
        }
        const success = await handleCollectReward(positionIdStr);
        if (success) {
            setCalculatedRewards(null);
            // *** REMOVED history refresh - it's read-only here ***
            // setTokenIdHistory(getTokenIdHistory(LS_TOKEN_ID));
        }
    };

    // --- Render Logic ---
    const tokenA = selectedPool?.tokenA;
    const tokenB = selectedPool?.tokenB;
    const tokenAAddress = selectedPool?.tokenA_Address;
    const tokenBAddress = selectedPool?.tokenB_Address;

    const symbolA = tokenAAddress ? (tokenSymbols[tokenAAddress] ?? tokenA ?? 'Token A') : 'Token A';
    const symbolB = tokenBAddress ? (tokenSymbols[tokenBAddress] ?? tokenB ?? 'Token B') : 'Token B';

    if (isLoadingPools || isLoadingBalances) {
         return (
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
        return (
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
                            Check and collect rewards associated with your Desired Price Pool liquidity position (NFT).
                        </Typography>

                        <Autocomplete
                            freeSolo
                            options={tokenIdHistory} // Read from shared history state
                            value={positionIdStr}
                            onChange={handlePositionIdChange} // Handles selection/clearing
                            onInputChange={(event, newInputValue) => { // Handles typing
                                setPositionIdStr(newInputValue ?? '');
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
                                <Grid container spacing={2} textAlign="center">
                                    <Grid item xs={6}>
                                         <Typography variant="overline" color="text.secondary">Reward {symbolA}</Typography>
                                        <Typography variant="h6">{calculatedRewards.amount0}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                         <Typography variant="overline" color="text.secondary">Reward {symbolB}</Typography>
                                        <Typography variant="h6">{calculatedRewards.amount1}</Typography>
                                    </Grid>
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
                                    disabled={!positionIdStr || isLoadingCalculate || isLoadingCollect || !calculatedRewards || (calculatedRewards.amount0 === '0.0' && calculatedRewards.amount1 === '0.0')}
                                    size="large"
                                    startIcon={isLoadingCollect ? <CircularProgress size={20} color="inherit"/> : <RedeemIcon />}
                                >
                                    Collect
                                </Button>
                            </Grid>
                        </Grid>

                         <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                            Collected rewards will be sent to your connected wallet address.
                        </Typography>

                    </CardContent>
                </Card>
            </Fade>
        </Box>
    );
};

export default Rewards;