// src/hooks/useSwapActions.ts
import { useCallback } from 'react';
import { parseUnits, MaxUint256, Contract, ZeroAddress } from 'ethers';
import { useAuthContext } from '../contexts/AuthContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { usePoolsContext } from '../contexts/PoolsContext';
import {
    DESIRED_PRICE_POOL_HELPER_ADDRESS,
    EXPLORER_URL_BASE,
    TARGET_NETWORK_CHAIN_ID,
} from '../constants';
import DesiredPricePoolHelperABI from '../abis/DesiredPricePoolHelper.json';
import Erc20ABI from '../abis/ERC20.json';

export const useSwapActions = () => {
    const { signer, account, network } = useAuthContext();
    const { fetchBalances, tokenDecimals, tokenSymbols } = useBalancesContext();
    const { setLoading } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();
    const { selectedPool } = usePoolsContext();

    // Approval check now needs to approve the HELPER contract
    const checkAndRequestApproval = useCallback(async (tokenAddress: string, amountWei: bigint): Promise<boolean> => {
         if (!signer || !account || !tokenAddress || amountWei <= 0n || tokenAddress === ZeroAddress) {
             console.error("Approval check prerequisites failed");
             showSnackbar("Approval failed: Missing wallet connection or token info.", "error");
             return false;
         }
         // Approve the HELPER contract to spend tokens
         if (DESIRED_PRICE_POOL_HELPER_ADDRESS === ZeroAddress) {
             showSnackbar("Helper contract address not configured for approval.", "error");
             return false;
         }
         try {
             const tokenContract = new Contract(tokenAddress, Erc20ABI, signer);
             // Check allowance for the HELPER contract
             const currentAllowance = await tokenContract.allowance(account, DESIRED_PRICE_POOL_HELPER_ADDRESS);

             if (currentAllowance >= amountWei) {
                 console.log(`Allowance sufficient for ${tokenAddress} by helper ${DESIRED_PRICE_POOL_HELPER_ADDRESS}`);
                 return true; // Already approved
             }

             const symbol = tokenSymbols[tokenAddress] ?? 'token';
             showSnackbar(`Approval required for ${symbol}. Please confirm in wallet.`, 'info');
             const loadingKey = `approve_swap_${tokenAddress}`; // More specific key
             setLoading(loadingKey, true);

             // Approve the HELPER to spend the required amount (or MaxUint256 for simplicity)
             // Using MaxUint256 reduces future approvals but grants max permission
             const tx = await tokenContract.approve(DESIRED_PRICE_POOL_HELPER_ADDRESS, MaxUint256); // Approve helper

             let message = `Approval transaction submitted`;
             if (EXPLORER_URL_BASE) {
                 message = `${message}. Waiting...`;
             } else {
                 message = `${message}: ${tx.hash}. Waiting...`;
             }
             showSnackbar(message, 'info');

             const receipt = await tx.wait(1);
             setLoading(loadingKey, false);

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
             setLoading(`approve_swap_${tokenAddress}`, false);
             return false;
         }
    }, [signer, account, showSnackbar, setLoading, tokenSymbols]);

    const handleSwap = useCallback(async (sellTokenAddress: string, buyTokenAddress: string, sellAmount: number): Promise<boolean> => {
        if (!signer || !account || !selectedPool?.poolKey || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot swap: Wallet not connected, pool not selected, or wrong network.', 'error');
            return false;
        }
        if (sellAmount <= 0) {
            showSnackbar('Swap amount must be positive.', 'warning'); return false;
        }
        // Use Helper Address check
        if (DESIRED_PRICE_POOL_HELPER_ADDRESS === ZeroAddress) {
            showSnackbar("Helper contract address not configured for swap.", "error"); return false;
        }

        const { poolKey } = selectedPool;
        const sellDecimals = tokenDecimals[sellTokenAddress] ?? 18;

        console.log("[useSwapActions] Using PoolKey for Swap:", JSON.stringify(poolKey));
         if (poolKey.fee === undefined || poolKey.fee === null || poolKey.tickSpacing === undefined || poolKey.tickSpacing === null) {
            showSnackbar("Internal error: Pool key is incomplete.", "error");
            return false;
        }

        try {
            const amountInWei = parseUnits(sellAmount.toString(), sellDecimals);

            // Approve the helper if it's an ERC20 token
            if (sellTokenAddress !== ZeroAddress) { // No approval needed for ETH
                const approved = await checkAndRequestApproval(sellTokenAddress, amountInWei);
                if (!approved) {
                    return false; // Stop if approval fails/rejected
                }
            }

            setLoading('swap', true);
            showSnackbar('Preparing swap transaction...', 'info');

            const helperContract = new Contract(DESIRED_PRICE_POOL_HELPER_ADDRESS, DesiredPricePoolHelperABI, signer);

            const zeroForOne = sellTokenAddress.toLowerCase() === poolKey.currency0.toLowerCase();

            console.log(`[useSwapActions] Calling helper.swapExactIn: zeroForOne=${zeroForOne}, amount=${amountInWei.toString()}`);

            // Determine if ETH is involved for msg.value
            let txValue = 0n;
            if (sellTokenAddress === ZeroAddress) {
                txValue = amountInWei;
                console.log(`[useSwapActions] Sending ETH value: ${txValue.toString()}`);
            }

            const tx = await helperContract.swapExactIn(
                poolKey,
                zeroForOne,
                amountInWei,
                { value: txValue }
            );

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
            console.error("[useSwapActions] Swap Error Details:", error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Swap failed.";
            showSnackbar(`Swap failed: ${reason}`, 'error');
            return false;
        } finally {
            setLoading('swap', false);
        }
    }, [signer, account, network, selectedPool, tokenDecimals, checkAndRequestApproval, fetchBalances, setLoading, showSnackbar]);

    // Return only handleSwap, approval is internal now
    return { handleSwap };
};