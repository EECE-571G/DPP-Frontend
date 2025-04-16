// src/components/Liquidity.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, TextField, Button,
    Tabs, Tab, CircularProgress, Fade, Alert, Skeleton,
    Autocomplete
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import FiberNewIcon from '@mui/icons-material/FiberNew';

import { usePoolsContext } from '../contexts/PoolsContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useLiquidityActions } from '../hooks/useLiquidityActions';
// <<< Import NEW utility functions >>>
import { getTokenIdHistoryList, getMostRecentPosition } from '../utils/localStorageUtils';

// Local storage keys (no longer directly used here, handled by utils)
// const LS_TOKEN_ID = 'liquidity_tokenId';
const LS_LOWER_TICK = 'liquidity_lowerTick'; // Keep for Mint form convenience
const LS_UPPER_TICK = 'liquidity_upperTick'; // Keep for Mint form convenience

// --- Helper Components (TabPanel remains the same) ---
interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`liquidity-tabpanel-${index}`}
            aria-labelledby={`liquidity-tab-${index}`}
            {...other}
        >
            {value === index && (<Box sx={{ pt: 3 }}>{children}</Box>)}
        </div>
    );
}
// --- End Helper Components ---

const Liquidity: React.FC = () => {
    const { selectedPool, isLoadingPools, errorPools } = usePoolsContext();
    const { isLoadingBalances, errorBalances } = useBalancesContext();
    const { isLoading: loadingStates } = useLoadingContext();
    const { handleMintPosition, handleAddLiquidity, handleRemoveLiquidity } = useLiquidityActions();

    const [tabValue, setTabValue] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // --- State for Mint Tab ---
    const [lowerTickStr, setLowerTickStr] = useState('');
    const [upperTickStr, setUpperTickStr] = useState('');
    const [mintLiquidityStr, setMintLiquidityStr] = useState('');

    // --- State for Add Tab ---
    const [addTokenIdStr, setAddTokenIdStr] = useState('');
    const [addLiquidityStr, setAddLiquidityStr] = useState('');

    // --- State for Remove Tab ---
    const [removeTokenIdStr, setRemoveTokenIdStr] = useState('');
    const [removeLiquidityStr, setRemoveLiquidityStr] = useState('');

    // --- State for Token ID History (now just the IDs for Autocomplete) ---
    const [tokenIdHistoryList, setTokenIdHistoryList] = useState<string[]>([]);

    // --- Loading State ---
    const isMinting = loadingStates['mintPosition'] ?? false;
    const isMintApproving = loadingStates['mintPosition_approve'] ?? false;
    const isAdding = loadingStates[`addLiquidity_${addTokenIdStr}`] ?? false;
    const isAddApproving = loadingStates[`addLiquidity_approve_${addTokenIdStr}`] ?? false;
    const isRemoving = loadingStates[`removeLiquidity_${removeTokenIdStr}`] ?? false;

    // --- Load from localStorage on mount ---
    useEffect(() => {
        // Load history list (just IDs)
        const historyList = getTokenIdHistoryList(); // <<< Use new util
        setTokenIdHistoryList(historyList);

        // Get the most recent full position data
        const mostRecentPosition = getMostRecentPosition(); // <<< Use new util

        // Set initial value for token ID fields
        const mostRecentId = mostRecentPosition?.tokenId ?? '';
        setAddTokenIdStr(mostRecentId);
        setRemoveTokenIdStr(mostRecentId);

        // Pre-fill Mint ticks ONLY if the most recent position is relevant?
        // Or just use the last individually saved ticks for Mint convenience?
        // Let's keep using individual LS for Mint ticks for now.
        setLowerTickStr(localStorage.getItem(LS_LOWER_TICK) || mostRecentPosition?.lowerTick || '');
        setUpperTickStr(localStorage.getItem(LS_UPPER_TICK) || mostRecentPosition?.upperTick || '');

    }, []); // Run only once on mount

    // Refresh history suggestions after actions (triggered by hook now)
    const refreshHistoryList = useCallback(() => {
        setTokenIdHistoryList(getTokenIdHistoryList());
    }, []);

    // --- Handlers ---
    const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        setErrorMsg(null); // Clear errors on tab change
    };

    // Input change handlers with localStorage saving (keep for Mint convenience)
    const handleLowerTickChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLowerTickStr(val);
        localStorage.setItem(LS_LOWER_TICK, val); // Still save individually for Mint tab
        setErrorMsg(null);
    };
    const handleUpperTickChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setUpperTickStr(val);
        localStorage.setItem(LS_UPPER_TICK, val); // Still save individually for Mint tab
        setErrorMsg(null);
    };
    const handleMintLiquidityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMintLiquidityStr(e.target.value);
        setErrorMsg(null);
    };

    // Token ID Autocomplete Handlers (remain similar, just update the string state)
    const handleAddTokenIdInputChange = (event: React.SyntheticEvent, newValue: string | null) => {
        setAddTokenIdStr(newValue ?? '');
        setErrorMsg(null);
    };
    const handleRemoveTokenIdInputChange = (event: React.SyntheticEvent, newValue: string | null) => {
        setRemoveTokenIdStr(newValue ?? '');
        setErrorMsg(null);
    };

    // Other amount handlers (keep)
    const handleAddLiquidityAmtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddLiquidityStr(e.target.value);
        setErrorMsg(null);
    };
    const handleRemoveLiquidityAmtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRemoveLiquidityStr(e.target.value);
        setErrorMsg(null);
    };

    // Action handlers (now refresh the list state after hook success)
    const handleMintClick = async () => {
        setErrorMsg(null);
        const lowerTickNum = parseInt(lowerTickStr, 10);
        const upperTickNum = parseInt(upperTickStr, 10);

        if (isNaN(lowerTickNum) || isNaN(upperTickNum)) {
            setErrorMsg("Ticks must be valid numbers.");
            return;
        }

        const success = await handleMintPosition(lowerTickNum, upperTickNum, mintLiquidityStr);
        if (success) {
            setMintLiquidityStr('');
            // Refresh history LIST state after mint
            refreshHistoryList();
            // Set the new ID as the current selection in Add/Remove
            const latestPosition = getMostRecentPosition(); // Get the full item
            const latestId = latestPosition?.tokenId ?? '';
            setAddTokenIdStr(latestId);
            setRemoveTokenIdStr(latestId);
            // Optionally update tick fields based on the new position
            // setLowerTickStr(latestPosition?.lowerTick ?? '');
            // setUpperTickStr(latestPosition?.upperTick ?? '');
        }
    };

    const handleAddClick = async () => {
        setErrorMsg(null);
        const success = await handleAddLiquidity(addTokenIdStr, addLiquidityStr);
        if (success) {
            setAddLiquidityStr('');
            // Refresh history LIST state after add
            refreshHistoryList();
        }
    };

    const handleRemoveClick = async () => {
        setErrorMsg(null);
        const success = await handleRemoveLiquidity(removeTokenIdStr, removeLiquidityStr);
         if (success) {
            setRemoveLiquidityStr('');
            // Refresh history LIST state after remove
            refreshHistoryList();
        }
    };


    // --- Render Logic (Skeleton/No Pool checks remain the same) ---
     if (isLoadingPools || isLoadingBalances) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4, px: { xs: 1, sm: 0 } }}>
                <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>Manage Liquidity</Typography>
                <Card sx={{ width: '100%', maxWidth: 500, borderRadius: 3 }}>
                    <Skeleton variant="rectangular" height={48} sx={{ borderBottom: 1, borderColor: 'divider' }} />
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Skeleton variant="rounded" height={100} sx={{ mb: 2 }} />
                        <Skeleton variant="rounded" height={100} sx={{ mb: 2 }} />
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
                        Please select a pool from the Dashboard to manage liquidity.
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
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>Manage Liquidity</Typography>
            <Fade in={true} timeout={500}>
                <Card elevation={1} sx={{ width: '100%', maxWidth: 500, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <Tabs value={tabValue} onChange={handleChangeTab} variant="fullWidth" textColor="primary" indicatorColor="primary" sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
                        <Tab label="Mint Position" icon={<FiberNewIcon />} iconPosition="start" id="liquidity-tab-0" aria-controls="liquidity-tabpanel-0" />
                        <Tab label="Add Liquidity" icon={<AddIcon />} iconPosition="start" id="liquidity-tab-1" aria-controls="liquidity-tabpanel-1" />
                        <Tab label="Remove Liquidity" icon={<RemoveIcon />} iconPosition="start" id="liquidity-tab-2" aria-controls="liquidity-tabpanel-2" />
                    </Tabs>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        {renderBalanceError}
                        {errorMsg && <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2 }}>{errorMsg}</Alert>}

                        {/* Mint Position Panel (Keeps using individual tick state for convenience) */}
                        <TabPanel value={tabValue} index={0}>
                           {/* ... Content remains the same ... */}
                             <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Create a new liquidity position (NFT) within a specified price range (ticks).
                            </Typography>
                            <TextField
                                label="Lower Tick"
                                type="number"
                                variant="outlined"
                                fullWidth
                                value={lowerTickStr}
                                onChange={handleLowerTickChange}
                                disabled={isMinting || isMintApproving}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label="Upper Tick"
                                type="number"
                                variant="outlined"
                                fullWidth
                                value={upperTickStr}
                                onChange={handleUpperTickChange}
                                disabled={isMinting || isMintApproving}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label="Liquidity Amount" // User provides liquidity value
                                type="text" // Use text to allow large numbers potentially
                                variant="outlined"
                                placeholder="e.g., 1000000000000000000"
                                fullWidth
                                value={mintLiquidityStr}
                                onChange={handleMintLiquidityChange}
                                disabled={isMinting || isMintApproving}
                                sx={{ mb: 2 }}
                            />
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={handleMintClick}
                                disabled={isMinting || isMintApproving || !lowerTickStr || !upperTickStr || !mintLiquidityStr}
                                size="large"
                                sx={{ borderRadius: 2, py: 1.5, mt: 1 }}
                            >
                                {isMintApproving ? "Approving..." : isMinting ? "Minting..." : 'Mint Position'}
                            </Button>
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                Note: Requires token approvals for Position Manager. Token amounts needed will be withdrawn based on liquidity and price range.
                            </Typography>
                        </TabPanel>

                        {/* Add Liquidity Panel (Uses Autocomplete with ID list) */}
                        <TabPanel value={tabValue} index={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Increase the liquidity of an existing position NFT you own.
                            </Typography>
                            <Autocomplete
                                freeSolo
                                options={tokenIdHistoryList} // <<< Use list of IDs
                                value={addTokenIdStr}
                                onInputChange={handleAddTokenIdInputChange} // Handles typing
                                onChange={(event, newValue) => { // Handles selection/clear
                                    handleAddTokenIdInputChange(event, newValue ?? '');
                                }}
                                disabled={isAdding || isAddApproving}
                                fullWidth
                                size="small"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Position Token ID"
                                        type="number"
                                        variant="outlined"
                                        sx={{ mb: 2 }}
                                        InputProps={{
                                            ...params.InputProps, type: 'string',
                                            inputProps: { ...params.inputProps, min: 0 }
                                        }}
                                    />
                                )}
                            />
                             {/* ... Rest of Add Panel (liquidity amount, button) remains the same ... */}
                            <TextField
                                label="Liquidity Amount to Add"
                                type="text"
                                variant="outlined"
                                placeholder="e.g., 500000000000000000"
                                fullWidth
                                value={addLiquidityStr}
                                onChange={handleAddLiquidityAmtChange}
                                disabled={isAdding || isAddApproving}
                                sx={{ mb: 2 }}
                            />
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={handleAddClick}
                                disabled={isAdding || isAddApproving || !addTokenIdStr || !addLiquidityStr}
                                size="large"
                                sx={{ borderRadius: 2, py: 1.5, mt: 1 }}
                            >
                                {isAddApproving ? "Approving..." : isAdding ? "Adding..." : 'Add Liquidity'}
                            </Button>
                             <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                Note: Requires token approvals. Token amounts will be withdrawn based on liquidity and price.
                            </Typography>
                        </TabPanel>

                        {/* Remove Liquidity Panel (Uses Autocomplete with ID list) */}
                        <TabPanel value={tabValue} index={2}>
                           <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Decrease the liquidity of an existing position NFT you own.
                            </Typography>
                            <Autocomplete
                                freeSolo
                                options={tokenIdHistoryList} // <<< Use list of IDs
                                value={removeTokenIdStr}
                                onInputChange={handleRemoveTokenIdInputChange} // Handles typing
                                onChange={(event, newValue) => { // Handles selection/clear
                                     handleRemoveTokenIdInputChange(event, newValue ?? '');
                                }}
                                disabled={isRemoving}
                                fullWidth
                                size="small"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Position Token ID"
                                        type="number"
                                        variant="outlined"
                                        sx={{ mb: 2 }}
                                         InputProps={{
                                            ...params.InputProps, type: 'string',
                                            inputProps: { ...params.inputProps, min: 0 }
                                        }}
                                    />
                                )}
                            />
                             {/* ... Rest of Remove Panel (liquidity amount, button) remains the same ... */}
                            <TextField
                                label="Liquidity Amount to Remove"
                                type="text"
                                variant="outlined"
                                placeholder="e.g., 500000000000000000"
                                fullWidth
                                value={removeLiquidityStr}
                                onChange={handleRemoveLiquidityAmtChange}
                                disabled={isRemoving}
                                sx={{ mb: 2 }}
                            />
                            <Button
                                variant="contained"
                                color="secondary"
                                fullWidth
                                onClick={handleRemoveClick}
                                disabled={isRemoving || !removeTokenIdStr || !removeLiquidityStr}
                                size="large"
                                sx={{ borderRadius: 2, py: 1.5, mt: 1 }}
                            >
                                {isRemoving ? "Removing..." : 'Remove Liquidity'}
                            </Button>
                             <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                Note: After removing, you might need to 'Collect' withdrawn tokens separately.
                            </Typography>
                        </TabPanel>

                    </CardContent>
                </Card>
            </Fade>
        </Box>
    );
};

export default Liquidity;