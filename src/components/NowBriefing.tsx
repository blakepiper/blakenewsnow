import { useMemo, useState } from 'react';
import {
  ButtonBase,
  Collapse,
  IconButton,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import type { FeedItem } from '../types';
import { buildNowBriefing } from '../ml/nowBriefing';
import { formatTimeAgo } from '../utils/formatters';

interface NowBriefingProps {
  items: FeedItem[];
  onPreview: (item: FeedItem) => void;
}

const useStyles = makeStyles(theme => ({
  root: {
    gridColumn: '1 / -1',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'linear-gradient(180deg, rgba(18, 30, 37, 0.98), rgba(10, 10, 10, 0.98))',
  },
  header: {
    minHeight: 34,
    padding: '4px 8px 4px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: theme.palette.secondary.main,
    boxShadow: `0 0 8px ${theme.palette.secondary.main}`,
  },
  title: {
    color: theme.palette.text.primary,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
  },
  meta: {
    color: theme.palette.text.secondary,
    fontSize: 9,
  },
  grow: {
    flex: 1,
  },
  toggle: {
    padding: 3,
    color: theme.palette.text.secondary,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    '@media (max-width: 767px)': {
      gridTemplateColumns: '1fr',
    },
  },
  story: {
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
  },
  storyInner: {
    minWidth: 0,
    width: '100%',
  },
  storyTopline: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
    color: theme.palette.text.secondary,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  rank: {
    color: theme.palette.secondary.main,
    fontVariantNumeric: 'tabular-nums',
  },
  coverage: {
    color: theme.palette.primary.light,
  },
  headline: {
    display: '-webkit-box',
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    color: 'rgba(244, 248, 250, 0.94)',
    fontSize: 11,
    lineHeight: 1.35,
  },
  sources: {
    marginTop: 4,
    color: theme.palette.text.secondary,
    fontSize: 9,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  openIcon: {
    marginLeft: 4,
    fontSize: 10,
    verticalAlign: -1,
    opacity: 0.55,
  },
  empty: {
    padding: '12px 10px',
    color: theme.palette.text.secondary,
    fontSize: 10,
  },
}));

export function NowBriefing({ items, onPreview }: NowBriefingProps) {
  const classes = useStyles();
  const [expanded, setExpanded] = useState(true);
  const briefing = useMemo(() => buildNowBriefing(items), [items]);

  if (items.length === 0) return null;

  return (
    <section className={classes.root} aria-labelledby="now-briefing-title">
      <div className={classes.header}>
        <span className={classes.liveDot} aria-hidden="true" />
        <Typography component="h2" id="now-briefing-title" className={classes.title}>
          WHAT&apos;S HAPPENING NOW
        </Typography>
        <span className={classes.meta}>
          {briefing.analyzedCount} reports / {briefing.windowHours}h
        </span>
        <span className={classes.grow} />
        <span className={classes.meta}>{formatTimeAgo(briefing.generatedAt)}</span>
        <Tooltip title={expanded ? 'Collapse briefing' : 'Expand briefing'}>
          <IconButton
            className={classes.toggle}
            onClick={() => setExpanded(value => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse briefing' : 'Expand briefing'}
          >
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </div>

      <Collapse in={expanded}>
        {briefing.clusters.length > 0 ? (
          <div className={classes.grid}>
            {briefing.clusters.map((cluster, index) => (
              <ButtonBase
                key={cluster.id}
                component="button"
                type="button"
                onClick={() => {
                  const item = items.find(candidate => candidate.link === cluster.link);
                  if (item) onPreview(item);
                }}
                className={classes.story}
              >
                <span className={classes.storyInner}>
                  <span className={classes.storyTopline}>
                    <span className={classes.rank}>0{index + 1}</span>
                    <span className={classes.coverage}>{cluster.coverage}</span>
                    <span>
                      {cluster.independentReportCount} independent
                    </span>
                    {cluster.publisherCount > cluster.independentReportCount && (
                      <span>{cluster.publisherCount} outlets</span>
                    )}
                    <span>{formatTimeAgo(cluster.timestamp)}</span>
                  </span>
                  <span className={classes.headline}>
                    {cluster.headline}
                    <OpenInNewIcon className={classes.openIcon} />
                  </span>
                  <span className={classes.sources}>
                    {cluster.sources.slice(0, 4).join(' + ')}
                    {cluster.sources.length > 4 ? ` +${cluster.sources.length - 4}` : ''}
                    {cluster.keywords.length > 0 ? ` / ${cluster.keywords.join(' · ')}` : ''}
                  </span>
                </span>
              </ButtonBase>
            ))}
          </div>
        ) : (
          <div className={classes.empty}>Not enough fresh reporting to assemble a briefing.</div>
        )}
      </Collapse>
    </section>
  );
}
