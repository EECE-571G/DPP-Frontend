import { useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { formatBalance } from '../utils/formatters';

export const useSwapActions = () => {
    const { session } = useAuthContext();
    const { updateBalance } = useBalancesContext();
    const { setLoading } = useLoadingContext();
    // Use the context hook to get the showSnackbar function
    const { showSnackbar } = useSnackbarContext();

    const handleSwap = useCallback(async (sellToken: string, buyToken: string, sellAmount: number, expectedBuyAmount: number): Promise<boolean> => {
        if (!session?.user.address) {
            // Call the showSnackbar function from the context
            showSnackbar('Please connect your wallet first', 'warning');
            return false;
        }

        setLoading('swap', true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
            const success = Math.random() > 0.05; // Simulate success/failure

            if (success) {
                // Update balances via context
                updateBalance(sellToken, -sellAmount);
                updateBalance(buyToken, expectedBuyAmount);
                // Call the showSnackbar function from the context
                showSnackbar(`Swapped ${formatBalance(sellAmount, 4)} ${sellToken} for ${formatBalance(expectedBuyAmount, 4)} ${buyToken}`, 'success');
                return true;
            } else {
                // Call the showSnackbar function from the context
                showSnackbar('Swap failed (Simulated Error - Price Moved?)', 'error');
                throw new Error('Simulated swap failure');
            }
        } catch (error: any) {
            console.error("Swap Error:", error);
            // Snackbar already shown in success/error cases above
            return false;
        } finally {
            setLoading('swap', false);
        }
    }, [session, updateBalance, setLoading, showSnackbar]); // Dependency is the function from the context hook

    return { handleSwap };
};