// frontend/src/components/Governance/DelegationForm.tsx
import React, { useState } from 'react';
import { Paper, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { ethers, formatUnits, parseUnits } from 'ethers';

// Context and Hook Imports
import { useBalancesContext } from '../../contexts/BalancesContext';
import { useLoadingContext } from '../../contexts/LoadingContext';
import { useGovernanceActions } from '../../hooks/useGovernanceActions';
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants';

const DelegationForm: React.FC = () => {
    // --- Get state/actions from Contexts/Hooks ---
    const { userBalancesRaw, tokenDecimals } = useBalancesContext(); // Use raw and get decimals
    const { isLoading: loadingStates } = useLoadingContext();
    const { handleDelegate } = useGovernanceActions();

    // --- Local State ---
    const [delegateTarget, setDelegateTarget] = useState('');
    const [delegatePowerStr, setDelegatePowerStr] = useState('');
    const [delegateError, setDelegateError] = useState<string | null>(null);

    // --- Derived State ---
    const DPPBalanceRaw = userBalancesRaw[GOVERNANCE_TOKEN_ADDRESS] ?? 0n;
    const DPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18; // Get decimals or default
    const DPPBalanceFormatted = formatUnits(DPPBalanceRaw, DPPDecimals);

    const delegatePowerNum = parseFloat(delegatePowerStr) || 0; // Keep for basic numeric checks if needed
    const delegateKey = 'delegateVotes';
    const isLoading = loadingStates[delegateKey] ?? false;

    // handleDelegateClick
    const handleDelegateClick = async () => {
        setDelegateError(null);
        if (!delegateTarget || !delegatePowerStr || isLoading) return; // Check if string is empty

        if (!ethers.isAddress(delegateTarget)) { setDelegateError('Invalid target address format.'); return; }

        let delegatePowerWei: bigint;
        try {
            delegatePowerWei = parseUnits(delegatePowerStr, DPPDecimals);
             if (delegatePowerWei <= 0n) { setDelegateError('Delegation amount must be positive.'); return; }
        } catch {
             setDelegateError('Invalid amount to delegate.'); return;
        }

        // Balance check against raw values
        if (delegatePowerWei > DPPBalanceRaw) { setDelegateError('Cannot delegate more DPP than you have.'); return; }

        try {
            // Pass the *number* representation to the hook, it will handle parsing again
            const success = await handleDelegate(delegateTarget, parseFloat(delegatePowerStr));
            if (success) {
                setDelegateTarget(''); setDelegatePowerStr('');
            }
        } catch (error: any) {
            console.error("Delegation failed (UI):", error);
            setDelegateError(`Delegation failed: ${error.message || String(error)}`);
        }
    };

    // canDelegate check uses correct balance now
    let canDelegate = false;
    if (delegateTarget && delegatePowerStr && ethers.isAddress(delegateTarget)) {
        try {
            const delegatePowerWei = parseUnits(delegatePowerStr, DPPDecimals);
            if (delegatePowerWei > 0n && delegatePowerWei <= DPPBalanceRaw) {
                canDelegate = true;
            }
        } catch {
            // Invalid number format, canDelegate remains false
        }
    }


    return (
        <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><PersonAddAlt1Icon sx={{ mr: 1 }} /> Delegate Your Voting Power</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Delegate decreases your voting power (and locked DPP balance), increasing the target's. You retain token ownership.</Typography>
            {delegateError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDelegateError(null)}>{delegateError}</Alert>}
            <TextField label="Target Address" variant="outlined" fullWidth value={delegateTarget} onChange={(e) => setDelegateTarget(e.target.value.trim())} placeholder="0x..." sx={{ mb: 2 }} disabled={isLoading} InputLabelProps={{ shrink: true }} />
             {/* Display correct max balance in label */}
            <TextField
                label={`Amount of DPP to Delegate (Max: ${DPPBalanceFormatted})`}
                variant="outlined"
                type="number"
                fullWidth
                value={delegatePowerStr}
                onChange={(e) => setDelegatePowerStr(e.target.value)}
                placeholder="0.0" sx={{ mb: 2 }}
                disabled={isLoading}
                InputProps={{ inputProps: { min: 0, step: "any", max: DPPBalanceFormatted } }} // Use formatted for input max attr
                InputLabelProps={{ shrink: true }}
            />
            <Button variant="contained" fullWidth onClick={handleDelegateClick} disabled={!canDelegate || isLoading} size="large">
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Delegate Power'}
            </Button>
        </Paper>
    );
};

export default DelegationForm;