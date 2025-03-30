import React, { useState } from 'react';
import {
    Paper, Typography, TextField, Button, Box, CircularProgress, Alert,
    IconButton, Tooltip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';


interface WalletConnectProps {
  onConnect: (address: string) => void; // Callback with simulated address
  isLoading: boolean; // Indicate loading state
}

const EXAMPLE_MNEMONIC = "apple banana cherry date egg fruit grape honey ice juice kiwi lemon mango nut orange peach"; // 16 words

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect, isLoading }) => {
  const [mnemonic, setMnemonic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const validateMnemonic = (phrase: string): boolean => {
      const words = phrase.trim().split(/\s+/);
      // Basic check: expecting exactly 16 words for this simulation
      return words.length === 16 && words.every(word => word.length > 0);
  };

  const handleConnect = () => {
    setError(null); // Clear previous errors
    if (!validateMnemonic(mnemonic)) {
      setError("Invalid input. Please enter exactly 16 words separated by spaces.");
      return;
    }
    if (isLoading) return; // Prevent multiple clicks

    // --- Simulation: Generate Address from Mnemonic ---
    // This is *NOT* cryptographically secure and only for simulation.
    // It creates a pseudo-unique address based on the input string.
    let hash = 0;
    const phraseToHash = mnemonic.trim().toLowerCase(); // Normalize input
    for (let i = 0; i < phraseToHash.length; i++) {
        const char = phraseToHash.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    // Pad and format as an Ethereum-like address
    const simulatedAddress = "0x" + Math.abs(hash).toString(16).padStart(40, 'a').substring(0, 40);
    // --- End Simulation ---

    onConnect(simulatedAddress); // Pass the simulated address
  };

   const handleUseExample = () => {
       setMnemonic(EXAMPLE_MNEMONIC);
       setError(null); // Clear error when using example
   };

    const handleCopyExample = () => {
        navigator.clipboard.writeText(EXAMPLE_MNEMONIC).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Show feedback for 2s
        }).catch(err => {
            console.error('Failed to copy example mnemonic: ', err);
            setError("Failed to copy example phrase.");
        });
    };


  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2, bgcolor: 'background.default' }}>
        <Paper elevation={3} sx={{ padding: { xs: 2, sm: 4 }, maxWidth: 480, width: '100%', borderRadius: 2 }}>
            <Typography variant="h5" component="h1" gutterBottom align="center" sx={{ mb: 2, fontWeight: 'medium' }}>
                Connect Wallet (Simulation)
            </Typography>
             <Alert severity="warning" icon={<InfoOutlinedIcon fontSize="inherit" />} sx={{ mb: 2 }}>
                This is a frontend simulation only. <br/>
                <strong>Do NOT enter your real secret recovery phrase (mnemonic).</strong>
            </Alert>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField
                id="mnemonic-input"
                label="Secret Recovery Phrase (16 words)"
                placeholder="Enter the 16-word phrase..."
                multiline
                minRows={3}
                fullWidth
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                margin="normal"
                disabled={isLoading}
                error={!!error && !validateMnemonic(mnemonic)} // Show error state on field if invalid
                helperText={error && !validateMnemonic(mnemonic) ? error : "Enter the 16 words separated by single spaces."}
            />
            <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleConnect}
                disabled={isLoading || !validateMnemonic(mnemonic)} // Disable if loading or invalid
                sx={{ mt: 1, mb: 3, py: 1.5, fontSize: '1rem' }} // Larger button text
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
                {isLoading ? 'Connecting...' : 'Connect Simulated Wallet'}
            </Button>

            {/* Example Section */}
            <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2}}>
                 <Typography variant="body2" gutterBottom color="text.secondary">
                    Need an example?
                 </Typography>
                <Paper
                    variant="outlined"
                    sx={{ p: 1.5, mb: 1, backgroundColor: "action.hover", position: 'relative', wordBreak: 'break-word' }}
                >
                    <Typography variant="body2" component="code" sx={{ fontFamily: 'monospace' }}> {/* Use monospace */}
                        {EXAMPLE_MNEMONIC}
                    </Typography>
                     <Tooltip title={copied ? "Copied!" : "Copy example phrase"} placement="top">
                        <IconButton
                            size="small"
                            onClick={handleCopyExample}
                            sx={{ position: 'absolute', top: 4, right: 4 }}
                            aria-label="copy example mnemonic"
                        >
                           <ContentCopyIcon fontSize="inherit" />
                        </IconButton>
                     </Tooltip>
                </Paper>
                <Button
                    size="small"
                    variant="text" // Use text button for less emphasis
                    fullWidth
                    onClick={handleUseExample}
                    disabled={isLoading}
                >
                    Use Example Phrase Above
                </Button>
            </Box>
        </Paper>
    </Box>
  );
};

export default WalletConnect;