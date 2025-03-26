import React, { useState } from 'react';
import { Paper, Typography, TextField, Button, Box, CircularProgress } from '@mui/material'; // Import Box & CircularProgress

interface WalletConnectProps {
  onConnect: (address: string) => void;
  isLoading: boolean; // Add isLoading prop
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect, isLoading }) => {
  const [mnemonic, setMnemonic] = useState("");

  const handleConnect = () => {
    // Basic validation (length check) - improve if needed
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 16) { // Example uses 16 words
      alert("Please enter a valid 16-word mnemonic phrase. For example: 'apple banana cherry date egg fruit grape honey ice juice kiwi lemon mango nut orange peach'");
      return;
    }
    if (isLoading) return; // Prevent multiple clicks

    // Simulate a wallet address (in production, you would derive this)
    // Simple hash-like function for pseudo-randomness based on input
    let hash = 0;
    for (let i = 0; i < mnemonic.length; i++) {
        const char = mnemonic.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    const simulatedAddress = "0x" + Math.abs(hash).toString(16).padStart(40, '0').slice(0, 40); // Generate somewhat unique address

    onConnect(simulatedAddress);
  };

   const exampleMnemonic = "apple banana cherry date egg fruit grape honey ice juice kiwi lemon mango nut orange peach";

   const handleUseExample = () => {
       setMnemonic(exampleMnemonic);
   };

    const handleCopyExample = () => {
        navigator.clipboard.writeText(exampleMnemonic).then(() => {
            alert("Example copied to clipboard!"); // Use snackbar in real app
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };


  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
        <Paper elevation={3} sx={{ padding: { xs: 2, sm: 3 }, maxWidth: 450, width: '100%' }}>
            <Typography variant="h5" gutterBottom align="center" sx={{ mb: 2 }}>
                Connect Wallet (Simulation)
            </Typography>
            <TextField
                label="Mnemonic Phrase (16 words)"
                placeholder="Enter your 16-word phrase"
                multiline
                minRows={3} // Ensure enough space
                fullWidth
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                margin="normal"
                disabled={isLoading}
            />
            <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleConnect}
                disabled={isLoading || !mnemonic.trim()} // Disable if loading or empty
                sx={{ mt: 1, mb: 3, py: 1.5 }} // Add padding
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null} // Show spinner
            >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </Button>

            <Typography variant="subtitle2" gutterBottom>
                Example Mnemonic:
            </Typography>
            <Paper
                variant="outlined"
                sx={{ p: 1, mb: 1, backgroundColor: "action.hover", cursor: 'pointer', wordBreak: 'break-word' }}
                onClick={handleCopyExample}
                title="Click to copy"
            >
                <Typography variant="body2">
                    {exampleMnemonic}
                </Typography>
            </Paper>
            <Button
                size="small"
                variant="outlined"
                fullWidth
                onClick={handleUseExample}
                disabled={isLoading}
            >
                Use Example Mnemonic
            </Button>
             <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                This is a simulation. Do not enter real mnemonic phrases.
             </Typography>
        </Paper>
    </Box>
  );
};

export default WalletConnect;