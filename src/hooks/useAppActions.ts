import { useCallback } from 'react';
import type { Session } from '../types';
import { formatBalance, shortenAddress } from '../utils/formatters';
import { MOCK_TOKEN_PRICES } from '../utils/mockData';

interface UseAppActionsProps {
    setLoading: (key: string, value: boolean) => void; // From useLoadingState
    showSnackbar: (message: string, severity?: any) => void; // From useSnackbar
    // These now come from useAuth hook result
    session: Session | null;
    userBalances: Record<string, number>;
    setUserBalances: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

// The hook's return type remains the same
export const useAppActions = ({
    setLoading,
    showSnackbar,
    session, // Receive from useAuth result
    userBalances, // Receive from useAuth result
    setUserBalances // Receive from useAuth result
}: UseAppActionsProps) => {

    // checkConnection depends on session passed in props
    const checkConnection = useCallback(() => {
        if (!session?.user.address) {
            showSnackbar('Please connect your wallet first', 'warning');
            return false;
        }
        return true;
    }, [session, showSnackbar]); // Dependency on session prop

    // handleVoteWithRange depends on checkConnection, setLoading, showSnackbar, session
    const handleVoteWithRange = useCallback(async (proposalId: number, lower: number, upper: number, power: number) => {
        if (!checkConnection()) return;
        const userAddress = session!.user.address; // Get address safely

        const voteKey = `vote_${proposalId}`;
        setLoading(voteKey, true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
            const success = Math.random() > 0.1; // 90% success rate
            if (success) {
                 console.log(`Simulated vote on ${proposalId} by ${userAddress} with range [${lower}, ${upper}] power ${power}`);
                 showSnackbar(`Successfully voted on proposal #${proposalId} (Simulated)`, 'success');
            } else {
                 showSnackbar(`Vote on proposal #${proposalId} failed (Simulated Error)`, 'error');
                 throw new Error('Simulated vote failure');
            }
        } catch (error: any) {
            console.error(`Vote operation failed for proposal ${proposalId}:`, error.message);
            // Snackbar already shown on failure case
        } finally {
            setLoading(voteKey, false);
        }
    }, [checkConnection, setLoading, showSnackbar, session]); // Added session dependency

    // handleDelegate depends on checkConnection, setLoading, showSnackbar, session
    const handleDelegate = useCallback(async (targetAddress: string, amount: number) => {
        if (!checkConnection()) throw new Error('User not connected'); // Throw error to stop execution in component
        const userAddress = session!.user.address; // Get address safely

        const delegateKey = 'delegateVotes';
        setLoading(delegateKey, true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1200));
            const success = Math.random() > 0.1;
            if (success) {
                console.log(`Simulated delegation of ${amount} vDPP to ${targetAddress} by ${userAddress}`);
                showSnackbar(`Successfully delegated ${formatBalance(amount, 2)} vDPP to ${shortenAddress(targetAddress)} (Simulated)`, 'success');
            } else {
                showSnackbar('Delegation Failed (Simulated Error)', 'error');
                throw new Error('Simulated delegation failure');
            }
        } finally {
            setLoading(delegateKey, false);
        }
    }, [checkConnection, setLoading, showSnackbar, session]); // Added session dependency

    // handleSwap depends on checkConnection, setLoading, showSnackbar, setUserBalances
    const handleSwap = useCallback(async (sellToken: string, buyToken: string, sellAmount: number, expectedBuyAmount: number) => {
         if (!checkConnection()) return; // Early exit if not connected

        setLoading('swap', true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const success = Math.random() > 0.05;
        if (success) {
            // Use setUserBalances from props
            setUserBalances(prev => ({
                ...prev,
                [sellToken]: (prev[sellToken] ?? 0) - sellAmount,
                [buyToken]: (prev[buyToken] ?? 0) + expectedBuyAmount,
            }));
            showSnackbar(`Swapped ${formatBalance(sellAmount, 4)} ${sellToken} for ${formatBalance(expectedBuyAmount, 4)} ${buyToken}`, 'success');
        } else {
            showSnackbar('Swap failed (Simulated Error - Price Moved?)', 'error');
        }
        setLoading('swap', false);

    }, [checkConnection, setLoading, showSnackbar, setUserBalances]); // Use prop setUserBalances

    const handleAddLiquidity = useCallback(async (tokenA: string, tokenB: string, amountA: number, amountB: number) => {
        if (!checkConnection()) return;

        setLoading('addLiquidity', true);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const success = Math.random() > 0.05;
        if (success) {
            const lpTokenSymbol = `LP-${tokenA}/${tokenB}`;
            const newLpAmount = Math.sqrt(amountA * amountB) * 0.1; // Example calc
            const valueA = (MOCK_TOKEN_PRICES[tokenA] || 0) * amountA;
            const valueB = (MOCK_TOKEN_PRICES[tokenB] || 0) * amountB;
            const simulatedReward = (valueA + valueB) * 0.005; // Example reward

            // Use setUserBalances from props
            setUserBalances(prev => ({
                ...prev,
                [tokenA]: (prev[tokenA] ?? 0) - amountA,
                [tokenB]: (prev[tokenB] ?? 0) - amountB,
                [lpTokenSymbol]: (prev[lpTokenSymbol] ?? 0) + newLpAmount,
                vDPP: (prev.vDPP ?? 0) + simulatedReward
            }));
            showSnackbar(`Added liquidity. Received ~${formatBalance(newLpAmount, 6)} LP & ${formatBalance(simulatedReward, 2)} vDPP (Simulated).`, 'success');
        } else {
            showSnackbar('Add liquidity failed (Simulated Error)', 'error');
        }
        setLoading('addLiquidity', false);
    }, [checkConnection, setLoading, showSnackbar, setUserBalances]); // Use prop setUserBalances

    const handleRemoveLiquidity = useCallback(async (tokenA: string, tokenB: string, lpAmount: number) => {
        if (!checkConnection()) return;

        setLoading('removeLiquidity', true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const lpTokenSymbol = `LP-${tokenA}/${tokenB}`;
        // Use userBalances from props
        const currentLp = userBalances[lpTokenSymbol] ?? 0;

        if (lpAmount > currentLp) {
            showSnackbar('Cannot remove more LP tokens than you own (Simulated Check)', 'error');
            setLoading('removeLiquidity', false);
            return;
        }

        // ** SIMULATION of getting tokens back **
        const estimatedValuePerLp = 10; // Fake value
        const totalValueToRemove = lpAmount * estimatedValuePerLp;
        const valueOfA = totalValueToRemove / 2;
        const valueOfB = totalValueToRemove / 2;
        const amountA_returned = valueOfA / (MOCK_TOKEN_PRICES[tokenA] || 1);
        const amountB_returned = valueOfB / (MOCK_TOKEN_PRICES[tokenB] || 1);
        // ** END SIMULATION **

         // Use setUserBalances from props
         setUserBalances(prev => ({
             ...prev,
             [lpTokenSymbol]: Math.max(0, currentLp - lpAmount),
             [tokenA]: (prev[tokenA] ?? 0) + amountA_returned,
             [tokenB]: (prev[tokenB] ?? 0) + amountB_returned,
         }));

        showSnackbar(`Removed ${formatBalance(lpAmount, 6)} LP. Received ~${formatBalance(amountA_returned, 4)} ${tokenA} & ${formatBalance(amountB_returned, 4)} ${tokenB} (Simulated).`, 'success');
        setLoading('removeLiquidity', false);
    }, [checkConnection, userBalances, setLoading, showSnackbar, setUserBalances]); // Use props userBalances, setUserBalances


    return {
        handleVoteWithRange,
        handleDelegate,
        handleSwap,
        handleAddLiquidity,
        handleRemoveLiquidity,
    };
};