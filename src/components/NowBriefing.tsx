import { useMemo } from 'react';
import { ButtonBase } from '@mui/material';
import { styled } from '@mui/material/styles';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { FeedItem } from '../types';
import { buildNowBriefing } from '../ml/nowBriefing';
import { formatTimeAgo } from '../utils/formatters';

interface NowBriefingProps {
  items: FeedItem[];
  onPreview: (item: FeedItem) => void;
}

const BriefingRoot = styled('section')({
  gridColumn: '1 / -1',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'linear-gradient(180deg, rgba(18, 30, 37, 0.98), rgba(10, 10, 10, 0.98))',
});

const BriefingGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  '@media (max-width: 767px)': {
    gridTemplateColumns: '1fr',
  },
});

const BriefingStory = styled(ButtonBase)(({ theme }) => ({
  display: 'block',
  width: '100%',
  padding: '7px 10px 8px',
  textAlign: 'left',
  alignItems: 'stretch',
  justifyContent: 'flex-start',
  borderRight: '1px solid rgba(255, 255, 255, 0.05)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  '&:hover': {
    background: 'rgba(130, 170, 190, 0.07)',
  },
  '&:focus-visible': {
    outline: `1px solid ${theme.palette.primary.main}`,
    outlineOffset: -1,
  },
}));

const StoryInner = styled('span')({
  minWidth: 0,
  width: '100%',
});

const StoryTopline = styled('span')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 3,
  color: theme.palette.text.secondary,
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}));

const StoryRank = styled('span')(({ theme }) => ({
  color: theme.palette.secondary.main,
  fontVariantNumeric: 'tabular-nums',
}));

const StoryCoverage = styled('span')(({ theme }) => ({
  color: theme.palette.primary.light,
}));

const StoryHeadline = styled('span')({
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  color: 'rgba(244, 248, 250, 0.94)',
  fontSize: 11,
  lineHeight: 1.35,
});

const StorySources = styled('span')(({ theme }) => ({
  display: 'block',
  marginTop: 4,
  color: theme.palette.text.secondary,
  fontSize: 9,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

const OpenIcon = styled(OpenInNewIcon)({
  marginLeft: 4,
  fontSize: 10,
  verticalAlign: -1,
  opacity: 0.55,
});

const EmptyBriefing = styled('div')(({ theme }) => ({
  padding: '12px 10px',
  color: theme.palette.text.secondary,
  fontSize: 10,
}));

export function NowBriefing({ items, onPreview }: NowBriefingProps) {
  const briefing = useMemo(() => buildNowBriefing(items), [items]);

  if (items.length === 0) return null;

  return (
    <BriefingRoot aria-label="Top stories">
      {briefing.clusters.length > 0 ? (
        <BriefingGrid>
          {briefing.clusters.map((cluster, index) => (
            <BriefingStory
              key={cluster.id}
              onClick={() => {
                const item = items.find(candidate => candidate.link === cluster.link);
                if (item) onPreview(item);
              }}
            >
              <StoryInner>
                <StoryTopline>
                  <StoryRank>0{index + 1}</StoryRank>
                  <StoryCoverage>{cluster.coverage}</StoryCoverage>
                  <span>
                    {cluster.independentReportCount} independent
                  </span>
                  {cluster.publisherCount > cluster.independentReportCount && (
                    <span>{cluster.publisherCount} outlets</span>
                  )}
                  <span>{formatTimeAgo(cluster.timestamp)}</span>
                </StoryTopline>
                <StoryHeadline>
                  {cluster.headline}
                  <OpenIcon />
                </StoryHeadline>
                <StorySources>
                  {cluster.sources.slice(0, 4).join(' + ')}
                  {cluster.sources.length > 4 ? ` +${cluster.sources.length - 4}` : ''}
                  {cluster.keywords.length > 0 ? ` / ${cluster.keywords.join(' · ')}` : ''}
                </StorySources>
              </StoryInner>
            </BriefingStory>
          ))}
        </BriefingGrid>
      ) : (
        <EmptyBriefing>Not enough fresh reporting to assemble a briefing.</EmptyBriefing>
      )}
    </BriefingRoot>
  );
}
