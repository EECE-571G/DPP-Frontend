// src/hooks/useLiquidityActions.ts
import { useCallback } from 'react';
import { ethers, parseUnits, MaxUint256, ZeroAddress, isAddress, Contract, AbiCoder } from 'ethers';
import { useAuthContext } from '../contexts/AuthContext';
import { useBalancesContext } from '../contexts/BalancesContext';
import { useLoadingContext } from '../contexts/LoadingContext';
import { useSnackbarContext } from '../contexts/SnackbarProvider';
import { usePoolsContext } from '../contexts/PoolsContext';
import {
    POSITION_MANAGER_ADDRESS, // No longer needed directly
    DESIRED_PRICE_POOL_HELPER_ADDRESS, // <<< Use Helper Address
    EXPLORER_URL_BASE,
    TARGET_NETWORK_CHAIN_ID,
} from '../constants';
// ABIs
// import PositionManagerABI from '../abis/PositionManager.json'; // No longer needed
import DesiredPricePoolHelperABI from '../abis/DesiredPricePoolHelper.json'; // <<< Use Helper ABI
import Erc20ABI from '../abis/ERC20.json';

// Local storage keys
const LS_TOKEN_ID = 'liquidity_tokenId';

export const useLiquidityActions = () => {
    const { signer, account, network } = useAuthContext();
    const { fetchBalances, tokenDecimals, tokenSymbols } = useBalancesContext();
    const { setLoading } = useLoadingContext();
    const { showSnackbar } = useSnackbarContext();
    const { selectedPool } = usePoolsContext();

    // Approval check - approves the HELPER contract
     const checkAndRequestApproval = useCallback(async (tokenAddress: string): Promise<boolean> => {
        if (!signer || !account || !tokenAddress || tokenAddress === ZeroAddress) {
            console.error("Approval check prerequisites failed");
            return false;
        }
         if (DESIRED_PRICE_POOL_HELPER_ADDRESS === ZeroAddress) {
             showSnackbar("Helper contract address not configured for approval.", "error");
             return false;
         }
         try {
             const tokenContract = new Contract(tokenAddress, Erc20ABI, signer);
             // Check allowance for the HELPER contract
             const currentAllowance = await tokenContract.allowance(account, DESIRED_PRICE_POOL_HELPER_ADDRESS);

             // Request MaxUint256 for simplicity, as helper handles interactions
             if (currentAllowance < (MaxUint256 / 2n)) { // Check if allowance is effectively less than max
                const symbol = tokenSymbols[tokenAddress] ?? 'token';
                showSnackbar(`Max approval required for ${symbol} by Helper Contract. Please confirm.`, 'info');
                const loadingKey = `approve_liq_${tokenAddress}`;
                setLoading(loadingKey, true);

                 const tx = await tokenContract.approve(DESIRED_PRICE_POOL_HELPER_ADDRESS, MaxUint256); // Approve helper
                 let message = `Approval transaction submitted`;
                 if (EXPLORER_URL_BASE) { message += `. Waiting...`; } else { message += `: ${tx.hash}. Waiting...`; }
                 showSnackbar(message, 'info');
                 const receipt = await tx.wait(1);
                 setLoading(loadingKey, false);
                 if (receipt?.status !== 1) throw new Error('Approval transaction failed.');
                 showSnackbar('Approval successful!', 'success');
             } else {
                console.log(`Allowance sufficient for ${tokenAddress} by helper ${DESIRED_PRICE_POOL_HELPER_ADDRESS}`);
             }
             return true;
         } catch (error: any) {
             console.error(`Approval failed for ${tokenAddress}:`, error);
             const message = error?.reason || error?.data?.message || error.message || "Approval failed.";
             showSnackbar(`Approval failed: ${message}`, 'error');
             setLoading(`approve_liq_${tokenAddress}`, false);
             return false;
         }
     }, [signer, account, tokenSymbols, showSnackbar, setLoading]);


    // --- Mint New Position ---
    const handleMintPosition = useCallback(async (lowerTick: number, upperTick: number, liquidityStr: string): Promise<boolean> => {
        if (!signer || !account || !selectedPool?.poolKey || !selectedPool.tokenA_Address || !selectedPool.tokenB_Address || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot mint: Wallet/Pool/Network issue.', 'error'); return false;
        }
         if (DESIRED_PRICE_POOL_HELPER_ADDRESS === ZeroAddress) {
             showSnackbar("Helper contract address not configured.", "error"); return false;
         }
        if (lowerTick >= upperTick) {
            showSnackbar("Lower tick must be less than upper tick.", "warning"); return false;
        }
        // Validate ticks against absolute min/max if needed
        // if (lowerTick < MIN_TICK || upperTick > MAX_TICK) { ... }

        let liquidityWei: bigint;
        try {
            liquidityWei = parseUnits(liquidityStr, 0); // Liquidity is uint256 in helper's mint
            if (liquidityWei <= 0n) {
                showSnackbar('Liquidity amount must be positive.', 'warning'); return false;
            }
        } catch (e: any) {
            showSnackbar(`Invalid liquidity amount entered: ${e.message}`, 'error'); return false;
        }

        const { poolKey, tokenA_Address, tokenB_Address } = selectedPool;
        // Estimate required amounts (rough - real calculation needs pool state)
        // For now, request approval for both tokens
        const amount0MaxPlaceholder = MaxUint256; // Use MaxUint256 or a very large number
        const amount1MaxPlaceholder = MaxUint256;

        try {
            setLoading('mintPosition_approve', true);
             // Approve helper for both tokens only if they are ERC20
             const approvedA = tokenA_Address === ZeroAddress ? true : await checkAndRequestApproval(tokenA_Address);
             const approvedB = tokenB_Address === ZeroAddress ? true : await checkAndRequestApproval(tokenB_Address);
            setLoading('mintPosition_approve', false);
             if (!approvedA || !approvedB) {
                 showSnackbar('One or more approvals failed or were rejected.', 'error');
                 return false;
             }

            setLoading('mintPosition', true);
            showSnackbar('Preparing mint position transaction...', 'info');

            const helperContract = new Contract(DESIRED_PRICE_POOL_HELPER_ADDRESS, DesiredPricePoolHelperABI, signer);

            // Determine ETH value if tokenA is ZeroAddress
            let txValue = 0n;
            // The helper's _receive logic expects msg.value IF currency0 is ETH
            if (poolKey.currency0 === ZeroAddress) {
                // We don't know the exact amount needed, so this is tricky.
                // The helper will refund excess, but we need to send *enough*.
                // A better approach would involve simulating the mint via static call first.
                // For now, let's skip sending ETH value directly in mint as it's complex without simulation.
                // Users should wrap ETH first if needed.
                console.warn("Minting with ETH directly via helper is complex without amount estimation. Please wrap ETH first.");
                // txValue = parseUnits("1", 18); // Example: Send 1 ETH - VERY UNSAFE without estimation
            }


            console.log(`[useLiquidityActions] Calling helper.mint: key=${JSON.stringify(poolKey)}, lower=${lowerTick}, upper=${upperTick}, liq=${liquidityWei.toString()}`);

            // Call the helper's mint function
            const tx = await helperContract.mint(
                poolKey,
                lowerTick,
                upperTick,
                liquidityWei,
                amount0MaxPlaceholder, // Let helper calculate amounts
                amount1MaxPlaceholder,
                { value: txValue } // Send ETH if needed (currently disabled)
            );


            let message = `Mint Position tx submitted`;
             if (EXPLORER_URL_BASE) { message += `. Waiting...`; } else { message += `: ${tx.hash}. Waiting...`; }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                let mintedTokenId = "Unknown";
                 const erc721Interface = new ethers.Interface([ "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)" ]);
                 if (receipt.logs) {
                    for (const log of receipt.logs) {
                         try {
                             // IMPORTANT: The NFT transfer event comes from the POSITION MANAGER, not the helper
                            if (log.address.toLowerCase() === POSITION_MANAGER_ADDRESS.toLowerCase()) {
                                const parsedLog = erc721Interface.parseLog(log);
                                if (parsedLog && parsedLog.name === "Transfer" && parsedLog.args.from === ZeroAddress) {
                                    mintedTokenId = parsedLog.args.tokenId.toString();
                                    localStorage.setItem(LS_TOKEN_ID, mintedTokenId);
                                    console.log("Minted Token ID found and saved:", mintedTokenId);
                                    break;
                                }
                            }
                         } catch (parseError) { /* ignore */ }
                    }
                 }
                showSnackbar(`Position minted successfully! Token ID: ${mintedTokenId}`, 'success');
                await fetchBalances();
                return true;
            } else {
                throw new Error('Mint position transaction failed.');
            }

        } catch (error: any) {
            console.error("Mint Position Error:", error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Mint position failed.";
            showSnackbar(`Mint Position failed: ${reason}`, 'error');
            return false;
        } finally {
            setLoading('mintPosition', false);
            setLoading('mintPosition_approve', false);
        }
    }, [signer, account, network, selectedPool, checkAndRequestApproval, fetchBalances, setLoading, showSnackbar]);


    // --- Add Liquidity to Existing Position ---
    const handleAddLiquidity = useCallback(async (tokenIdStr: string, liquidityStr: string): Promise<boolean> => {
        // ... (initial checks remain the same) ...
         if (!signer || !account || !selectedPool?.poolKey || !selectedPool.tokenA_Address || !selectedPool.tokenB_Address || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot add liquidity: Wallet/Pool/Network issue.', 'error'); return false;
        }
         if (DESIRED_PRICE_POOL_HELPER_ADDRESS === ZeroAddress) {
             showSnackbar("Helper contract address not configured.", "error"); return false;
         }

         let tokenId: bigint;
         let liquidityWei: bigint;
         try {
             tokenId = BigInt(tokenIdStr);
             if (tokenId <= 0n) throw new Error("Invalid Token ID");
             liquidityWei = parseUnits(liquidityStr, 0); // uint256
             if (liquidityWei <= 0n) {
                 showSnackbar('Liquidity amount must be positive.', 'warning'); return false;
             }
         } catch (e: any) {
              showSnackbar(`Invalid Token ID or Liquidity amount: ${e.message}`, 'error'); return false;
         }

         const { tokenA_Address, tokenB_Address, poolKey } = selectedPool;
          const amount0MaxPlaceholder = MaxUint256;
          const amount1MaxPlaceholder = MaxUint256;


        try {
            setLoading(`addLiquidity_approve_${tokenIdStr}`, true);
             const approvedA = tokenA_Address === ZeroAddress ? true : await checkAndRequestApproval(tokenA_Address);
             const approvedB = tokenB_Address === ZeroAddress ? true : await checkAndRequestApproval(tokenB_Address);
             setLoading(`addLiquidity_approve_${tokenIdStr}`, false);
             if (!approvedA || !approvedB) {
                 showSnackbar('One or more approvals failed or were rejected.', 'error');
                 return false;
             }

             setLoading(`addLiquidity_${tokenIdStr}`, true);
             showSnackbar(`Preparing to add liquidity to token ${tokenIdStr}...`, 'info');

             const helperContract = new Contract(DESIRED_PRICE_POOL_HELPER_ADDRESS, DesiredPricePoolHelperABI, signer);

            // Handle ETH value if needed
            let txValue = 0n;
             if (poolKey.currency0 === ZeroAddress) {
                 console.warn("Adding liquidity with ETH directly via helper is complex without amount estimation. Please wrap ETH first.");
                 // txValue = ...; // Needs estimation
             }

            console.log(`[useLiquidityActions] Calling helper.addLiquidity: tokenId=${tokenIdStr}, liq=${liquidityWei.toString()}`);

             const tx = await helperContract.addLiquidity(
                 tokenId,
                 liquidityWei,
                 amount0MaxPlaceholder,
                 amount1MaxPlaceholder,
                  { value: txValue } // Send ETH if needed (currently disabled)
             );

            // ... (rest of the transaction handling remains the same) ...
             let message = `Add Liquidity tx submitted for token ${tokenIdStr}`;
             if (EXPLORER_URL_BASE) { message += `. Waiting...`; } else { message += `: ${tx.hash}. Waiting...`; }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                showSnackbar(`Liquidity added successfully to token ${tokenIdStr}!`, 'success');
                await fetchBalances();
                return true;
            } else {
                throw new Error('Add liquidity transaction failed.');
            }

        } catch (error: any) {
             console.error(`Add Liquidity Error for token ${tokenIdStr}:`, error);
             const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Add liquidity failed.";
             showSnackbar(`Add Liquidity failed: ${reason}`, 'error');
             return false;
        } finally {
             setLoading(`addLiquidity_${tokenIdStr}`, false);
             setLoading(`addLiquidity_approve_${tokenIdStr}`, false);
        }
    }, [signer, account, network, selectedPool, checkAndRequestApproval, fetchBalances, setLoading, showSnackbar]);


    // --- Remove Liquidity from Existing Position ---
    const handleRemoveLiquidity = useCallback(async (tokenIdStr: string, liquidityStr: string): Promise<boolean> => {
         if (!signer || !account || network?.chainId !== TARGET_NETWORK_CHAIN_ID) {
            showSnackbar('Cannot remove liquidity: Wallet/Network issue.', 'error'); return false;
        }
         if (DESIRED_PRICE_POOL_HELPER_ADDRESS === ZeroAddress) {
             showSnackbar("Helper contract address not configured.", "error"); return false;
         }

         let tokenId: bigint;
         let liquidityWei: bigint;
         try {
             tokenId = BigInt(tokenIdStr);
             if (tokenId <= 0n) throw new Error("Invalid Token ID");
             liquidityWei = parseUnits(liquidityStr, 0); // uint256
             if (liquidityWei <= 0n) {
                 showSnackbar('Liquidity amount to remove must be positive.', 'warning'); return false;
             }
         } catch (e: any) {
              showSnackbar(`Invalid Token ID or Liquidity amount: ${e.message}`, 'error'); return false;
         }


       try {
            setLoading(`removeLiquidity_${tokenIdStr}`, true);
            showSnackbar(`Preparing to remove liquidity from token ${tokenIdStr}...`, 'info');

            const helperContract = new Contract(DESIRED_PRICE_POOL_HELPER_ADDRESS, DesiredPricePoolHelperABI, signer);
             const amount0MinPlaceholder = 0n; // Set minimums to 0 for basic removal
             const amount1MinPlaceholder = 0n;

             console.log(`[useLiquidityActions] Calling helper.removeLiquidity: tokenId=${tokenIdStr}, liq=${liquidityWei.toString()}`);

             const tx = await helperContract.removeLiquidity(
                 tokenId,
                 liquidityWei,
                 amount0MinPlaceholder,
                 amount1MinPlaceholder
             );

             let message = `Remove Liquidity tx submitted for token ${tokenIdStr}`;
             if (EXPLORER_URL_BASE) { message += `. Waiting...`; } else { message += `: ${tx.hash}. Waiting...`; }
            showSnackbar(message, 'info');

            const receipt = await tx.wait(1);

            if (receipt?.status === 1) {
                showSnackbar(`Liquidity removal initiated for token ${tokenIdStr}!`, 'success');
                await fetchBalances(); // Refresh token balances
                return true;
            } else {
                throw new Error('Remove liquidity transaction failed.');
            }

       } catch (error: any) {
            console.error(`Remove Liquidity Error for token ${tokenIdStr}:`, error);
            const reason = error?.reason || error?.data?.message?.replace('execution reverted: ', '') || error.message || "Remove liquidity failed.";
            showSnackbar(`Remove Liquidity failed: ${reason}`, 'error');
            return false;
       } finally {
            setLoading(`removeLiquidity_${tokenIdStr}`, false);
       }
    }, [signer, account, network, fetchBalances, setLoading, showSnackbar]);


    return { handleMintPosition, handleAddLiquidity, handleRemoveLiquidity };
};