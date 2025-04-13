import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert, Stack, Paper } from '@mui/material';
import PollIcon from '@mui/icons-material/Poll';
import SendIcon from '@mui/icons-material/Send';
import { formatBalance } from '../../utils/formatters';

// Context and Hook Imports
import { useBalancesContext } from '../../contexts/BalancesContext';
import { useLoadingContext } from '../../contexts/LoadingContext';
import { useGovernanceActions } from '../../hooks/useGovernanceActions';

interface VoteFormProps {
    proposalId: number;
}

const VoteForm: React.FC<VoteFormProps> = ({ proposalId }) => {
    // --- Get state/actions from Contexts/Hooks ---
    const { userBalances } = useBalancesContext();
    const { isLoading: loadingStates } = useLoadingContext();
    const { handleVoteWithRange } = useGovernanceActions();

    // --- Local State ---
    const [voteLowerStr, setVoteLowerStr] = useState('');
    const [voteUpperStr, setVoteUpperStr] = useState('');
    const [votePowerStr, setVotePowerStr] = useState('');
    const [voteError, setVoteError] = useState<string | null>(null);

    // --- Derived State ---
    const vDPPBalance = parseFloat(userBalances['vDPP'] ?? 0);
    const voteLowerNum = parseFloat(voteLowerStr);
    const voteUpperNum = parseFloat(voteUpperStr);
    const votePowerNum = parseFloat(votePowerStr) || 0;
    const voteKey = `vote_${proposalId}`;
    const isLoading = loadingStates[voteKey] ?? false;

    const handleVoteSubmit = async () => {
        setVoteError(null);
        if (isLoading || !proposalId) return;

        if (isNaN(voteLowerNum) || isNaN(voteUpperNum) || votePowerNum <= 0) { setVoteError('Please enter valid numbers.'); return; }
        if (voteLowerNum > voteUpperNum) { setVoteError('Lower bound cannot be greater than upper bound.'); return; }
        if (votePowerNum > vDPPBalance) { setVoteError('Voting power cannot exceed your vDPP balance.'); return; }

        try {
            const success = await handleVoteWithRange(proposalId, voteLowerNum, voteUpperNum, votePowerNum);
            if (success) {
                setVoteLowerStr(''); setVoteUpperStr(''); setVotePowerStr('');
            }
            // Errors handled by hook snackbar
        } catch (error: any) {
            // Fallback UI error
            console.error("Voting failed (UI):", error);
            setVoteError(`Vote submission failed: ${error.message || String(error)}`);
        }
    };

    // Clear form if proposal ID changes
     useEffect(() => {
        setVoteLowerStr(''); setVoteUpperStr(''); setVotePowerStr('');
        setVoteError(null);
    }, [proposalId]);

    return (
        <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><PollIcon sx={{ mr: 1 }} /> Pool Target Price Voting:</Typography>

            <Typography variant="subtitle2" gutterBottom>Cast Your Vote:</Typography>
            {voteError && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setVoteError(null)}>{voteError}</Alert>}
            <Stack spacing={1.5}>
                <TextField label="Lower Bound" type="number" size="small" value={voteLowerStr} onChange={(e) => setVoteLowerStr(e.target.value)} disabled={isLoading} InputProps={{ inputProps: { step: "any" } }} />
                <TextField label="Upper Bound" type="number" size="small" value={voteUpperStr} onChange={(e) => setVoteUpperStr(e.target.value)} disabled={isLoading} InputProps={{ inputProps: { step: "any" } }} />
                <TextField label={`Voting Power (Max: ${formatBalance(vDPPBalance, 2)} vDPP)`} type="number" size="small" value={votePowerStr} onChange={(e) => setVotePowerStr(e.target.value)} disabled={isLoading} InputProps={{ inputProps: { min: 0, step: "any", max: vDPPBalance } }} />
                <Button variant="contained" size="medium" onClick={handleVoteSubmit} disabled={isLoading || !voteLowerStr || !voteUpperStr || !votePowerStr || votePowerNum <= 0} startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}>
                    Submit Vote
                </Button>
            </Stack>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>Your voting power will be locked according to protocol rules.</Typography>
        </Box>
        </Paper>
    );
};

export default VoteForm;