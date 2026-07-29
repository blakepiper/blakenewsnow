import { AppBar, IconButton, Toolbar, Tooltip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import SearchIcon from '@material-ui/icons/Search';
import SettingsOutlinedIcon from '@material-ui/icons/SettingsOutlined';
import type { FilterType } from './FilterPills';
import { FilterPills } from './FilterPills';

interface HeaderProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  savedCount: number;
  onSearchOpen: () => void;
  onHelpOpen: () => void;
  onSettingsOpen: () => void;
}

const useStyles = makeStyles(theme => ({
  appBar: {
    flexShrink: 0,
    borderBottom: `1px solid ${theme.palette.divider}`,
    background: '#0b0d0f',
    color: theme.palette.text.primary,
    paddingTop: 'var(--sat)',
  },
  toolbar: {
    minHeight: 40,
    padding: '0 12px',
    justifyContent: 'space-between',
    '@media (min-width: 768px)': {
      minHeight: 32,
      padding: '0 8px',
    },
  },
  brandGroup: {
    display: 'flex',
    minWidth: 0,
    alignItems: 'center',
    gap: 7,
  },
  logo: {
    width: 20,
    height: 20,
    borderRadius: 3,
    objectFit: 'cover',
  },
  title: {
    margin: 0,
    color: theme.palette.text.primary,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  action: {
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
  },
  icon: {
    fontSize: 17,
  },
  mobileFilters: {
    overflowX: 'auto',
    borderTop: '1px solid rgba(225, 235, 242, 0.06)',
    '@media (min-width: 768px)': {
      display: 'none',
    },
  },
  desktopFilters: {
    display: 'none',
    '@media (min-width: 768px)': {
      display: 'block',
    },
  },
  desktopOnly: {
    display: 'none',
    '@media (min-width: 768px)': {
      display: 'inline-flex',
    },
  },
}));

export function Header({
  activeFilter,
  onFilterChange,
  savedCount,
  onSearchOpen,
  onHelpOpen,
  onSettingsOpen,
}: HeaderProps) {
  const classes = useStyles();
  const filters = (
    <FilterPills
      activeFilter={activeFilter}
      onFilterChange={onFilterChange}
      savedCount={savedCount}
    />
  );

  return (
    <AppBar position="static" elevation={0} color="transparent" component="header" className={classes.appBar}>
      <Toolbar variant="dense" disableGutters className={classes.toolbar}>
        <div className={classes.brandGroup}>
          <img
            src="/icons/icon-192.png"
            alt="Blake News Now"
            className={classes.logo}
            onError={event => {
              event.currentTarget.style.display = 'none';
            }}
          />
          <h1 className={classes.title}>BNN</h1>
          <div className={classes.desktopFilters}>{filters}</div>
        </div>

        <div className={classes.actions}>
          <Tooltip title="Search (/)">
            <IconButton className={classes.action} onClick={onSearchOpen} aria-label="Search">
              <SearchIcon className={classes.icon} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Keyboard shortcuts (?)">
            <IconButton
              className={`${classes.action} ${classes.desktopOnly}`}
              onClick={onHelpOpen}
              aria-label="Keyboard shortcuts"
            >
              <HelpOutlineIcon className={classes.icon} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings (Ctrl+,)">
            <IconButton className={classes.action} onClick={onSettingsOpen} aria-label="Settings">
              <SettingsOutlinedIcon className={classes.icon} />
            </IconButton>
          </Tooltip>
        </div>
      </Toolbar>

      <div className={classes.mobileFilters}>{filters}</div>
    </AppBar>
  );
}
