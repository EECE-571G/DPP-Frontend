import { useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { formatBalance } from '../utils/formatters';
import { MOCK_TOKEN_PRICES } from '../utils/mockData'; // For simulation

export const useLiquidityActions = () => {
    const { session } = useAuthContext();
    const { userBalances, updateBalance } = useBalancesContext(); // Need userBalances for remove check
    const { setLoading } = useLoadingContext();
    // Use the context hook to get the showSnackbar function
    const { showSnackbar } = useSnackbarContext();

    const handleAddLiquidity = useCallback(async (tokenA: string, tokenB: string, amountA: number, amountB: number): Promise<boolean> => {
        if (!session?.user.address) {
            // Call the showSnackbar function from the context
            showSnackbar('Please connect your wallet first', 'warning');
            return false;
        }
        setLoading('addLiquidity', true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const success = Math.random() > 0.05;

            if (success) {
                const lpTokenSymbol = `LP-${tokenA}/${tokenB}`;
                const newLpAmount = Math.sqrt(amountA * amountB) * 0.1; // Example calc
                const valueA = (MOCK_TOKEN_PRICES[tokenA] || 0) * amountA;
                const valueB = (MOCK_TOKEN_PRICES[tokenB] || 0) * amountB;
                const simulatedReward = (valueA + valueB) * 0.005; // Example reward

                // Update balances via context
                updateBalance(tokenA, -amountA);
                updateBalance(tokenB, -amountB);
                updateBalance(lpTokenSymbol, newLpAmount);
                updateBalance('vDPP', simulatedReward); // Assuming vDPP is tracked

                // Call the showSnackbar function from the context
                showSnackbar(`Added liquidity. Received ~${formatBalance(newLpAmount, 6)} LP & ${formatBalance(simulatedReward, 2)} vDPP (Simulated).`, 'success');
                return true;
            } else {
                // Call the showSnackbar function from the context
                showSnackbar('Add liquidity failed (Simulated Error)', 'error');
                 throw new Error('Simulated add liquidity failure');
            }
        } catch (error: any) {
             console.error("Add Liquidity Error:", error);
             // Snackbar already shown
             return false;
        }
        finally {
            setLoading('addLiquidity', false);
        }
    }, [session, updateBalance, setLoading, showSnackbar]); // Dependency is the function from the context hook

    const handleRemoveLiquidity = useCallback(async (tokenA: string, tokenB: string, lpAmount: number): Promise<boolean> => {
        if (!session?.user.address) {
            // Call the showSnackbar function from the context
            showSnackbar('Please connect your wallet first', 'warning');
            return false;
        }

        const lpTokenSymbol = `LP-${tokenA}/${tokenB}`;
        const currentLp = userBalances[lpTokenSymbol] ?? 0;

        if (lpAmount > currentLp) {
            // Call the showSnackbar function from the context
            showSnackbar('Cannot remove more LP tokens than you own', 'error');
            return false; // Return early
        }

        setLoading('removeLiquidity', true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const success = Math.random() > 0.05; // Simulate success

            if (success) {
                 // ** SIMULATION of getting tokens back **
                 const estimatedValuePerLp = 10; // Fake value
                 const totalValueToRemove = lpAmount * estimatedValuePerLp;
                 const valueOfA = totalValueToRemove / 2;
                 const valueOfB = totalValueToRemove / 2;
                 const amountA_returned = valueOfA / (MOCK_TOKEN_PRICES[tokenA] || 1);
                 const amountB_returned = valueOfB / (MOCK_TOKEN_PRICES[tokenB] || 1);
                 // ** END SIMULATION **

                // Update balances via context
                updateBalance(lpTokenSymbol, -lpAmount);
                updateBalance(tokenA, amountA_returned);
                updateBalance(tokenB, amountB_returned);

                // Call the showSnackbar function from the context
                showSnackbar(`Removed ${formatBalance(lpAmount, 6)} LP. Received ~${formatBalance(amountA_returned, 4)} ${tokenA} & ${formatBalance(amountB_returned, 4)} ${tokenB} (Simulated).`, 'success');
                 return true;
            } else {
                // Call the showSnackbar function from the context
                showSnackbar('Remove liquidity failed (Simulated Error)', 'error');
                 throw new Error('Simulated remove liquidity failure');
            }

        } catch (error: any) {
            console.error("Remove Liquidity Error:", error);
            // Snackbar already shown
            return false;
        }
         finally {
            setLoading('removeLiquidity', false);
        }
    }, [session, userBalances, updateBalance, setLoading, showSnackbar]); // Dependency is the function from the context hook

    return { handleAddLiquidity, handleRemoveLiquidity };
};