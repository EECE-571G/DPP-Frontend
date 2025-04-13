// src/hooks/useSwapActions.ts
import { useCallback } from 'react';
import { ethers, parseUnits, MaxUint256, Contract, ZeroAddress } from 'ethers'; // Added ZeroAddress
import { useAuthContext } from '../contexts/AuthContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { usePoolsContext } from '../contexts/PoolsContext';
import {
    POOL_MANAGER_ADDRESS,
    EXPLORER_URL_BASE,
    TARGET_NETWORK_CHAIN_ID,
} from '../constants';
import PoolManagerABI from '../abis/IPoolManager.json';
import Erc20ABI from '../abis/ERC20.json';

export const useSwapActions = () => {
    const { signer, account, network } = useAuthContext();
    const { fetchBalances, tokenDecimals, tokenSymbols } = useBalancesContext();
    const { setLoading } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();
    const { selectedPool } = usePoolsContext();

    const checkAndRequestApproval = useCallback(async (tokenAddress: string, amountWei: bigint): Promise<boolean> => {
        if (!signer || !account || !tokenAddress || amountWei <= 0n) {
             console.error("Approval check prerequisites failed");
             return false;
        }
        if (POOL_MANAGER_ADDRESS === ZeroAddress) { // Use Ethers v6 ZeroAddress
             showSnackbar("Pool Manager address not configured for approval.", "error");
             return false;
        }
        try {
            const tokenContract = new Contract(tokenAddress, Erc20ABI, signer); // Use Ethers v6 Contract
            const currentAllowance = await tokenContract.allowance(account, POOL_MANAGER_ADDRESS);

            if (currentAllowance >= amountWei) {
                console.log(`Allowance sufficient for ${tokenAddress}`);
                return true;
            }

            const symbol = tokenSymbols[tokenAddress] ?? 'token';
            showSnackbar(`Approval required for ${symbol}. Please confirm in wallet.`, 'info');
            setLoading(`approve_${tokenAddress}`, true);

            const tx = await tokenContract.approve(POOL_MANAGER_ADDRESS, amountWei);

            let message = `Approval transaction submitted`;
            if (EXPLORER_URL_BASE) {
                 message = `${message}. Waiting...`;
            } else {
                 message = `${message}: ${tx.hash}. Waiting...`;
            }
             showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                showSnackbar('Approval successful!', 'success');
                return true;
            } else {
                throw new Error('Approval transaction failed.');
            }
        } catch (error: any) {
            console.error(`Approval failed for ${tokenAddress}:`, error);
            const message = error?.reason || error?.data?.message || error.message || "Approval failed.";
            showSnackbar(`Approval failed: ${message}`, 'error');
            return false;
        } finally {
             setLoading(`approve_${tokenAddress}`, false);
        }
    }, [signer, account, showSnackbar, setLoading, tokenSymbols]); // Dependencies

    const handleSwap = useCallback(async (sellTokenAddress: string, buyTokenAddress: string, sellAmount: number): Promise<boolean> => {
        if (!signer || !account || !selectedPool || !selectedPool.poolKey || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot swap: Wallet not connected, pool not selected, or wrong network.', 'error');
            return false;
        }
         if (sellAmount <= 0) {
              showSnackbar('Swap amount must be positive.', 'warning');
              return false;
         }
          if (POOL_MANAGER_ADDRESS === ZeroAddress) { // Use Ethers v6 ZeroAddress
             showSnackbar("Pool Manager address not configured for swap.", "error");
             return false;
         }

        // Destructure poolKey here to ensure it's defined
        const { poolKey } = selectedPool;
        const sellDecimals = tokenDecimals[sellTokenAddress] ?? 18;

        // --- Log the key right before use ---
        console.log("[useSwapActions] Pool Key Check:", JSON.stringify(poolKey));
        if (poolKey.fee === undefined || poolKey.fee === null) { // Explicit check for fee
            console.error("[useSwapActions] FATAL: poolKey.fee is missing or null before swap call!");
            showSnackbar("Internal error: Pool fee configuration missing.", "error");
            return false;
        }
        // --- End Log ---

        try {
            const amountInWei = parseUnits(sellAmount.toString(), sellDecimals); // Use Ethers v6 parseUnits

            const approved = await checkAndRequestApproval(sellTokenAddress, amountInWei);
            if (!approved) {
                return false;
            }

            setLoading('swap', true);
            showSnackbar('Preparing swap transaction...', 'info');

            const zeroForOne = sellTokenAddress.toLowerCase() === poolKey.currency0.toLowerCase();
            const swapParams = {
                zeroForOne: zeroForOne,
                amountSpecified: amountInWei,
                sqrtPriceLimitX96: zeroForOne
                    ? 4295128739n + 1n // TickMath.MIN_SQRT_RATIO + 1 (Example)
                    : 79228162514264337593543950335n - 1n, // TickMath.MAX_SQRT_RATIO - 1 (Example)
            };
            const hookData = '0x';
            const poolManager = new Contract(POOL_MANAGER_ADDRESS, PoolManagerABI, signer); // Use Ethers v6 Contract

            console.log("[useSwapActions] Submitting swap tx with key:", poolKey, "params:", swapParams);
            const tx = await poolManager.swap(poolKey, swapParams, hookData);

            let message = `Swap transaction submitted`;
             if (EXPLORER_URL_BASE) {
                 message = `${message}. Waiting for confirmation...`;
             } else {
                 message = `${message}: ${tx.hash}. Waiting...`;
             }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                 let successMessage = 'Swap successful!';
                 showSnackbar(successMessage, 'success');
                await fetchBalances();
                return true;
            } else {
                throw new Error('Swap transaction failed (receipt status 0).');
            }

        } catch (error: any) {
            // Log the specific error received from ethers
            console.error("[useSwapActions] Swap Error Details:", error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Swap failed.";
            showSnackbar(`Swap failed: ${reason}`, 'error');
            return false;
        } finally {
            setLoading('swap', false);
        }
    }, [signer, account, network, selectedPool, tokenDecimals, checkAndRequestApproval, fetchBalances, setLoading, showSnackbar]); // Dependencies

    return { handleSwap, checkAndRequestApproval };
};