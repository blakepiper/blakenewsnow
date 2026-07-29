import { AppBar, IconButton, Toolbar, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import type { FilterType } from './FilterPills';
import { FilterPills } from './FilterPills';

interface HeaderProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onSearchOpen: () => void;
  onHelpOpen: () => void;
  onSettingsOpen: () => void;
}

const AppHeader = styled(AppBar)(({ theme }) => ({
  flexShrink: 0,
  borderBottom: `1px solid ${theme.palette.divider}`,
  background: '#0b0d0f',
  color: theme.palette.text.primary,
  paddingTop: 'var(--sat)',
}));

const HeaderToolbar = styled(Toolbar)({
  minHeight: 40,
  padding: '0 12px',
  justifyContent: 'space-between',
  '@media (min-width: 768px)': {
    minHeight: 32,
    padding: '0 8px',
  },
});

const BrandGroup = styled('div')({
  display: 'flex',
  minWidth: 0,
  alignItems: 'center',
  gap: 7,
});

const BrandLogo = styled('img')({
  width: 118,
  height: 24,
  objectFit: 'contain',
  objectPosition: 'left center',
  '@media (max-width: 420px)': {
    width: 102,
  },
});

const HiddenTitle = styled('h1')({
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
});

const HeaderActions = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 2,
});

const ActionButton = styled(IconButton)(({ theme }) => ({
  width: 34,
  height: 34,
  padding: 0,
  color: theme.palette.text.secondary,
  borderRadius: theme.shape.borderRadius,
  '&:hover': {
    color: theme.palette.text.primary,
    backgroundColor: 'rgba(225, 235, 242, 0.07)',
  },
  '&:active': {
    transform: 'translateY(1px)',
  },
  '@media (min-width: 768px)': {
    width: 26,
    height: 26,
  },
}));

const DesktopActionButton = styled(ActionButton)({
  display: 'none',
  '@media (min-width: 768px)': {
    display: 'inline-flex',
  },
});

const MobileFilters = styled('div')({
  overflowX: 'auto',
  borderTop: '1px solid rgba(225, 235, 242, 0.06)',
  '@media (min-width: 768px)': {
    display: 'none',
  },
});

const DesktopFilters = styled('div')({
  display: 'none',
  '@media (min-width: 768px)': {
    display: 'block',
  },
});

export function Header({
  activeFilter,
  onFilterChange,
  onSearchOpen,
  onHelpOpen,
  onSettingsOpen,
}: HeaderProps) {
  const filters = (
    <FilterPills activeFilter={activeFilter} onFilterChange={onFilterChange} />
  );

  return (
    <AppHeader position="static" elevation={0} color="transparent" as="header">
      <HeaderToolbar variant="dense" disableGutters>
        <BrandGroup>
          <BrandLogo
            src="/brand-logo.png"
            alt="Blake News Now"
            onError={event => {
              event.currentTarget.style.display = 'none';
            }}
          />
          <HiddenTitle>Blake News Now</HiddenTitle>
          <DesktopFilters>{filters}</DesktopFilters>
        </BrandGroup>

        <HeaderActions>
          <Tooltip title="Search (/)">
            <ActionButton onClick={onSearchOpen} aria-label="Search">
              <SearchIcon sx={{ fontSize: 17 }} />
            </ActionButton>
          </Tooltip>
          <Tooltip title="Keyboard shortcuts (?)">
            <DesktopActionButton
              onClick={onHelpOpen}
              aria-label="Keyboard shortcuts"
            >
              <HelpOutlineIcon sx={{ fontSize: 17 }} />
            </DesktopActionButton>
          </Tooltip>
          <Tooltip title="Settings (Ctrl+,)">
            <ActionButton onClick={onSettingsOpen} aria-label="Settings">
              <SettingsOutlinedIcon sx={{ fontSize: 17 }} />
            </ActionButton>
          </Tooltip>
        </HeaderActions>
      </HeaderToolbar>

      <MobileFilters>{filters}</MobileFilters>
    </AppHeader>
  );
}
