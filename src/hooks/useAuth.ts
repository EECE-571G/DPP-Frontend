import { useMemo, useCallback } from 'react';
import type { Session, User } from '../types'; // Adjust path
import { shortenAddress } from '../utils/formatters'; // Adjust path

interface UseAuthProps {
    setSession: React.Dispatch<React.SetStateAction<Session | null>>;
    setAvailableAccounts: React.Dispatch<React.SetStateAction<string[] | null>>;
    setUserBalances: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    setLoading: (key: string, value: boolean) => void; // From useLoadingState
    showSnackbar: (message: string, severity?: any) => void; // From useSnackbar
    session: Session | null; // Need current session state for switchAccount
    availableAccounts: string[] | null; // Need available accounts for switchAccount
    mockUserBalances: Record<string, number>; // Pass mock balances
}

export const useAuth = ({
    setSession,
    setAvailableAccounts,
    setUserBalances,
    setLoading,
    showSnackbar,
    session,
    availableAccounts,
    mockUserBalances // Receive mock balances
}: UseAuthProps) => {

    const signIn = useCallback((
        primaryAddress: string,
        allAccounts: string[] | null,
        type: 'metamask' | 'simulated'
    ) => {
        setLoading('connectWallet', true);
        // Simulate processing delay
        setTimeout(() => {
            const user: User = {
                address: primaryAddress,
                name: `${type === 'metamask' ? 'MetaMask' : 'Simulated'} User`, // More descriptive name
                type: type,
            };
            setSession({ user });
            setAvailableAccounts(allAccounts);

            // Use mock balances passed to the hook
            setUserBalances(mockUserBalances);

            setLoading('connectWallet', false);
            showSnackbar(`Wallet connected via ${type === 'metamask' ? 'MetaMask' : 'Simulation'}!`, 'success');
        }, 500);
    }, [setLoading, setSession, setAvailableAccounts, setUserBalances, showSnackbar, mockUserBalances]);

    const signOut = useCallback(() => {
        setSession(null);
        setAvailableAccounts(null);
        setUserBalances({});
        showSnackbar('Wallet disconnected', 'info');
    }, [setSession, setAvailableAccounts, setUserBalances, showSnackbar]);

    const switchAccount = useCallback((newAddress: string) => {
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
    }, [session, availableAccounts, setSession, setUserBalances, showSnackbar, mockUserBalances]);

    // Return memoized object if preferred, or individual functions
    const authentication = useMemo(() => ({
        signIn,
        signOut,
        switchAccount,
    }), [signIn, signOut, switchAccount]);

    return authentication; // Or return { signIn, signOut, switchAccount }
};