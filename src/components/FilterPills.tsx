import { Tab, Tabs } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { SyntheticEvent } from 'react';

export type FilterType = 'all' | 'news' | 'tech' | 'social' | 'science';

interface FilterPillsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const filters: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'news', label: 'News' },
  { id: 'tech', label: 'Tech' },
  { id: 'social', label: 'Social' },
  { id: 'science', label: 'Science' },
];

const FilterTabs = styled(Tabs)(({ theme }) => ({
  minHeight: 32,
  padding: '0 4px',
  '& .MuiTabs-indicator': {
    height: 2,
    backgroundColor: theme.palette.primary.main,
  },
}));

const FilterTab = styled(Tab)(({ theme }) => ({
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
  '&.Mui-selected': {
    color: theme.palette.text.primary,
  },
  '@media (max-width: 767px)': {
    minWidth: 68,
    minHeight: 38,
    padding: '7px 13px',
    fontSize: 12,
  },
}));

export function FilterPills({ activeFilter, onFilterChange }: FilterPillsProps) {
  return (
    <FilterTabs
      value={activeFilter}
      onChange={(_: SyntheticEvent, value: FilterType) => onFilterChange(value)}
      variant="scrollable"
      scrollButtons={false}
      aria-label="Filter news feed"
    >
      {filters.map(filter => (
        <FilterTab
          key={filter.id}
          value={filter.id}
          label={filter.label}
        />
      ))}
    </FilterTabs>
  );
}
