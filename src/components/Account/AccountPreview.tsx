import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAppContext } from '../../contexts/AppProvider';
import { AccountPreviewProps } from '../../types';

export const AccountPreview: React.FC<AccountPreviewProps> = ({
  handleClick,
  open,
  variant = 'expanded',
}) => {
  const { session } = useAppContext();
  const user = session?.user;

  if (!user) return null; // Don't render if not logged in

  // Helper function for avatar fallback
  const getAvatarFallback = (name?: string, address?: string): string => {
      if (name) return name[0].toUpperCase();
      if (address) return address.substring(2, 4).toUpperCase();
      return '?';
  }

  // Helper function to shorten address
  const shortenAddress = (address: string, chars = 6): string => {
      if (!address) return '';
      return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
  }

  return (
    <Button
      onClick={handleClick}
      aria-haspopup="true"
      aria-expanded={open}
      sx={{
        display: 'flex',
        alignItems: 'center',
        textAlign: 'left',
        gap: 1,
        px: variant === 'expanded' ? 2 : 1,
        py: 1,
        borderRadius: 1,
        width: '100%',
        justifyContent: variant === 'condensed' ? 'center' : 'flex-start',
        textTransform: 'none',
        color: 'inherit',
        '&:hover': {
            bgcolor: 'action.hover'
        }
      }}
    >
      <Avatar
        src={user.image}
        alt={user.name || `User ${user.address.substring(0, 6)}`}
        sx={{ width: 32, height: 32 }}
      >
        {/* Fallback initials or address part */}
        {getAvatarFallback(user.name, user.address)}
      </Avatar>

      {variant === 'expanded' && (
        <>
          <Box sx={{ flexGrow: 1, overflow: 'hidden', ml: 1 }}>
            <Typography variant="body2" fontWeight="medium" noWrap>
              {user.name || 'Anonymous User'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {shortenAddress(user.address)}
            </Typography>
          </Box>
          {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
        </>
      )}
    </Button>
  );
};