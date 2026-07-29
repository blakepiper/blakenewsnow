import { Tab, Tabs } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import type { ChangeEvent } from 'react';

export type FilterType = 'all' | 'news' | 'tech' | 'social' | 'saved';

interface FilterPillsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  savedCount?: number;
}

const filters: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'news', label: 'News' },
  { id: 'tech', label: 'Tech' },
  { id: 'social', label: 'Social' },
  { id: 'saved', label: 'Saved' },
];

const useStyles = makeStyles(theme => ({
  root: {
    minHeight: 32,
    padding: '0 4px',
  },
  indicator: {
    height: 2,
    backgroundColor: theme.palette.primary.main,
  },
  tab: {
    minWidth: 52,
    minHeight: 32,
    padding: '4px 9px',
    color: theme.palette.text.secondary,
    fontSize: 11,
    opacity: 1,
    '&:hover': {
      color: theme.palette.text.primary,
      backgroundColor: 'rgba(225, 235, 242, 0.05)',
    },
    '&:active': {
      transform: 'translateY(1px)',
    },
    '&$selected': {
      color: theme.palette.text.primary,
    },
    '@media (max-width: 767px)': {
      minWidth: 68,
      minHeight: 38,
      padding: '7px 13px',
      fontSize: 12,
    },
  },
  selected: {},
  count: {
    marginLeft: 5,
    color: theme.palette.secondary.main,
    fontVariantNumeric: 'tabular-nums',
  },
}));

export function FilterPills({ activeFilter, onFilterChange, savedCount = 0 }: FilterPillsProps) {
  const classes = useStyles();

  return (
    <Tabs
      value={activeFilter}
      onChange={(_: ChangeEvent<Record<string, never>>, value: FilterType) => onFilterChange(value)}
      variant="scrollable"
      scrollButtons="off"
      aria-label="Filter news feed"
      classes={{ root: classes.root, indicator: classes.indicator }}
    >
      {filters.map(filter => (
        <Tab
          key={filter.id}
          value={filter.id}
          classes={{ root: classes.tab, selected: classes.selected }}
          label={
            <span>
              {filter.label}
              {filter.id === 'saved' && savedCount > 0 && (
                <span className={classes.count}>{savedCount}</span>
              )}
            </span>
          }
        />
      ))}
    </Tabs>
  );
}
