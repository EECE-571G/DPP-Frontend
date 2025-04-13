// src/components/WalletConnect.tsx
import React, { useState, useEffect } from 'react';
import { Paper, Typography, Button, Box, CircularProgress, Alert, SvgIcon } from '@mui/material';

// Import the correct context hook
import { useAuthContext } from '../contexts/AuthContext';

// SVG Icon for MetaMask
const MetaMaskIcon = () => (
    <SvgIcon viewBox="0 0 96 96" sx={{ width: 30, height: 30, mr: 1 }}>
      <path fill="#e17726" d="M92.8209 3.94971 52.4863 33.7945l7.5006 -17.5885 32.834 -12.25629Z" strokeWidth="1"></path><path fill="#e27625" d="M3.27246 3.98462 36.0186 16.208l7.1221 17.8191L3.27246 3.98462Z" strokeWidth="1"></path><path fill="#e27625" d="m76.5889 67.4209 17.8272 0.3393 -6.2304 21.1655 -21.7531 -5.9894 10.1563 -15.5154Z" strokeWidth="1"></path><path fill="#e27625" d="m19.4101 67.4209 10.1187 15.5155 -21.7167 5.9897 -6.19247 -21.1659 17.79047 -0.3393Z" strokeWidth="1"></path><path fill="#e27625" d="m42.1731 29.488 0.7288 23.5307 -21.8003 -0.9919 6.2009 -9.355 0.0785 -0.0902L42.1731 29.488Z" strokeWidth="1"></path><path fill="#e27625" d="m53.6012 29.2258 15.0178 13.357 0.0777 0.0895 6.2011 9.355 -21.7953 0.9917 0.4987 -23.7932Z" strokeWidth="1"></path><path fill="#e27625" d="m30.1671 67.489 11.9036 9.2747 -13.8275 6.6761 1.9239 -15.9508Z" strokeWidth="1"></path><path fill="#e27625" d="m65.8349 67.4875 1.884 15.9523 -13.7887 -6.6767 11.9047 -9.2756Z" strokeWidth="1"></path><path fill="#d5bfb2" d="m54.2339 75.8896 13.9924 6.7754 -13.0157 6.1859 0.1351 -4.0885 -1.1118 -8.8728Z" strokeWidth="1"></path><path fill="#d5bfb2" d="m41.7622 75.8926 -1.0682 8.8028 0.0876 4.1505 -13.0462 -6.181 14.0268 -6.7723Z" strokeWidth="1"></path><path fill="#233447" d="m37.7217 56.0898 3.6565 7.6845 -12.449 -3.6467 8.7925 -4.0378Z" strokeWidth="1"></path><path fill="#233447" d="m58.2786 56.0906 8.8338 4.0367 -12.4894 3.6458 3.6556 -7.6825Z" strokeWidth="1"></path><path fill="#cc6228" d="m31.1195 67.4109 -2.0124 16.538 -10.7853 -16.1765 12.7977 -0.3615Z" strokeWidth="1"></path><path fill="#cc6228" d="m64.8818 67.4111 12.7981 0.3616L66.854 83.9496l-1.9722 -16.5385Z" strokeWidth="1"></path><path fill="#cc6228" d="m75.2127 51.092 -9.3139 9.4922 -7.1809 -3.2815 -3.4382 7.2276 -2.2538 -12.4288 22.1868 -1.0095Z" strokeWidth="1"></path><path fill="#cc6228" d="m20.7822 51.0918 22.1907 1.0096 -2.2539 12.4289 -3.4388 -7.2268 -7.1431 3.2808 -9.3549 -9.4925Z" strokeWidth="1"></path><path fill="#e27525" d="m20.1553 49.1443 10.5376 10.6928 0.3652 10.5562 -10.9028 -21.249Z" strokeWidth="1"></path><path fill="#e27525" d="M75.8559 49.125 64.9336 70.412l0.4112 -10.5751L75.8559 49.125Z" strokeWidth="1"></path><path fill="#e27525" d="m42.4584 49.7949 0.4241 2.6695 1.048 6.65 -0.6737 20.425 -3.1854 -16.4076 -0.0011 -0.1696 2.3881 -13.1673Z" strokeWidth="1"></path><path fill="#e27525" d="m53.536 49.7583 2.3944 13.2041 -0.001 0.1696 -3.1934 16.4486 -0.1264 -4.1141 -0.4983 -16.4728 1.4247 -9.2354Z" strokeWidth="1"></path><path fill="#f5841f" d="m66.282 59.4116 -0.3566 9.1716 -11.1162 8.661 -2.2472 -1.5878 2.519 -12.9747 11.201 -3.2701Z" strokeWidth="1"></path><path fill="#f5841f" d="m29.7563 59.4119 11.1625 3.2701 2.5189 12.9745 -2.2473 1.5877 -11.1168 -8.6617 -0.3173 -9.1706Z" strokeWidth="1"></path><path fill="#c0ac9d" d="m25.6084 80.6394 14.2219 6.7386 -0.0602 -2.8775L40.96 83.456h14.0758l1.233 1.041 -0.0908 2.8755 14.1317 -6.7161 -6.8765 5.6825L55.118 92.05H40.8461l-8.3098 -5.7345 -6.9279 -5.6761Z" strokeWidth="1"></path><path fill="#161616" d="m53.2151 74.9929 2.0108 1.4204 1.1784 9.4018 -1.7053 -1.44H41.3057l-1.6729 1.469 1.1397 -9.4301 2.0115 -1.4211h10.4311Z" strokeWidth="1"></path><path fill="#763e1a" d="m90.1585 4.77588 4.8416 14.52502 -3.0236 14.6862 2.1531 1.661 -2.9135 2.2229 2.1895 1.691 -2.8994 2.6407 1.7801 1.2891 -4.7241 5.5173 -19.3765 -5.6416 -0.1679 -0.09 -13.9631 -11.7788L90.1585 4.77588Z" strokeWidth="1"></path><path fill="#763e1a" d="M5.84174 4.77588 41.9456 31.4987l-13.963 11.7788 -0.168 0.09 -19.37658 5.6416 -4.72406 -5.5173 1.77868 -1.2881 -2.89812 -2.6416 2.18551 -1.6893 -2.95704 -2.2292 2.23432 -1.662L1 19.3014 5.84174 4.77588Z" strokeWidth="1"></path><path fill="#f5841f" d="m67.2379 42.1335 20.5307 5.9774 6.6701 20.5572 -17.597 0 -12.1249 0.153 8.8177 -17.1873 -6.2966 -9.5003Z" strokeWidth="1"></path><path fill="#f5841f" d="m28.7622 42.1335 -6.2977 9.5003 8.8189 17.1873 -12.1189 -0.153H1.59863l6.63264 -20.557 20.53093 -5.9776Z" strokeWidth="1"></path><path fill="#f5841f" d="m60.9923 16.1079 -5.7426 15.5096 -1.2186 20.952 -0.4663 6.567 -0.037 16.7759H42.4713l-0.0359 -16.7444 -0.4678 -6.6043 -1.2192 -20.9462 -5.7416 -15.5096h25.9855Z" strokeWidth="1"></path>
    </SvgIcon>
);

const WalletConnect: React.FC = () => {
    // Get the new context values, including connectWallet
    const { connectWallet, isConnecting, authError, account } = useAuthContext(); // Get account to see if already connected

    // Local State
    const [localError, setLocalError] = useState<string | null>(null);
    const [isMetaMaskAvailable, setIsMetaMaskAvailable] = useState(false);
    // Button specific loading state might still be useful for visual feedback
    const [isMetaMaskLoading, setIsMetaMaskLoading] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.ethereum) {
            setIsMetaMaskAvailable(true);
        } else {
            setIsMetaMaskAvailable(false);
        }
    }, []);

    const clearLocalError = () => setLocalError(null);

    const handleConnectMetaMask = async () => {
        clearLocalError();
        if (!isMetaMaskAvailable) {
            setLocalError("MetaMask is not available.");
            return;
        }
        // Check global connecting state from context OR local button loading state
        if (isConnecting || isMetaMaskLoading) return;

        setIsMetaMaskLoading(true);
        try {
            // Call the connectWallet function from the context
            await connectWallet();
            // The connectWallet function now handles setting errors and showing snackbars
        } catch (err: any) {
            // This catch might be redundant if connectWallet handles all errors,
            // but kept for safety. The error should be displayed via authError from context.
            console.error("MetaMask connection error in component:", err);
            setLocalError("An unexpected error occurred during connection."); // Fallback error
        } finally {
            // Reset button loading state slightly after context finishes
             setTimeout(() => setIsMetaMaskLoading(false), 300); // Adjust delay if needed
        }
    };

    // Use the connecting state from the context for disabling buttons
    const anyConnectionLoading = isConnecting || isMetaMaskLoading;
    // Display either local validation error or the global auth error from context
    const displayError = localError || authError;

    // If already connected, maybe show a different view or nothing
    if (account) {
        // Return null or a 'Connected' message/component
        // For now, returning null hides the connect screen once connected
        return null;
    }


    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2, bgcolor: 'background.default' }}>
            <Paper elevation={3} sx={{ padding: { xs: 2, sm: 4 }, maxWidth: 480, width: '100%', borderRadius: 2 }}>
                <Typography variant="h5" component="h1" gutterBottom align="center" sx={{ mb: 2, fontWeight: 'medium' }}>Connect Wallet</Typography>

                {displayError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => { clearLocalError(); }}>{displayError}</Alert>}

                <Box sx={{ mb: 1 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={handleConnectMetaMask}
                        // Disable if unavailable, or if context is connecting, or button is loading
                        disabled={!isMetaMaskAvailable || anyConnectionLoading}
                        sx={{ py: 1.5, fontSize: '1rem' }}
                        startIcon={isMetaMaskLoading || isConnecting ? <CircularProgress size={20} color="inherit" /> : <MetaMaskIcon />}
                    >
                        {isMetaMaskLoading || isConnecting ? 'Connecting...' : (isMetaMaskAvailable ? 'Connect MetaMask' : 'MetaMask Not Found')}
                    </Button>
                    {!isMetaMaskAvailable && (<Typography variant="caption" display="block" color="text.secondary" sx={{mt: 1, textAlign: 'center'}}>Please install MetaMask extension.</Typography>)}
                </Box>
            </Paper>
        </Box>
    );
};

export default WalletConnect;