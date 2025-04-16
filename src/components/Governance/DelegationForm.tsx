// frontend/src/components/Governance/DelegationForm.tsx
import React, { useState } from 'react';
import { Paper, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { ethers, formatUnits, parseUnits } from 'ethers';

// Context and Hook Imports
import { useBalancesContext } from '../../contexts/BalancesContext';
import { useLoadingContext } from '../../contexts/LoadingContext';
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants';

interface DelegationFormProps {
    mockDppBalanceRaw: bigint;
    onDelegateSubmit: (targetAddress: string, amount: number) => Promise<boolean>;
}

// Accept mocked props and callback
const DelegationForm: React.FC<DelegationFormProps> = ({ mockDppBalanceRaw, onDelegateSubmit }) => {
    // --- Contexts (only need decimals) ---
    const { tokenDecimals } = useBalancesContext();
    const { isLoading: loadingStates } = useLoadingContext();

    // --- Local State ---
    const [delegateTarget, setDelegateTarget] = useState('');
    const [delegatePowerStr, setDelegatePowerStr] = useState('');
    const [delegateError, setDelegateError] = useState<string | null>(null);

    // --- Derived State ---
    const DPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;
    // <<< Use mocked balance for display >>>
    const DPPBalanceFormatted = formatUnits(mockDppBalanceRaw, DPPDecimals);

    const delegatePowerNum = parseFloat(delegatePowerStr) || 0;
    const delegateKey = 'delegateVotes';
    const isLoading = loadingStates[delegateKey] ?? false;

    // <<< Updated: Call the passed handler >>>
    const handleDelegateClickInternal = async () => {
        setDelegateError(null);
        if (!delegateTarget || !delegatePowerStr || isLoading) return;

        if (!ethers.isAddress(delegateTarget)) { setDelegateError('Invalid target address format.'); return; }

        let delegatePowerWei: bigint;
        try {
            delegatePowerWei = parseUnits(delegatePowerStr, DPPDecimals);
             if (delegatePowerWei <= 0n) { setDelegateError('Delegation amount must be positive.'); return; }
        } catch {
             setDelegateError('Invalid amount to delegate.'); return;
        }

        // <<< Balance check against mocked balance >>>
        if (delegatePowerWei > mockDppBalanceRaw) {
            setDelegateError(`Cannot delegate more DPP than you have (${DPPBalanceFormatted}).`);
            return;
        }

        try {
            // Call the passed handler from Governance.tsx
            const success = await onDelegateSubmit(delegateTarget, parseFloat(delegatePowerStr));
            if (success) {
                setDelegateTarget(''); setDelegatePowerStr('');
            } else {
                // Assume onSubmit handles its errors/snackbars if false returned
            }
        } catch (error: any) {
            console.error("Delegation failed (UI):", error);
            setDelegateError(`Delegation failed: ${error.message || String(error)}`);
        }
    };

    // <<< canDelegate check uses mocked balance >>>
    let canDelegate = false;
    if (delegateTarget && delegatePowerStr && ethers.isAddress(delegateTarget)) {
        try {
            const delegatePowerWei = parseUnits(delegatePowerStr, DPPDecimals);
            if (delegatePowerWei > 0n && delegatePowerWei <= mockDppBalanceRaw) {
                canDelegate = true;
            }
        } catch { /* Invalid number, canDelegate remains false */ }
    }


    return (
        <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonAddAlt1Icon sx={{ mr: 1 }} /> Delegate Your Voting Power
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Delegate decreases your voting power and available DPP balance, increasing the target's power.
            </Typography>
            {delegateError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDelegateError(null)}>{delegateError}</Alert>}
            <TextField
                label="Target Address"
                variant="outlined"
                fullWidth
                value={delegateTarget}
                onChange={(e) => { setDelegateTarget(e.target.value.trim()); setDelegateError(null); }} // Clear error
                placeholder="0x..."
                sx={{ mb: 2 }}
                disabled={isLoading}
                InputLabelProps={{ shrink: true }} />
            <TextField
                // <<< Use mocked balance for max display >>>
                label={`Amount of DPP to Delegate (Max: ${DPPBalanceFormatted})`}
                variant="outlined"
                type="number"
                fullWidth
                value={delegatePowerStr}
                onChange={(e) => { setDelegatePowerStr(e.target.value); setDelegateError(null); }} // Clear error
                placeholder="0.0"
                sx={{ mb: 2 }}
                disabled={isLoading}
                InputProps={{ inputProps: { min: 0, step: "any", max: DPPBalanceFormatted } }}
                InputLabelProps={{ shrink: true }}
            />
            <Button
                variant="contained"
                fullWidth
                onClick={handleDelegateClickInternal} // Use internal handler
                // <<< Use mocked balance for canDelegate check >>>
                disabled={!canDelegate || isLoading}
                size="large">
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Delegate Power'}
            </Button>
             <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                 Updates your displayed DPP balance and Voting Power.
             </Typography>
        </Paper>
    );
};

export default DelegationForm;