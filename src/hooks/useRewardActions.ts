// src/hooks/useRewardActions.ts
import { useCallback } from 'react';
import { ethers, ZeroAddress, isAddress, Contract, formatUnits } from 'ethers';
import { useAuthContext } from '../contexts/AuthContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { usePoolsContext } from '../contexts/PoolsContext';
import { useTimeContext } from '../contexts/TimeContext'; // <<< IMPORT TimeContext
import {
    DESIRED_PRICE_POOL_HOOK_ADDRESS,
    EXPLORER_URL_BASE,
    TARGET_NETWORK_CHAIN_ID,
} from '../constants';
import HookRewardABI from '../abis/IHookReward.json';

// Define the lock period in seconds (matching the contract if possible)
const REWARD_LOCK_PERIOD_S = 1 * 24 * 60 * 60; // 1 day in seconds

export const useRewardActions = () => {
    const { signer, account, network } = useAuthContext();
    const { fetchBalances, tokenDecimals } = useBalancesContext();
    const { setLoading } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();
    const { selectedPool } = usePoolsContext();
    const { simulatedTimestamp } = useTimeContext(); // <<< Get simulated timestamp

    // --- Calculate Rewards ---
    // <<< Modify return type to include earnedTimestamp >>>
    const handleCalculateReward = useCallback(async (positionIdStr: string): Promise<{ amount0: string; amount1: string; earnedTimestamp: number } | null> => {
        // <<< Get current simulated time for timestamping >>>
        const currentSimulatedTime = simulatedTimestamp ?? Math.floor(Date.now() / 1000);

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
            const rewardContract = new Contract(DESIRED_PRICE_POOL_HOOK_ADDRESS, HookRewardABI, signer);
            console.log(`Statically calling calculateReward for position ID: ${positionIdStr}`);
            const result = await rewardContract.calculateReward.staticCall(positionId);
            const [amount0Raw, amount1Raw]: [bigint, bigint] = result;

            const decimals0 = tokenDecimals[selectedPool.tokenA_Address ?? ''] ?? 18;
            const decimals1 = tokenDecimals[selectedPool.tokenB_Address ?? ''] ?? 18;

            const amount0Formatted = formatUnits(amount0Raw, decimals0);
            const amount1Formatted = formatUnits(amount1Raw, decimals1);

            console.log(`Calculated Rewards: ${amount0Formatted} TKA, ${amount1Formatted} TKB`);

            // <<< Return the timestamp along with amounts >>>
            return {
                amount0: amount0Formatted,
                amount1: amount1Formatted,
                earnedTimestamp: currentSimulatedTime // Use the timestamp from calculation time
            };

        } catch (error: any) {
            console.error(`Calculate Reward Error for token ${positionIdStr}:`, error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Calculation failed.";
            showSnackbar(`Reward calculation failed: ${reason}`, 'error');
            return null;
        } finally {
            setLoading(loadingKey, false);
        }
        // <<< Add simulatedTimestamp to dependency array >>>
    }, [signer, account, network, selectedPool, tokenDecimals, setLoading, showSnackbar, simulatedTimestamp]);

    // --- Collect Rewards ---
    const handleCollectReward = useCallback(async (
        positionIdStr: string,
        // <<< Pass the earnedTimestamp associated with the displayed reward >>>
        earnedTimestamp: number | null
    ): Promise<boolean> => {
        // <<< Get current simulated time for the check >>>
        const currentSimulatedTime = simulatedTimestamp ?? Math.floor(Date.now() / 1000);

        if (!signer || !account || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot collect rewards: Wallet/Network issue.', 'error');
            return false;
        }
        if (DESIRED_PRICE_POOL_HOOK_ADDRESS === ZeroAddress) {
            showSnackbar("Reward contract address not configured.", "error");
            return false;
        }
        // <<< Check if we have an earned timestamp to compare against >>>
        if (earnedTimestamp === null) {
             showSnackbar('Cannot collect: Calculate rewards first to determine lock period.', 'warning');
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

        // --- Time Lock Check ---
        const unlockTime = earnedTimestamp + REWARD_LOCK_PERIOD_S;
        if (currentSimulatedTime < unlockTime) {
            const timeLeft = unlockTime - currentSimulatedTime;
            showSnackbar(`Cannot collect yet. Rewards locked for approx. ${formatDuration(timeLeft)}`, 'warning');
            console.log(`Collect check failed: currentTime=${currentSimulatedTime}, unlockTime=${unlockTime}`);
            return false;
        }
        // ----------------------

        const loadingKey = `collectReward_${positionIdStr}`;
        setLoading(loadingKey, true);

        try {
            const rewardContract = new Contract(DESIRED_PRICE_POOL_HOOK_ADDRESS, HookRewardABI, signer);

            console.log(`Collecting rewards for position ID: ${positionIdStr} to recipient: ${account}`);
            const tx = await rewardContract.collectReward(positionId, account); // recipient is the connected account

            let message = `Collect Rewards tx submitted for token ${positionIdStr}`;
            if (EXPLORER_URL_BASE) { message += `. Waiting...`; } else { message += `: ${tx.hash}. Waiting...`; }
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
            return false;
        } finally {
            setLoading(loadingKey, false);
        }
        // <<< Add simulatedTimestamp to dependency array >>>
    }, [signer, account, network, fetchBalances, setLoading, showSnackbar, simulatedTimestamp]);

    return { handleCalculateReward, handleCollectReward };
};

// Helper function (can be moved to formatters.ts if used elsewhere)
const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return "now";
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${Math.floor(seconds % 60)}s`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${Math.floor(minutes % 60)}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${Math.floor(hours % 24)}h`;
};