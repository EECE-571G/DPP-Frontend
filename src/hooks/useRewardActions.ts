// frontend/src/hooks/useRewardActions.ts
// --- NEW FILE ---
import { useCallback } from 'react';
import { ethers, ZeroAddress, isAddress, Contract, formatUnits } from 'ethers';
import { useAuthContext } from '../contexts/AuthContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { usePoolsContext } from '../contexts/PoolsContext';
import {
    DESIRED_PRICE_POOL_HOOK_ADDRESS, // The contract implementing IHookReward
    EXPLORER_URL_BASE,
    TARGET_NETWORK_CHAIN_ID,
} from '../constants';
// ABI for the contract implementing IHookReward (likely your DesiredPricePool hook)
import HookRewardABI from '../abis/IHookReward.json'; // Adjust if your ABI file is named differently

export const useRewardActions = () => {
    const { signer, account, network } = useAuthContext();
    const { fetchBalances, tokenDecimals } = useBalancesContext(); // Need decimals for formatting
    const { setLoading } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();
    const { selectedPool } = usePoolsContext(); // Need for token info

    // --- Calculate Rewards ---
    const handleCalculateReward = useCallback(async (positionIdStr: string): Promise<{ amount0: string; amount1: string } | null> => {
        // Use signer as it implies connection and account, and matches collect's requirement
        if (!signer || !account || !selectedPool || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot calculate rewards: Wallet/Pool/Network issue.', 'error');
            return null;
        }
        if (DESIRED_PRICE_POOL_HOOK_ADDRESS === ZeroAddress) {
            showSnackbar("Reward contract address not configured.", "error");
            return null;
        }

        let positionId: bigint;
        try {
            positionId = BigInt(positionIdStr);
            if (positionId <= 0n) throw new Error("Invalid Token ID");
        } catch (e) {
            showSnackbar('Invalid Position Token ID entered.', 'error');
            return null;
        }

        const loadingKey = `calculateReward_${positionIdStr}`;
        setLoading(loadingKey, true);

        try {
            const rewardContract = new Contract(DESIRED_PRICE_POOL_HOOK_ADDRESS, HookRewardABI, signer); // Use signer

            console.log(`Statically calling calculateReward for position ID: ${positionIdStr}`);
            // Call the calculateReward function that only takes positionId
            // Note: This might trigger state changes if the contract function is not view/pure
            // Use staticCall to get return values without sending a transaction
            const result = await rewardContract.calculateReward.staticCall(positionId);
            const [amount0Raw, amount1Raw]: [bigint, bigint] = result;
            
            const decimals0 = tokenDecimals[selectedPool.tokenA_Address ?? ''] ?? 18;
            const decimals1 = tokenDecimals[selectedPool.tokenB_Address ?? ''] ?? 18;

            const amount0Formatted = formatUnits(amount0Raw, decimals0);
            const amount1Formatted = formatUnits(amount1Raw, decimals1);

            console.log(`Calculated Rewards: ${amount0Formatted} TKA, ${amount1Formatted} TKB`);
            // Optional: Show a success snackbar if needed, or just return data
            // showSnackbar('Rewards calculated successfully.', 'success');

            return { amount0: amount0Formatted, amount1: amount1Formatted };

        } catch (error: any) {
            console.error(`Calculate Reward Error for token ${positionIdStr}:`, error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Calculation failed.";
            showSnackbar(`Reward calculation failed: ${reason}`, 'error');
            return null; // Indicate failure
        } finally {
            setLoading(loadingKey, false);
        }
    }, [signer, account, network, selectedPool, tokenDecimals, setLoading, showSnackbar]);

    // --- Collect Rewards ---
    const handleCollectReward = useCallback(async (positionIdStr: string): Promise<boolean> => {
        if (!signer || !account || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot collect rewards: Wallet/Network issue.', 'error');
            return false;
        }
        if (DESIRED_PRICE_POOL_HOOK_ADDRESS === ZeroAddress) {
            showSnackbar("Reward contract address not configured.", "error");
            return false;
        }

        let positionId: bigint;
        try {
            positionId = BigInt(positionIdStr);
             if (positionId <= 0n) throw new Error("Invalid Token ID");
        } catch (e) {
            showSnackbar('Invalid Position Token ID entered.', 'error');
            return false;
        }

        const loadingKey = `collectReward_${positionIdStr}`;
        setLoading(loadingKey, true);

        try {
            const rewardContract = new Contract(DESIRED_PRICE_POOL_HOOK_ADDRESS, HookRewardABI, signer);

            console.log(`Collecting rewards for position ID: ${positionIdStr} to recipient: ${account}`);
            // Call the collectReward function
            const tx = await rewardContract.collectReward(positionId, account);

            let message = `Collect Rewards tx submitted for token ${positionIdStr}`;
            if (EXPLORER_URL_BASE) {
                message = `${message}. Waiting for confirmation...`;
            } else {
                message = `${message}: ${tx.hash}. Waiting...`;
            }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                showSnackbar('Rewards collected successfully!', 'success');
                await fetchBalances(); // Refresh token balances after collection
                return true;
            } else {
                throw new Error('Collect rewards transaction failed.');
            }

        } catch (error: any) {
            console.error(`Collect Reward Error for token ${positionIdStr}:`, error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Collection failed.";
            showSnackbar(`Reward collection failed: ${reason}`, 'error');
            return false; // Indicate failure
        } finally {
            setLoading(loadingKey, false);
        }
    }, [signer, account, network, fetchBalances, setLoading, showSnackbar]); // Dependencies

    return { handleCalculateReward, handleCollectReward };
};