// src/components/Dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Autocomplete, TextField, Card, CardContent,
  Paper, Grid, Collapse, Skeleton, Alert, Divider, Button,
  CircularProgress, Link
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { ethers, Contract, ZeroAddress, isAddress } from 'ethers';

import { usePoolsContext, V4Pool } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useAuthContext } from '../contexts/AuthContext';
import { POSITION_MANAGER_ADDRESS, TARGET_NETWORK_CHAIN_ID, EXPLORER_URL_BASE } from '../constants';
import PositionManagerABI from '../abis/PositionManager.json';
import { formatBalance } from '../utils/formatters';
import { getTokenIdHistoryList, getMostRecentPosition } from '../utils/localStorageUtils';

const Dashboard: React.FC = () => {
  const { pools, selectedPool, isLoadingPools, errorPools, handlePoolSelection } = usePoolsContext();
  const { userBalances, tokenSymbols, isLoadingBalances, errorBalances } = useBalancesContext();
  const { provider, network, account } = useAuthContext();

  const [inspectTokenId, setInspectTokenId] = useState<string>('');
  const [positionLiquidity, setPositionLiquidity] = useState<string | null>(null);
  const [isLoadingLiquidity, setIsLoadingLiquidity] = useState<boolean>(false);
  const [liquidityError, setLiquidityError] = useState<string | null>(null);
  const [tokenIdHistoryList, setTokenIdHistoryList] = useState<string[]>([]);

  // --- Load history on mount ---
  useEffect(() => {
      const historyList = getTokenIdHistoryList();
      setTokenIdHistoryList(historyList);
      const mostRecentPosition = getMostRecentPosition();
      setInspectTokenId(mostRecentPosition?.tokenId ?? '');
  }, []);

  // --- Fetch Liquidity Logic ---
    const fetchPositionLiquidity = useCallback(async () => {
    if (!provider || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
      setLiquidityError("Connect to the correct network first.");
      return;
    }
    if (POSITION_MANAGER_ADDRESS === ZeroAddress || !PositionManagerABI) {
      setLiquidityError("Position Manager not configured.");
      return;
    }
    if (!inspectTokenId) {
        setLiquidityError("Please enter or select a Token ID.");
        return;
    }

    let tokenIdBigInt: bigint;
    try {
      tokenIdBigInt = BigInt(inspectTokenId);
      if (tokenIdBigInt <= 0n) throw new Error("Token ID must be positive.");
    } catch {
      setLiquidityError("Invalid Token ID format.");
      return;
    }

    setIsLoadingLiquidity(true);
    setLiquidityError(null);
    setPositionLiquidity(null);

    try {
      const positionManagerContract = new Contract(POSITION_MANAGER_ADDRESS, PositionManagerABI, provider);
      console.log(`Fetching liquidity for Token ID: ${inspectTokenId}`);

      const liquidityResult: bigint = await positionManagerContract.getPositionLiquidity(tokenIdBigInt);
      const formattedLiquidity = liquidityResult.toLocaleString();
      setPositionLiquidity(formattedLiquidity);
      console.log(`Fetched Liquidity: ${formattedLiquidity}`);
    } catch (err: any) {
      console.error("Failed to fetch position liquidity:", err);
      const reason = err?.reason || err?.data?.message?.replace('execution reverted: ', '') || err.message || "Could not fetch liquidity.";
      if (reason.includes('ERC721NonexistentToken') || reason.includes('Invalid token ID') || reason.includes('URI query for nonexistent token')) {
           setLiquidityError(`Token ID ${inspectTokenId} does not exist or is invalid.`);
      } else {
          setLiquidityError(`Error: ${reason}`);
      }
      setPositionLiquidity(null);
    } finally {
      setIsLoadingLiquidity(false);
    }
  }, [provider, network, inspectTokenId]);

  // Handle Autocomplete input change and selection
   const handleInspectTokenIdChange = (event: React.SyntheticEvent, newValue: string | null) => {
       setInspectTokenId(newValue ?? ''); // Update state
       setLiquidityError(null);
       setPositionLiquidity(null);
   };
    const handleInspectTokenIdInputChange = (event: React.SyntheticEvent, newInputValue: string) => {
       setInspectTokenId(newInputValue ?? ''); // Update state on typing
       setLiquidityError(null);
       setPositionLiquidity(null);
   };


  // Derived values
  const tokenAAddress = selectedPool?.tokenA_Address;
  const tokenBAddress = selectedPool?.tokenB_Address;
  const tokenABalanceStr = tokenAAddress && userBalances[tokenAAddress] ? formatBalance(userBalances[tokenAAddress], 6) : '0.00';
  const tokenBBalanceStr = tokenBAddress && userBalances[tokenBAddress] ? formatBalance(userBalances[tokenBAddress], 6) : '0.00';
  const tokenASymbol = tokenAAddress && tokenSymbols[tokenAAddress] ? tokenSymbols[tokenAAddress] : 'N/A';
  const tokenBSymbol = tokenBAddress && tokenSymbols[tokenBAddress] ? tokenSymbols[tokenBAddress] : 'N/A';

  // --- Render logic ---
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* ... Title, Errors, Pool Selection Card ... */}
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
        Pool Dashboard
      </Typography>

      {errorPools && <Alert severity="error" sx={{ mb: 2 }}>{errorPools}</Alert>}
      {errorBalances && !isLoadingBalances && <Alert severity="warning" sx={{ mb: 2 }}>Balance Warning: {errorBalances}</Alert>}

      <Card elevation={1} sx={{ borderRadius: 2, mb: 3, }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {isLoadingPools ? (
              <Skeleton variant="rounded" height={56} />
          ) : (
              <Autocomplete
                  options={pools}
                  value={selectedPool}
                  onChange={(event: any, newValue: V4Pool | null) => {
                      handlePoolSelection(newValue);
                      // Reset inspection input when pool changes
                      const mostRecentPos = getMostRecentPosition();
                      setInspectTokenId(mostRecentPos?.tokenId ?? '');
                      setPositionLiquidity(null);
                      setLiquidityError(null);
                      // Refresh history suggestions when pool changes
                      setTokenIdHistoryList(getTokenIdHistoryList());
                  }}
                  getOptionLabel={(option) => `${option.name} (${option.tokenA} / ${option.tokenB})`}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                       <TextField
                          {...params}
                          label="Select a DPP Pool"
                          variant="outlined"
                          placeholder='Search or select a pool...'
                          fullWidth
                      />
                  )}
                  noOptionsText="No pools found"
                  sx={{ mb: 1 }}
              />
          )}
        </CardContent>
      </Card>

      {/* Details Card */}
      <Collapse in={!!selectedPool || isLoadingBalances || isLoadingPools} timeout={400} unmountOnExit>
        <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          {/* ... Pool Title, Balances ... */}
             {(isLoadingPools || selectedPool) && (
             <Typography variant="h5" sx={{ mb: 2, fontWeight: 500 }}>
                {selectedPool ? selectedPool.name : <Skeleton width="50%"/>} Details
             </Typography>
          )}
          <Grid container spacing={2} rowSpacing={1.5}>

            {(isLoadingBalances || selectedPool) && (
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1.1rem', fontWeight: 500 }}>
                  Your Balances
                </Typography>
              </Grid>
            )}
             {isLoadingBalances ? (
                 <>
                    <Grid item xs={12} sm={6}><Skeleton width="50%" /></Grid>
                    <Grid item xs={12} sm={6}><Skeleton width="50%" /></Grid>
                 </>
             ) : selectedPool ? (
                <>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>{tokenASymbol}:</strong>{' '}
                        {tokenABalanceStr}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>{tokenBSymbol}:</strong>{' '}
                        {tokenBBalanceStr}
                      </Typography>
                    </Grid>
                </>
             ) : null}

            {(isLoadingBalances || selectedPool) && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
            )}

            {/* Liquidity Inspection */}
            {(isLoadingPools || selectedPool) && (
                <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1.1rem', fontWeight: 500 }}>
                        Inspect Position Liquidity
                    </Typography>
                    {/* ... Description ... */}
                      <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                        Enter or select the Token ID of a position NFT to view its current liquidity amount. Suggestions are based on recently managed IDs.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                         <Autocomplete
                            freeSolo
                            options={tokenIdHistoryList}
                            value={inspectTokenId}
                            onChange={handleInspectTokenIdChange}
                            onInputChange={handleInspectTokenIdInputChange}
                            disabled={isLoadingLiquidity || !account}
                            fullWidth
                            size="small"
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Position Token ID"
                                    variant="outlined"
                                    type="number"
                                    sx={{ flexGrow: 1 }}
                                     InputProps={{
                                        ...params.InputProps,
                                        type: 'string',
                                        inputProps: { ...params.inputProps, min: 0 }
                                    }}
                                />
                            )}
                        />
                        {/* ... Fetch Button ... */}
                         <Button
                            variant="contained"
                            onClick={fetchPositionLiquidity}
                            disabled={!inspectTokenId || isLoadingLiquidity || !account}
                            sx={{ height: '40px' }}
                        >
                            {isLoadingLiquidity ? <CircularProgress size={24} /> : "Fetch"}
                        </Button>
                    </Box>
                    {/* ... Result/Error Display ... */}
                    {liquidityError && <Alert severity="error" sx={{mt: 1}}>{liquidityError}</Alert>}
                     {positionLiquidity !== null && !liquidityError && (
                         <Paper variant="outlined" sx={{ p: 1.5, mt: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                             <Typography variant="body1" >
                                <strong>Liquidity:</strong> {positionLiquidity}
                             </Typography>
                         </Paper>
                     )}
                     {!positionLiquidity && !isLoadingLiquidity && !liquidityError && !inspectTokenId && (
                         <Typography variant="caption" color="text.secondary" sx={{mt: 1, display: 'flex', alignItems: 'center'}}>
                             <InfoIcon fontSize="inherit" sx={{ mr: 0.5 }} /> Enter or select a Token ID and click 'Fetch'.
                         </Typography>
                     )}
                     {!positionLiquidity && !isLoadingLiquidity && !liquidityError && inspectTokenId && (
                         <Typography variant="caption" color="text.secondary" sx={{mt: 1, display: 'flex', alignItems: 'center'}}>
                             <InfoIcon fontSize="inherit" sx={{ mr: 0.5 }} /> Click 'Fetch' to view liquidity for ID {inspectTokenId}.
                         </Typography>
                    )}
                </Grid>
            )}
          </Grid>
        </Paper>
      </Collapse>
       {/* ... No Pool Selected Message ... */}
       {!selectedPool && !isLoadingPools && !errorPools && pools.length > 0 && (
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
          Select a pool above to view details and inspect position liquidity.
        </Typography>
      )}
      {!isLoadingPools && !errorPools && pools.length === 0 && (
         <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
             No pools are currently available. Check constants and deployment script logs.
         </Typography>
      )}
    </Box>
  );
};

export default Dashboard;