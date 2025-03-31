import React, { useState } from 'react';
import {
    Box,
    Button,
    Avatar,
    Menu,
    MenuItem,
    Typography,
    ListItemIcon,
    Tooltip,
    Fade,
    // Divider,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import { useAppContext } from '../contexts/AppProvider';
// import LogoutIcon from '@mui/icons-material/Logout';

// Helper to shorten address
const shortenAddress = (address: string | undefined, chars = 4): string => {
    if (!address) return '';
    return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

// Helper to generate simple blockie-like background
const generateAvatarColor = (address: string): string => {
    // Simple hash function for color generation (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
        hash = address.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - color.length) + color;
};


const AppBarAccount: React.FC = () => {
    const { session, availableAccounts, authentication } = useAppContext();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const user = session?.user;

    // Only render if logged in via metamask and multiple accounts are available
    if (!user || user.type !== 'metamask' || !availableAccounts || availableAccounts.length <= 1) {
        // Optionally render a simpler display for single metamask account or simulation
        if (user) {
            return (
                <Tooltip title={`Connected: ${user.address}`}>
                     <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, p: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover'} }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: generateAvatarColor(user.address), fontSize: '0.8rem' }}>
                            {user.address.substring(2, 4).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }} noWrap>
                            {shortenAddress(user.address)}
                        </Typography>
                    </Box>
                </Tooltip>
            );
        }
        return null; // Or render nothing if no user
    }

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSwitchAccount = (newAddress: string) => {
        if (newAddress !== user.address) {
            authentication.switchAccount(newAddress);
        }
        handleClose();
    };

    return (
        <>
            <Tooltip title="Switch Account">
                <Button
                    id="account-switch-button"
                    aria-controls={open ? 'account-switch-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={handleClick}
                    color="inherit"
                    sx={{ textTransform: 'none', ml: 1, borderRadius: 1 }}
                    endIcon={<KeyboardArrowDownIcon />}
                >
                    {/* <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: generateAvatarColor(user.address), fontSize: '0.8rem' }}>
                         {user.address.substring(2, 4).toUpperCase()}
                    </Avatar> */}
                    <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 'bold' }} noWrap>
                        {"Current Account: " + shortenAddress(user.address)}
                    </Typography>
                </Button>
            </Tooltip>
            <Menu
                id="account-switch-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'account-switch-button',
                }}
                TransitionComponent={Fade}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                 slotProps={{ paper: { sx: { minWidth: 250, mt: 1 }}}}
            >
                <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                    Available Accounts
                </Typography>
                {availableAccounts.map((account) => (
                    <MenuItem
                        key={account}
                        selected={account === user.address}
                        onClick={() => handleSwitchAccount(account)}
                        sx={{ justifyContent: 'space-between' }} // Push check icon to the right
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                             {/* <Avatar sx={{ width: 24, height: 24, mr: 1.5, bgcolor: generateAvatarColor(account), fontSize: '0.7rem' }}>
                                {account.substring(2, 4).toUpperCase()}
                            </Avatar> */}
                            {(account)}
                        </Box>
                        {account === user.address && (
                            <ListItemIcon sx={{ minWidth: 'auto' }}>
                                <CheckIcon fontSize="small" color="primary" />
                            </ListItemIcon>
                        )}
                    </MenuItem>
                ))}
                {/* Add disconnect button here if desired */}
                {/* <Divider />
                <MenuItem onClick={authentication.signOut} sx={{ color: 'error.main' }}>
                    <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
                        <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    Disconnect
                </MenuItem> */}
            </Menu>
        </>
    );
};

export default AppBarAccount;