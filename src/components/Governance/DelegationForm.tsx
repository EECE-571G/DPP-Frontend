// frontend/src/components/Governance/DelegationForm.tsx
import React, { useState } from 'react';
import { Paper, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { formatBalance } from '../../utils/formatters';

// Context and Hook Imports
import { useBalancesContext } from '../../contexts/BalancesContext';
import { useLoadingContext } from '../../contexts/LoadingContext';
import { useGovernanceActions } from '../../hooks/useGovernanceActions';
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants'; // <<< IMPORT CONSTANT

const DelegationForm: React.FC = () => {
    // --- Get state/actions from Contexts/Hooks ---
    const { userBalances } = useBalancesContext();
    const { isLoading: loadingStates } = useLoadingContext();
    const { handleDelegate } = useGovernanceActions();

    // --- Local State ---
    const [delegateTarget, setDelegateTarget] = useState('');
    const [delegatePowerStr, setDelegatePowerStr] = useState('');
    const [delegateError, setDelegateError] = useState<string | null>(null);

    // --- Derived State ---
    // *** FIX: Use address from constants to get balance ***
    const vDPPBalance = parseFloat(userBalances[GOVERNANCE_TOKEN_ADDRESS] ?? '0');
    // *** END FIX ***

    const delegatePowerNum = parseFloat(delegatePowerStr) || 0;
    const delegateKey = 'delegateVotes';
    const isLoading = loadingStates[delegateKey] ?? false;

    // handleDelegateClick (keep as before, balance check uses correct value now)
    const handleDelegateClick = async () => {
        setDelegateError(null);
        if (!delegateTarget || delegatePowerNum <= 0 || isLoading) return;

        if (!/^0x[a-fA-F0-9]{40}$/.test(delegateTarget)) { setDelegateError('Invalid target address format.'); return; }
        // Balance check uses correct value now
        if (delegatePowerNum > vDPPBalance) { setDelegateError('Cannot delegate more vDPP than you have.'); return; }

        try {
            const success = await handleDelegate(delegateTarget, delegatePowerNum);
            if (success) {
                setDelegateTarget(''); setDelegatePowerStr('');
            }
        } catch (error: any) {
            console.error("Delegation failed (UI):", error);
            setDelegateError(`Delegation failed: ${error.message || String(error)}`);
        }
    };

    // canDelegate check uses correct balance now
    const canDelegate = delegateTarget && delegatePowerNum > 0 && delegatePowerNum <= vDPPBalance && /^0x[a-fA-F0-9]{40}$/.test(delegateTarget);

    return (
        <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><PersonAddAlt1Icon sx={{ mr: 1 }} /> Delegate Your Voting Power</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>You can delegate your vDPP voting power to another address. You retain ownership.</Typography>
            {delegateError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDelegateError(null)}>{delegateError}</Alert>}
            <TextField label="Target Address" variant="outlined" fullWidth value={delegateTarget} onChange={(e) => setDelegateTarget(e.target.value.trim())} placeholder="0x..." sx={{ mb: 2 }} disabled={isLoading} InputLabelProps={{ shrink: true }} />
             {/* Display correct max balance in label */}
            <TextField
                label={`Amount of vDPP to Delegate (Max: ${formatBalance(vDPPBalance, 2)})`}
                variant="outlined"
                type="number"
                fullWidth
                value={delegatePowerStr}
                onChange={(e) => setDelegatePowerStr(e.target.value)}
                placeholder="0.0" sx={{ mb: 2 }}
                disabled={isLoading}
                InputProps={{ inputProps: { min: 0, step: "any", max: vDPPBalance } }} // Use correct balance for max
                InputLabelProps={{ shrink: true }}
            />
            <Button variant="contained" fullWidth onClick={handleDelegateClick} disabled={!canDelegate || isLoading} size="large">
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Delegate Power'}
            </Button>
        </Paper>
    );
};

export default DelegationForm;