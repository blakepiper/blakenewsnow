import { useMemo, useState } from 'react';
import {
  ButtonBase,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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

const BriefingHeader = styled('div')({
  minHeight: 34,
  padding: '4px 8px 4px 10px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
});

const LiveDot = styled('span')(({ theme }) => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: theme.palette.secondary.main,
  boxShadow: `0 0 8px ${theme.palette.secondary.main}`,
}));

const BriefingTitle = styled('h2')(({ theme }) => ({
  margin: 0,
  color: theme.palette.text.primary,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
}));

const BriefingMeta = styled('span')(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: 9,
}));

const BriefingToggle = styled(IconButton)(({ theme }) => ({
  padding: 3,
  color: theme.palette.text.secondary,
}));

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
  const [expanded, setExpanded] = useState(true);
  const briefing = useMemo(() => buildNowBriefing(items), [items]);

  if (items.length === 0) return null;

  return (
    <BriefingRoot aria-labelledby="now-briefing-title">
      <BriefingHeader>
        <LiveDot aria-hidden="true" />
        <BriefingTitle id="now-briefing-title">
          WHAT&apos;S HAPPENING NOW
        </BriefingTitle>
        <BriefingMeta>
          {briefing.analyzedCount} reports / {briefing.windowHours}h
        </BriefingMeta>
        <span style={{ flex: 1 }} />
        <BriefingMeta>{formatTimeAgo(briefing.generatedAt)}</BriefingMeta>
        <Tooltip title={expanded ? 'Collapse briefing' : 'Expand briefing'}>
          <BriefingToggle
            onClick={() => setExpanded(value => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse briefing' : 'Expand briefing'}
          >
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </BriefingToggle>
        </Tooltip>
      </BriefingHeader>

      <Collapse in={expanded}>
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
      </Collapse>
    </BriefingRoot>
  );
}
