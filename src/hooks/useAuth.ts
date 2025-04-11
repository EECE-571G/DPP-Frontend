import { useMemo, useCallback, useState } from 'react';
import type { Session, User } from '../types';
import { shortenAddress } from '../utils/formatters';

interface UseAuthProps {
    setLoading: (key: string, value: boolean) => void; // From useLoadingState
    showSnackbar: (message: string, severity?: any) => void; // From useSnackbar
    mockUserBalances: Record<string, number>; // Pass mock balances
}

// Define the return type for the hook
export interface AuthHookResult {
    session: Session | null;
    availableAccounts: string[] | null;
    userBalances: Record<string, number>;
    setUserBalances: React.Dispatch<React.SetStateAction<Record<string, number>>>; // Expose setter if needed by actions
    authentication: {
        signIn: (primaryAddress: string, allAccounts: string[] | null, type: 'metamask' | 'simulated') => void;
        signOut: () => void;
        switchAccount: (newAddress: string) => void;
    };
    isConnecting: boolean;
}


export const useAuth = ({
    setLoading, // Keep setLoading for general loading state if needed, or manage connectWallet state here
    showSnackbar,
    mockUserBalances
}: UseAuthProps): AuthHookResult => {

    // Move state inside the hook
    const [session, setSession] = useState<Session | null>(null);
    const [availableAccounts, setAvailableAccounts] = useState<string[] | null>(null);
    const [userBalances, setUserBalances] = useState<Record<string, number>>({});
    const [isConnecting, setIsConnecting] = useState<boolean>(false); // Local loading state for connect

    const signIn = useCallback((
        primaryAddress: string,
        allAccounts: string[] | null,
        type: 'metamask' | 'simulated'
    ) => {
        // Use local connecting state
        setIsConnecting(true);
        // Use global loading state too
        setLoading('connectWallet', true);

        // Simulate processing delay
        setTimeout(() => {
            const user: User = {
                address: primaryAddress,
                name: `${type === 'metamask' ? 'MetaMask' : 'Simulated'} User (${shortenAddress(primaryAddress, 4)})`,
                type: type,
            };
            setSession({ user });
            setAvailableAccounts(allAccounts);

            // Use mock balances passed to the hook
            setUserBalances(mockUserBalances);

            setIsConnecting(false);
            setLoading('connectWallet', false);
            showSnackbar(`Wallet connected: ${shortenAddress(primaryAddress)} (${type})`, 'success');
        }, 500);
    }, [setLoading, showSnackbar, mockUserBalances]);

    const signOut = useCallback(() => {
        setSession(null);
        setAvailableAccounts(null);
        setUserBalances({});
        showSnackbar('Wallet disconnected', 'info');
    }, [showSnackbar]);

    const switchAccount = useCallback((newAddress: string) => {
        // Check internal state
        if (session?.user.type === 'metamask' && availableAccounts?.includes(newAddress)) {
            setSession(prevSession => prevSession ? ({
                ...prevSession,
                user: { ...prevSession.user, address: newAddress }
            }) : null);

            // Keep mock balances for simplicity in demo, or fetch real ones
            setUserBalances(mockUserBalances); // Re-apply mock balances for switched account
            showSnackbar(`Switched to account ${shortenAddress(newAddress)}`, 'info');
        } else {
            console.warn("Account switching failed: Invalid state or address.");
            showSnackbar('Failed to switch account', 'error');
        }
    }, [session, availableAccounts, showSnackbar, mockUserBalances]);

    // Memoize the authentication functions object
    const authentication = useMemo(() => ({
        signIn,
        signOut,
        switchAccount,
    }), [signIn, signOut, switchAccount]);

    // Return all managed state and functions
    return {
        session,
        availableAccounts,
        userBalances,
        setUserBalances,
        authentication,
        isConnecting,
    };
};