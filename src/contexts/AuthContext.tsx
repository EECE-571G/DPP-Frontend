// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  useEffect,
} from 'react';
import { BrowserProvider, Signer, Network, getAddress } from 'ethers';
import { Session, User } from '../types';
import { useSnackbarContext } from './SnackbarProvider';
import { TARGET_NETWORK_CHAIN_ID, TARGET_NETWORK_NAME } from '../constants';

// Define Authentication interface based on actual provided actions
export interface LiveAuthentication {
  switchAccount: (newAddress: string) => Promise<void>;
  // Add other auth-related actions if needed
}

interface AuthContextType {
  session: Session | null;
  provider: BrowserProvider | null;
  signer: Signer | null;
  account: string | null;
  network: Network | null;
  availableAccounts: string[] | null;
  isConnecting: boolean;
  authError: string | null;
  authentication: LiveAuthentication;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
      throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<string[] | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { showSnackbar } = useSnackbarContext();

  const clearState = () => {
      setProvider(null);
      setSigner(null);
      setAccount(null);
      setNetwork(null);
      setSession(null);
      setAvailableAccounts(null);
      setIsConnecting(false);
      // Keep authError separate, maybe cleared explicitly
      // setAuthError(null);
  };

  const clearError = () => setAuthError(null);

  // --- Wallet Connection Logic ---
  const connectWallet = useCallback(async (isSwitching = false) => {
      if (typeof window.ethereum === 'undefined') {
          setAuthError("MetaMask is not installed.");
          showSnackbar("MetaMask is not installed.", "error");
          return;
      }
      if (isConnecting) return;

      clearError();
      setIsConnecting(true);

      try {
          const web3Provider = provider ?? new BrowserProvider(window.ethereum, 'any');
          if (!provider) setProvider(web3Provider);

          const accounts = await web3Provider.send("eth_requestAccounts", []);
          if (!accounts || accounts.length === 0) {
              throw new Error("No accounts found or permission denied.");
          }
          const userAddress = getAddress(accounts[0]);

          // Get Signer and Network AFTER requesting accounts
          const signerInstance = await web3Provider.getSigner(userAddress);
          const currentNetwork = await web3Provider.getNetwork();

          setNetwork(currentNetwork);
          setAvailableAccounts(accounts.map((acc: string) => getAddress(acc))); // Use getAddress

          if (currentNetwork.chainId !== TARGET_NETWORK_CHAIN_ID) {
               // Set error but allow connection state to persist temporarily
               setAuthError(`Wrong Network! Please switch MetaMask to ${TARGET_NETWORK_NAME} (Chain ID: ${TARGET_NETWORK_CHAIN_ID}).`);
               showSnackbar(`Wrong Network! Switch to ${TARGET_NETWORK_NAME}`, 'error');
               // Set basic connected state even on wrong network
               setSigner(signerInstance);
               setAccount(userAddress);
               const user: User = { address: userAddress, name: `MetaMask (${userAddress})`};
               setSession({ user });
               // Do NOT proceed with actions requiring the correct network yet
          } else {
              // Network is correct, set full state
              setSigner(signerInstance);
              setAccount(userAddress);
              const user: User = {
                  address: userAddress,
                  name: `MetaMask (${userAddress})`,
              };
              setSession({ user });
              if (authError?.startsWith('Wrong Network')) clearError(); // Clear wrong network error

              if (!isSwitching) {
                 showSnackbar(`Wallet connected: ${userAddress}`, 'success');
              } else {
                  showSnackbar(`Switched to account: ${userAddress}`, 'info');
              }
              console.log("Wallet connected/switched successfully.");
          }

      } catch (err: any) {
          console.error("Wallet connection failed:", err);
          const errorMsg = err.code === 4001 ? "Connection request rejected." : (err.message || "Failed to connect wallet.");
          setAuthError(errorMsg);
          showSnackbar(errorMsg, "error");
          clearState();
      } finally {
          setIsConnecting(false);
      }
  }, [provider, isConnecting, showSnackbar, authError]); // Keep authError dependency

  // --- Network and Account Change Listeners ---
  useEffect(() => {
      const eth = window.ethereum;
      if (eth) {
          const handleChainChanged = (_chainId: string) => {
              console.log("Network changed to:", _chainId);
              // Update network state immediately for UI feedback
              const newChainId = BigInt(_chainId);
              setNetwork(prev => prev ? new Network(prev.name, newChainId) : new Network("Unknown", newChainId));

              if (newChainId !== TARGET_NETWORK_CHAIN_ID) {
                  setAuthError(`Wrong Network! Please switch to ${TARGET_NETWORK_NAME}.`);
                  showSnackbar(`Switched to wrong network. Please switch back to ${TARGET_NETWORK_NAME}.`, 'warning');
                  // Keep signer/account connected but flag the error
              } else {
                  if (authError?.startsWith('Wrong Network')) {
                      clearError(); // Clear error if switched back to correct network
                      showSnackbar(`Switched back to ${TARGET_NETWORK_NAME}.`, 'info');
                  }
                   // Re-fetch data if needed when switching back
                   // Consider triggering fetches in dependent contexts here or let their useEffect handle it
              }
              // Avoid clearing state completely on chain change, let user switch back.
              // clearState(); // Force reconnect by clearing state
          };

          const handleAccountsChanged = (accounts: string[]) => {
              console.log("Accounts changed:", accounts);
              if (accounts.length === 0) {
                  showSnackbar('Wallet disconnected or locked.', 'info');
                  clearState(); // Clear everything if disconnected
              } else if (account && getAddress(accounts[0]) !== account) {
                  // Account switched in MetaMask, re-run connect logic
                  connectWallet(true); // Pass switching flag
              } else if (!account && accounts.length > 0) {
                  // Connected from a fully disconnected state
                  connectWallet();
              }
          };

          eth.on('chainChanged', handleChainChanged);
          eth.on('accountsChanged', handleAccountsChanged);

          // Initial network check when provider becomes available
          if (provider) {
               provider.getNetwork().then(net => {
                   setNetwork(net);
                   if (net.chainId !== TARGET_NETWORK_CHAIN_ID) {
                       setAuthError(`Wrong Network! Please switch to ${TARGET_NETWORK_NAME}.`);
                   } else {
                        if (authError?.startsWith('Wrong Network')) clearError();
                   }
               }).catch(e => {
                   console.error("Initial network check failed:", e);
                   setAuthError("Could not verify network.");
               });
          }

          return () => {
              eth.removeListener('chainChanged', handleChainChanged);
              eth.removeListener('accountsChanged', handleAccountsChanged);
          };
      }
  }, [provider, account, connectWallet, authError, showSnackbar]); // Add authError and showSnackbar


  // --- Disconnect Wallet ---
  const disconnectWallet = useCallback(() => {
      showSnackbar('Wallet disconnected', 'info');
      clearState();
  }, [showSnackbar]);


  // --- Switch Account ---
  const switchAccount = useCallback(async (newAddress: string) => {
      if (!provider || !availableAccounts || !account) {
          showSnackbar('Cannot switch account: Wallet not fully connected.', 'warning');
          return;
      }
      if (getAddress(newAddress) === account) return; // No change needed

      if (availableAccounts.includes(getAddress(newAddress))) {
          console.log(`Attempting to switch to account via context: ${newAddress}`);
          // Re-trigger connection logic for the switched account
          await connectWallet(true);
      } else {
          const errorMsg = 'Account not available in connected wallet.';
          setAuthError(errorMsg);
          showSnackbar(errorMsg, 'error');
      }
  }, [provider, availableAccounts, account, connectWallet, showSnackbar]); // Use getAddress


  const authentication = useMemo(
      () => ({
          switchAccount,
      }),
      [switchAccount]
  );

  const contextValue = useMemo(
      () => ({
          session,
          provider,
          signer,
          account,
          network,
          availableAccounts,
          isConnecting,
          authError,
          authentication,
          connectWallet,
          disconnectWallet,
      }),
      [session, provider, signer, account, network, availableAccounts, isConnecting, authError, authentication, connectWallet, disconnectWallet]
  );

  return (
      <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};