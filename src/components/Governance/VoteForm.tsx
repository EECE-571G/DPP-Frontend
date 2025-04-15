// frontend/src/components/Governance/VoteForm.tsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Stack,
    Paper
} from '@mui/material';
import PollIcon from '@mui/icons-material/Poll';
import SendIcon from '@mui/icons-material/Send';
import { ethers, formatUnits } from 'ethers'; // <<< Use formatUnits

// Context and Hook Imports
import { useBalancesContext } from '../../contexts/BalancesContext';
import { useGovernanceContext } from '../../contexts/GovernanceContext';
import { useLoadingContext } from '../../contexts/LoadingContext';
import { useGovernanceActions } from '../../hooks/useGovernanceActions';
import { GOVERNANCE_TOKEN_ADDRESS } from '../../constants';
import { formatBalance } from '../../utils/formatters'; // <<< ADDED IMPORT

interface VoteFormProps {
    proposalId: number; // Assuming this is still needed, might relate to Pool ID conceptually now
}

const VoteForm: React.FC<VoteFormProps> = ({ proposalId }) => {
    // --- Get state/actions from Contexts/Hooks ---
    const { userBalancesRaw, tokenDecimals } = useBalancesContext();
    const { metaData, isLoadingGovernanceData } = useGovernanceContext();
    const { isLoading: loadingStates } = useLoadingContext();
    const { handleVoteWithRange } = useGovernanceActions();

    // --- Local State ---
    const [voteLowerStr, setVoteLowerStr] = useState('');
    const [voteUpperStr, setVoteUpperStr] = useState('');
    const [voteError, setVoteError] = useState<string | null>(null);

    // --- Derived State ---
    const vDPPBalanceRaw = userBalancesRaw[GOVERNANCE_TOKEN_ADDRESS] ?? 0n;
    const vDPPDecimals = tokenDecimals[GOVERNANCE_TOKEN_ADDRESS] ?? 18;
    const vDPPBalanceFormatted = formatUnits(vDPPBalanceRaw, vDPPDecimals);

    const voteLowerNum = parseFloat(voteLowerStr);
    const voteUpperNum = parseFloat(voteUpperStr);
    const voteKey = `castVote_${proposalId}`;
    const isLoading = loadingStates[voteKey] ?? false;
    const canVote = !isLoadingGovernanceData &&
                    vDPPBalanceRaw > 0n &&
                    metaData?.pollStage &&
                    (metaData.pollStage === 'Vote' || metaData.pollStage === 'Final Vote');

    const handleVoteSubmit = async () => {
         setVoteError(null);
        if (isLoading || !proposalId) return;

        if (isNaN(voteLowerNum) || isNaN(voteUpperNum)) {
            setVoteError('Please enter valid numbers for bounds.');
            return;
        }
        if (vDPPBalanceRaw <= 0n) {
            setVoteError('You have no voting power (vDPP) to cast a vote.');
            return;
        }
         if (voteLowerNum >= voteUpperNum) {
            setVoteError('Lower bound must be strictly less than upper bound.');
            return;
        }

        try {
            const success = await handleVoteWithRange(proposalId, voteLowerNum, voteUpperNum);
            if (success) {
                setVoteLowerStr('');
                setVoteUpperStr('');
            }
        } catch (error: any) {
            console.error("Voting failed (UI):", error);
            setVoteError(`Vote submission failed: ${error.message || String(error)}`);
        }
    };

     useEffect(() => {
        setVoteLowerStr('');
        setVoteUpperStr('');
        setVoteError(null);
    }, [proposalId]);

    return (
        <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <PollIcon sx={{ mr: 1 }} /> Pool Target Price Voting
                </Typography>
                 <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {/* Use imported formatBalance */}
                    Your vote will utilize your full vDPP balance: {formatBalance(vDPPBalanceFormatted, 2)} vDPP
                </Typography>

                {voteError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setVoteError(null)}>{voteError}</Alert>}

                <Stack spacing={1.5}>
                    <TextField
                        label="Lower Bound (Tick, Inclusive)"
                        type="number"
                        size="small"
                        value={voteLowerStr}
                        onChange={(e) => setVoteLowerStr(e.target.value)}
                        disabled={isLoading || !canVote}
                        InputProps={{ inputProps: { step: "any" } }}
                    />
                    <TextField
                        label="Upper Bound (Tick, Exclusive)"
                        type="number"
                        size="small"
                        value={voteUpperStr}
                        onChange={(e) => setVoteUpperStr(e.target.value)}
                        disabled={isLoading || !canVote}
                        InputProps={{ inputProps: { step: "any" } }}
                    />
                    <Button
                        variant="contained"
                        size="medium"
                        onClick={handleVoteSubmit}
                        disabled={isLoading || !voteLowerStr || !voteUpperStr || !canVote}
                        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    >
                        Cast Vote
                    </Button>
                </Stack>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    Your voting power will be locked according to protocol rules upon voting. Voting is only possible during 'Vote' or 'Final Vote' stages.
                </Typography>
            </Box>
        </Paper>
    );
};

export default VoteForm;