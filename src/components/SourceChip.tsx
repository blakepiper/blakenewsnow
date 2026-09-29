import { styled } from '@mui/material/styles';
import { getSourceColor } from '../utils/formatters';

export const SourceChip = styled('span', {
  shouldForwardProp: (prop) => prop !== 'source',
})<{ source: string }>(({ theme, source }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  border: `1px solid var(--color-${getSourceColor(source).replace('bg-', '')})`,
}));
