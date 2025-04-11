import { useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { formatBalance, shortenAddress } from '../utils/formatters';
// Note: Balance context isn't strictly needed here unless actions affect balances directly

export const useGovernanceActions = () => {
    const { session } = useAuthContext();
    const { setLoading } = useLoadingContext();
    // Use the context hook to get the showSnackbar function
    const { showSnackbar } = useSnackbarContext();

    const handleVoteWithRange = useCallback(async (proposalId: number, lower: number, upper: number, power: number): Promise<boolean> => {
        if (!session?.user.address) {
            // Call the showSnackbar function from the context
            showSnackbar('Please connect your wallet first', 'warning');
            return false;
        }
        const userAddress = session.user.address;
        const voteKey = `vote_${proposalId}`;
        setLoading(voteKey, true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const success = Math.random() > 0.1;

            if (success) {
                 console.log(`Simulated vote on ${proposalId} by ${userAddress} with range [${lower}, ${upper}] power ${power}`);
                 // Call the showSnackbar function from the context
                 showSnackbar(`Successfully voted on proposal #${proposalId} (Simulated)`, 'success');
                 return true;
            } else {
                 // Call the showSnackbar function from the context
                 showSnackbar(`Vote on proposal #${proposalId} failed (Simulated Error)`, 'error');
                 throw new Error('Simulated vote failure');
            }
        } catch (error: any) {
            console.error(`Vote operation failed for proposal ${proposalId}:`, error.message);
            // Snackbar already shown
             return false;
        } finally {
            setLoading(voteKey, false);
        }
    }, [session, setLoading, showSnackbar]); // Dependency is the function from the context hook

    const handleDelegate = useCallback(async (targetAddress: string, amount: number): Promise<boolean> => {
        if (!session?.user.address) {
            // Call the showSnackbar function from the context
            showSnackbar('Please connect your wallet first', 'warning');
            return false;
        }
        const userAddress = session.user.address;
        const delegateKey = 'delegateVotes';
        setLoading(delegateKey, true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1200));
            const success = Math.random() > 0.1;

            if (success) {
                console.log(`Simulated delegation of ${amount} vDPP to ${targetAddress} by ${userAddress}`);
                // Call the showSnackbar function from the context
                showSnackbar(`Successfully delegated ${formatBalance(amount, 2)} vDPP to ${shortenAddress(targetAddress)} (Simulated)`, 'success');
                return true;
            } else {
                // Call the showSnackbar function from the context
                showSnackbar('Delegation Failed (Simulated Error)', 'error');
                throw new Error('Simulated delegation failure');
            }
        } catch (error: any) {
             console.error(`Delegation failed:`, error.message);
             // Snackbar already shown
             return false;
        } finally {
            setLoading(delegateKey, false);
        }
    }, [session, setLoading, showSnackbar]); // Dependency is the function from the context hook

    return { handleVoteWithRange, handleDelegate };
};