import React, { ReactNode, useState } from 'react';
import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';
import {
  Box,
  Drawer as MuiDrawer,
  AppBar as MuiAppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  useMediaQuery
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

// Import context and components
import { useAppContext } from '../contexts/AppProvider';
import ThemeToggleButton from '../components/ThemeToggle';
import { SidebarFooterProps, NavigationItem } from '../types';

// --- Styled Components ---
const drawerWidth = 240;

// Mixin for opened drawer style
const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  borderRight: `1px solid ${theme.palette.divider}`,
});

// Mixin for closed drawer style
const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`, // Width for closed state (small screens)
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`, // Width for closed state (medium+ screens)
  },
  borderRight: `1px solid ${theme.palette.divider}`,
});

// Header inside the Drawer for positioning the close button
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end', // Keep button to the right
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar, // Necessary height for alignment with AppBar
}));

// Custom AppBar that shifts with the drawer
interface AppBarProps extends React.ComponentProps<typeof MuiAppBar> { // Extend MuiAppBar props
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open', // Prevent 'open' prop from reaching DOM
})<AppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1, // AppBar above Drawer
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`, // Adjust width when drawer is open
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  // Add background blur and subtle background color for better layering
  // backgroundColor: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(8px)',
  boxShadow: 'none', // remove shadow for flatter look
  borderBottom: `1px solid ${theme.palette.divider}`, // add border
}));

// Custom Drawer component applying the mixins
const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme), // Apply to the Paper element inside
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme), // Apply to the Paper element inside
    }),
  }),
);
// --- End Styled Components ---


// --- DashboardLayout Props ---
interface DashboardLayoutProps {
  children: ReactNode;
  // Define slots for customization points
  slots?: {
    toolbarContent?: React.ComponentType; // e.g., Account button, notifications
    sidebarFooter?: React.ComponentType<SidebarFooterProps>; // Use the specific props type
  };
}

// --- DashboardLayout Component ---
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  slots = {}, // Default to empty object if no slots are provided
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // Check for mobile screens
  const [open, setOpen] = useState(!isMobile); // Drawer starts closed on mobile, open otherwise
  const { navigation, router } = useAppContext();

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  // Get slot components
  const ToolbarContent = slots.toolbarContent;
  const SidebarFooter = slots.sidebarFooter;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Top Application Bar */}
      <AppBar position="fixed" open={open} elevation={0} >
        <Toolbar>
          {/* Menu Icon (appears when drawer is closed) */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 2,
              ...(open && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          {/* App Title */}
          <Typography variant="h6" noWrap component="div" sx={{fontWeight: 'bold', flexGrow: { xs: 1, sm: 0 }}}>
            DPP Frontend
          </Typography>
          {/* Spacer pushes subsequent items to the right */}
          <Box sx={{ flexGrow: 1 }} />
          {/* Theme Toggle Button */}
          <ThemeToggleButton />
          {/* Custom Toolbar Content (e.g., Account) */}
          {ToolbarContent && <ToolbarContent />}
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          {/* Close Drawer Button */}
          <IconButton onClick={handleDrawerClose} aria-label="close drawer">
             {/* Use ChevronLeft or Right based on theme direction if needed */}
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
        {/* Navigation List */}
        <List sx={{ p: 0 }}>
          {navigation.map((item: NavigationItem, index: number) => {
            // Render Header sections differently
            if (item.kind === 'header') {
              return (
                <ListItem key={index} sx={{ pt: 2, pb: 1, pl: open ? 2.5 : 0, justifyContent: open ? 'flex-start': 'center' }} dense>
                  {open ? (
                     <Typography variant="overline" color="text.secondary" sx={{ pl: 0.5 }}>
                        {item.title}
                     </Typography>
                  ) : (
                    // Show tooltip or nothing when closed
                    <Divider sx={{ width: '80%', margin: 'auto'}}/>
                  )}

                </ListItem>
              );
            }

            // Render standard navigation items
            const isSelected = router.pathname.substring(1) === item.segment;
            return (
              <ListItem
                key={item.segment || item.title} // Use segment as key if available
                disablePadding
                sx={{ display: 'block' }}
              >
                <Tooltip title={!open ? item.title : ""} placement="right">
                    <ListItemButton
                        sx={{
                            minHeight: 48,
                            justifyContent: open ? 'initial' : 'center',
                            px: 2.5,
                            borderRadius: 1,
                            mx: open ? 1 : 0.5,
                            my: 0.5,
                            '&.Mui-selected': {
                                bgcolor: 'action.selected',
                                fontWeight: 'fontWeightBold',
                                '&:hover': {
                                    bgcolor: 'action.selected'
                                }
                            },
                        }}
                        selected={isSelected}
                        onClick={() => item.segment && router.navigate(`/${item.segment}`)}
                        aria-current={isSelected ? 'page' : undefined}
                    >
                    {/* Icon */}
                    {item.icon && (
                        <ListItemIcon
                        sx={{
                            minWidth: 0,
                            mr: open ? 3 : 'auto', // Margin right only when open
                            justifyContent: 'center',
                            color: isSelected ? 'primary.main' : 'inherit', // Highlight icon color if selected
                        }}
                        >
                        {item.icon}
                        </ListItemIcon>
                    )}
                    {/* Text (only visible when drawer is open) */}
                    <ListItemText
                        primary={item.title}
                        sx={{ opacity: open ? 1 : 0, transition: theme.transitions.create('opacity') }} // Fade text in/out
                    />
                    {/* Optional Action Icon (visible when open) */}
                    {open && item.action && (
                        <Box sx={{ ml: 'auto' }}>
                           {item.action}
                        </Box>
                     )}
                    </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        {/* Optional Sidebar Footer */}
        {SidebarFooter && (
          <Box sx={{ marginTop: 'auto', mb: 1 }}>
             <Divider sx={{ mb: 1 }}/>
            <SidebarFooter mini={!open} />
          </Box>
        )}
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          bgcolor: 'background.default',
          color: 'text.primary',
          overflowY: 'auto',
        }}
      >
        {/* Add DrawerHeader height as padding-top to prevent content from hiding under AppBar */}
        <DrawerHeader />
        {/* Render the page content */}
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;