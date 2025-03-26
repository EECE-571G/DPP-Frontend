import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Popover from '@mui/material/Popover';
import Button from '@mui/material/Button';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAppContext } from './AppProvider';

export interface AccountPreviewProps {
  handleClick: (event: React.MouseEvent<HTMLElement>) => void;
  open: boolean;
  variant?: 'condensed' | 'expanded';
}

export const AccountPreview: React.FC<AccountPreviewProps> = ({ 
  handleClick, 
  open, 
  variant = 'expanded' 
}) => {
  const { session } = useAppContext();
  const user = session?.user;

  if (!user) return null;

  return (
    <Button
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        textAlign: 'left',
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: 0,
        width: '100%',
        justifyContent: variant === 'condensed' ? 'center' : 'flex-start',
      }}
    >
      <Avatar
        src={user.image}
        alt={user.name || 'User'}
        sx={{ width: 32, height: 32 }}
      >
        {user.name ? user.name[0] : user.address.substring(0, 1)}
      </Avatar>
      
      {variant === 'expanded' && (
        <>
          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <Typography variant="body2" noWrap>
              {user.name || 'Anonymous User'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user.address.substring(0, 10)}...
            </Typography>
          </Box>
          {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </>
      )}
    </Button>
  );
};

export const AccountPopoverFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box sx={{ p: 2 }}>
      {children}
    </Box>
  );
};

export const SignOutButton: React.FC = () => {
  const { authentication } = useAppContext();
  
  return (
    <Button 
      variant="outlined" 
      fullWidth 
      onClick={() => authentication.signOut()}
    >
      Sign Out
    </Button>
  );
};

interface AccountProps {
  slots: {
    preview: React.ComponentType<AccountPreviewProps>;
    popoverContent: React.ComponentType;
  };
  slotProps?: {
    popover?: {
      transformOrigin?: {
        horizontal: 'left' | 'center' | 'right';
        vertical: 'top' | 'center' | 'bottom';
      };
      anchorOrigin?: {
        horizontal: 'left' | 'center' | 'right';
        vertical: 'top' | 'center' | 'bottom';
      };
      disableAutoFocus?: boolean;
      slotProps?: {
        paper?: {
          elevation?: number;
          sx?: any;
        };
      };
    };
  };
}

export const Account: React.FC<AccountProps> = ({ slots, slotProps }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const { session } = useAppContext();
  if (!session) return null;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const { preview: Preview, popoverContent: PopoverContent } = slots;

  return (
    <>
      <Preview handleClick={handleClick} open={open} />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        transformOrigin={slotProps?.popover?.transformOrigin}
        anchorOrigin={slotProps?.popover?.anchorOrigin}
        disableAutoFocus={slotProps?.popover?.disableAutoFocus}
        PaperProps={slotProps?.popover?.slotProps?.paper}
      >
        <PopoverContent />
      </Popover>
    </>
  );
};