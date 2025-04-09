import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Stack,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { formatBalance } from '../../utils/formatters';

interface VoteFormProps {
    proposalId: number;
    vDPPBalance: number;
    voteWithRange: (proposalId: number, lower: number, upper: number, power: number) => Promise<void> | void;
    loadingStates: Record<string, boolean>;
}

const VoteForm: React.FC<VoteFormProps> = ({
    proposalId,
    vDPPBalance,
    voteWithRange,
    loadingStates,
}) => {
    const [voteLowerStr, setVoteLowerStr] = useState('');
    const [voteUpperStr, setVoteUpperStr] = useState('');
    const [votePowerStr, setVotePowerStr] = useState('');
    const [voteError, setVoteError] = useState<string | null>(null);

    const voteLowerNum = parseFloat(voteLowerStr);
    const voteUpperNum = parseFloat(voteUpperStr);
    const votePowerNum = parseFloat(votePowerStr) || 0;
    const voteKey = `vote_${proposalId}`;
    const isLoading = loadingStates[voteKey] ?? false;

    const handleVoteSubmit = async () => {
        setVoteError(null);
        if (isLoading || !proposalId) return;

        if (isNaN(voteLowerNum) || isNaN(voteUpperNum) || votePowerNum <= 0) {
            setVoteError('Please enter valid numbers for lower bound, upper bound, and power.');
            return;
        }
        if (voteLowerNum > voteUpperNum) {
            setVoteError('Lower bound cannot be greater than upper bound.');
            return;
        }
        if (votePowerNum > vDPPBalance) {
            setVoteError('Voting power cannot exceed your vDPP balance.');
            return;
        }

        try {
            await voteWithRange(proposalId, voteLowerNum, voteUpperNum, votePowerNum);
            setVoteLowerStr('');
            setVoteUpperStr('');
            setVotePowerStr('');
        } catch (error: any) {
            console.error("Voting failed:", error);
            setVoteError(`Vote submission failed: ${error.message || String(error)}`);
        }
    };

     // Clear form if proposal ID changes (e.g., user selects a different proposal)
     useEffect(() => {
        setVoteLowerStr('');
        setVoteUpperStr('');
        setVotePowerStr('');
        setVoteError(null);
    }, [proposalId]);

    return (
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Cast Your Vote:</Typography>
            {voteError && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setVoteError(null)}>{voteError}</Alert>}
            <Stack spacing={1.5}>
                <TextField
                    label="Lower Bound (Desired Price Range)"
                    type="number"
                    size="small"
                    value={voteLowerStr}
                    onChange={(e) => setVoteLowerStr(e.target.value)}
                    disabled={isLoading}
                    InputProps={{ inputProps: { step: "any" } }}
                />
                <TextField
                    label="Upper Bound (Desired Price Range)"
                    type="number"
                    size="small"
                    value={voteUpperStr}
                    onChange={(e) => setVoteUpperStr(e.target.value)}
                    disabled={isLoading}
                    InputProps={{ inputProps: { step: "any" } }}
                />
                <TextField
                    label={`Voting Power (Max: ${formatBalance(vDPPBalance, 2)} vDPP)`}
                    type="number"
                    size="small"
                    value={votePowerStr}
                    onChange={(e) => setVotePowerStr(e.target.value)}
                    disabled={isLoading}
                    InputProps={{ inputProps: { min: 0, step: "any", max: vDPPBalance } }}
                />
                <Button
                    variant="contained"
                    size="medium"
                    onClick={handleVoteSubmit}
                    disabled={isLoading || !voteLowerStr || !voteUpperStr || !votePowerStr}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                >
                    Submit Vote
                </Button>
            </Stack>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                Your voting power will be locked according to protocol rules.
            </Typography>
        </Box>
    );
};

export default VoteForm;