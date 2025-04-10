import React from 'react';
import { Stack, Divider, Typography } from '@mui/material';
import {
    Account,
    AccountPreview,
    AccountPopoverFooter,
    SignOutButton,
} from './Account'; // Assuming these are in the same folder or adjust path
import type { AccountPreviewProps, SidebarFooterProps } from '../../types'; // Adjust path

// --- Sidebar Account Components ---
function AccountSidebarPreview(props: AccountPreviewProps & { mini: boolean }) {
    const { handleClick, open, mini } = props;
    return (
        <Stack direction="column" p={0}>
            <Divider />
            <AccountPreview
                variant={mini ? 'condensed' : 'expanded'}
                handleClick={handleClick}
                open={open}
            />
        </Stack>
    );
}

function SidebarFooterAccountPopover() {
    return (
        <Stack direction="column" width={250}>
            <Typography variant="body2" sx={{ p: 2, pb: 1 }}>
                Wallet Connected
            </Typography>
            <Divider />
            <AccountPopoverFooter>
                <SignOutButton />
            </AccountPopoverFooter>
        </Stack>
    );
}

const createPreviewComponent = (mini: boolean) => {
    function PreviewComponent(props: AccountPreviewProps) {
        return <AccountSidebarPreview {...props} mini={mini} />;
    }
    return PreviewComponent;
};

export function SidebarFooterAccount({ mini }: SidebarFooterProps) {
    const PreviewComponent = React.useMemo(() => createPreviewComponent(mini), [mini]);
    return (
        <Account
            slots={{
                preview: PreviewComponent,
                popoverContent: SidebarFooterAccountPopover,
            }}
            slotProps={{
                popover: {
                    transformOrigin: { horizontal: 'left', vertical: 'bottom' },
                    anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
                    disableAutoFocus: true,
                    slotProps: {
                        paper: {
                            elevation: 0,
                            sx: {
                                overflow: 'visible',
                                filter: (theme) =>
                                    `drop-shadow(0px 2px 8px ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.32)'})`,
                                mt: 1,
                                '&::before': {
                                    content: '""',
                                    display: 'block',
                                    position: 'absolute',
                                    bottom: 10,
                                    left: 0,
                                    width: 10,
                                    height: 10,
                                    bgcolor: 'background.paper',
                                    transform: 'translate(-50%, -50%) rotate(45deg)',
                                    zIndex: 0,
                                },
                            },
                        },
                    },
                },
            }}
        />
    );
}