import React, { useState } from 'react';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import { PopoverProps as MuiPopoverProps } from '@mui/material/Popover';
import { PaperProps } from '@mui/material/Paper';
import { useAppContext } from '../../contexts/AppProvider';
import { AccountPreviewProps } from '../../types';
export { AccountPreview } from './AccountPreview';
export { AccountPopoverFooter } from './AccountPopoverFooter';
export { SignOutButton } from './SignOutButton';

interface AccountProps {
  slots: {
    preview: React.ComponentType<AccountPreviewProps>;
    popoverContent: React.ComponentType;
  };
  slotProps?: {
    preview?: {
      variant?: 'condensed' | 'expanded';
    };
    popover?: PopoverProps;
  };
}

type PopoverProps = Omit<MuiPopoverProps, 'open' | 'anchorEl' | 'onClose' | 'children' | 'slotProps'> & {
  slotProps?: {
    paper?: Partial<PaperProps>;
  };
};

export const Account: React.FC<AccountProps> = ({ slots, slotProps }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const { session } = useAppContext();
  // If there's no active session, don't render the account component
  if (!session) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Destructure the required slots
  const { preview: PreviewComponent, popoverContent: PopoverContentComponent } = slots;

  return (
    <Box>
      <PreviewComponent
        handleClick={handleClick}
        open={open}
        variant={slotProps?.preview?.variant ?? 'expanded'}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        {...slotProps?.popover}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              minWidth: 200,
              borderRadius: 1,
              mt: 1,
              ...(slotProps?.popover?.slotProps?.paper?.sx),
            },
            ...(slotProps?.popover?.slotProps?.paper &&
              Object.fromEntries(
                Object.entries(slotProps.popover.slotProps.paper).filter(([key]) => key !== 'sx')
              )
            ),
          },
        }}
      >
        <PopoverContentComponent />
      </Popover>
    </Box>
  );
};