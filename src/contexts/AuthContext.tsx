import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
    ReactNode,
  } from 'react';
  import { Session, User, Authentication } from '../types';
  import { shortenAddress } from '../utils/formatters';
  import { useSnackbarContext } from './SnackbarProvider';
  
  interface AuthContextType {
    session: Session | null;
    availableAccounts: string[] | null;
    isConnecting: boolean;
    authError: string | null;
    authentication: Authentication;
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
    const [session, setSession] = useState<Session | null>(null);
    const [availableAccounts, setAvailableAccounts] = useState<string[] | null>(null);
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const { showSnackbar } = useSnackbarContext();
  
    const clearError = () => setAuthError(null);
  
    const signIn = useCallback(
      (
        primaryAddress: string,
        allAccounts: string[] | null,
        type: 'metamask' | 'simulated'
      ) => {
        clearError();
        setIsConnecting(true);
        // Simulate processing delay
        setTimeout(() => {
          try {
            const user: User = {
              address: primaryAddress,
              name: `${type === 'metamask' ? 'MetaMask' : 'Simulated'} User (${shortenAddress(
                primaryAddress,
                4
              )})`,
              type: type,
            };
            setSession({ user });
            setAvailableAccounts(allAccounts);
            setIsConnecting(false);
            // Call the showSnackbar function from the context
            showSnackbar(`Wallet connected: ${shortenAddress(primaryAddress)} (${type})`, 'success');
          } catch (error: any) {
            console.error("Sign in error:", error);
            const errorMsg = error.message || "Failed to sign in.";
            setAuthError(errorMsg)
            setIsConnecting(false);
            // Call the showSnackbar function from the context
            showSnackbar(errorMsg, "error");
          }
        }, 500);
      },
      [showSnackbar] // Dependency is the function from the context hook
    );
  
    const signOut = useCallback(() => {
      clearError();
      setSession(null);
      setAvailableAccounts(null);
      // Call the showSnackbar function from the context
      showSnackbar('Wallet disconnected', 'info');
    }, [showSnackbar]); // Dependency is the function from the context hook
  
    const switchAccount = useCallback(
      (newAddress: string) => {
        clearError();
        if (session?.user.type === 'metamask' && availableAccounts?.includes(newAddress)) {
          setSession((prevSession) =>
            prevSession ? {
              ...prevSession,
              user: { ...prevSession.user, address: newAddress },
            } : null
          );
          // Call the showSnackbar function from the context
          showSnackbar(`Switched to account ${shortenAddress(newAddress)}`, 'info');
        } else {
          const errorMsg = 'Failed to switch account: Invalid state or address.';
          console.warn(errorMsg);
          setAuthError(errorMsg)
          // Call the showSnackbar function from the context
          showSnackbar('Failed to switch account', 'error');
        }
      },
      [session, availableAccounts, showSnackbar] // Dependency is the function from the context hook
    );
  
    const authentication = useMemo(
      () => ({
        signIn,
        signOut,
        switchAccount,
      }),
      [signIn, signOut, switchAccount]
    );
  
    const contextValue = useMemo(
      () => ({
        session,
        availableAccounts,
        isConnecting,
        authError,
        authentication,
      }),
      [session, availableAccounts, isConnecting, authError, authentication]
    );
  
    return (
      <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
    );
  };