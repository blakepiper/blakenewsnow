import { useEffect, useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import SecurityIcon from '@material-ui/icons/Security';
import { API_BASE } from '../config';
import type { FeedItem } from '../types';
import { findRelatedFeedItems } from '../ml/nowBriefing';
import { formatTimeAgo, getSourceColor } from '../utils/formatters';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface ArticlePreviewProps {
  item: FeedItem | null;
  alternatives: FeedItem[];
  onClose: () => void;
}

interface PreviewResponse {
  title: string;
  byline: string;
  siteName: string;
  excerpt: string;
  publishedTime: string;
  length: number;
  paragraphs: string[];
  requestedUrl: string;
  finalUrl: string;
  cached: boolean;
  extractionMode: 'article' | 'metadata';
}

const useStyles = makeStyles(theme => ({
  paper: {
    height: 'min(860px, 90vh)',
    background: '#101316',
    backgroundImage: 'none',
    border: `1px solid ${theme.palette.divider}`,
    '@media (max-width: 767px)': {
      height: '100%',
      border: 0,
    },
  },
  topbar: {
    minHeight: 46,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 10px',
    borderBottom: `1px solid ${theme.palette.divider}`,
    background: '#0b0d0f',
    '@media (max-width: 600px)': {
      gap: 6,
    },
  },
  logo: {
    width: 116,
    height: 24,
    objectFit: 'contain',
    objectPosition: 'left center',
    '@media (max-width: 600px)': {
      width: 82,
    },
  },
  source: {
    maxWidth: 130,
    padding: '2px 6px',
    borderRadius: 3,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    '@media (max-width: 600px)': {
      display: 'none',
    },
  },
  sourceArrow: {
    color: theme.palette.text.secondary,
    fontSize: 11,
    '@media (max-width: 600px)': {
      display: 'none',
    },
  },
  grow: {
    flex: 1,
  },
  safety: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: theme.palette.text.secondary,
    fontSize: 10,
    '@media (max-width: 600px)': {
      display: 'none',
    },
  },
  safetyIcon: {
    color: theme.palette.secondary.main,
    fontSize: 14,
  },
  sourceButton: {
    minHeight: 30,
    borderColor: 'rgba(154, 193, 223, 0.35)',
    color: theme.palette.primary.light,
    fontSize: 10,
    '@media (max-width: 600px)': {
      padding: '3px 7px',
      fontSize: 9,
      '& .MuiButton-endIcon': {
        display: 'none',
      },
    },
  },
  close: {
    padding: 5,
    color: theme.palette.text.secondary,
  },
  content: {
    padding: 0,
    overflowY: 'auto',
  },
  article: {
    width: 'min(100%, 760px)',
    margin: '0 auto',
    padding: '34px 28px 64px',
    '@media (max-width: 767px)': {
      padding: '24px 18px 56px',
    },
  },
  eyebrow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
    color: theme.palette.text.secondary,
    fontSize: 11,
  },
  title: {
    marginBottom: 12,
    color: theme.palette.text.primary,
    fontSize: 'clamp(1.55rem, 4vw, 2.25rem)',
    fontWeight: 750,
    lineHeight: 1.08,
    letterSpacing: '-0.025em',
  },
  excerpt: {
    marginBottom: 18,
    color: 'rgba(222, 230, 235, 0.72)',
    fontSize: 16,
    lineHeight: 1.5,
  },
  byline: {
    marginBottom: 26,
    paddingBottom: 15,
    borderBottom: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
    fontSize: 12,
  },
  paragraph: {
    margin: '0 0 1.15em',
    color: 'rgba(235, 240, 243, 0.9)',
    fontSize: 16,
    lineHeight: 1.72,
  },
  status: {
    minHeight: 360,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 32,
    color: theme.palette.text.secondary,
    textAlign: 'center',
  },
  errorTitle: {
    color: theme.palette.text.primary,
    fontWeight: 700,
  },
  fallbackNote: {
    marginTop: 24,
    padding: '12px 14px',
    border: '1px solid rgba(212, 155, 99, 0.25)',
    borderRadius: 4,
    background: 'rgba(212, 155, 99, 0.06)',
    color: theme.palette.text.secondary,
    fontSize: 12,
    lineHeight: 1.5,
  },
  alternateNotice: {
    marginBottom: 20,
    padding: '11px 13px',
    borderLeft: `3px solid ${theme.palette.secondary.main}`,
    background: 'rgba(212, 155, 99, 0.07)',
    color: theme.palette.text.secondary,
    fontSize: 12,
    lineHeight: 1.5,
    '& strong': {
      color: theme.palette.text.primary,
    },
  },
}));

export function ArticlePreview({ item, alternatives, onClose }: ArticlePreviewProps) {
  const classes = useStyles();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [readerItem, setReaderItem] = useState<FeedItem | null>(null);
  const [matchTerms, setMatchTerms] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    if (!item) {
      setPreview(null);
      setReaderItem(null);
      setMatchTerms([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setPreview(null);
    setReaderItem(null);
    setMatchTerms([]);
    setError(null);
    setLoading(true);
    setLoadingMessage(`Extracting readable text from ${item.source}…`);

    const fetchPreview = async (candidate: FeedItem) => {
      const response = await fetch(
        `${API_BASE}/api/article-preview?url=${encodeURIComponent(candidate.link)}`,
        { signal: controller.signal }
      );
      const data = await response.json().catch(() => ({})) as PreviewResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Unable to preview this article.');
      return data;
    };

    const loadPreview = async () => {
      let partialPreview: PreviewResponse | null = null;
      let originalError = 'The publisher did not make the full article available.';

      try {
        const data = await fetchPreview(item);
        if (data.extractionMode === 'article') {
          setPreview(data);
          setReaderItem(item);
          return;
        }
        partialPreview = data;
      } catch (fetchError) {
        if (fetchError instanceof Error) originalError = fetchError.message;
      }

      if (controller.signal.aborted) return;
      const related = findRelatedFeedItems(item, alternatives, 4);
      if (related.length > 0) {
        setLoadingMessage(`Finding clean related coverage for ${item.source}…`);
        const results = await Promise.allSettled(
          related.map(async match => ({
            match,
            data: await fetchPreview(match.item),
          }))
        );
        const replacement = results
          .filter((result): result is PromiseFulfilledResult<{
            match: ReturnType<typeof findRelatedFeedItems>[number];
            data: PreviewResponse;
          }> => result.status === 'fulfilled')
          .map(result => result.value)
          .find(result => result.data.extractionMode === 'article');

        if (replacement) {
          setPreview(replacement.data);
          setReaderItem(replacement.match.item);
          setMatchTerms(replacement.match.sharedTerms);
          return;
        }
      }

      if (partialPreview) {
        setPreview(partialPreview);
        setReaderItem(item);
        return;
      }
      setError(originalError);
    };

    loadPreview()
      .catch(fetchError => {
        if (fetchError instanceof Error && fetchError.name !== 'AbortError') {
          setError(fetchError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [item, alternatives]);

  const openOriginal = () => {
    if (item?.link) window.open(item.link, '_blank', 'noopener,noreferrer');
  };
  const openReaderSource = () => {
    if (readerItem?.link) window.open(readerItem.link, '_blank', 'noopener,noreferrer');
  };
  const usingAlternative = Boolean(item && readerItem && item.id !== readerItem.id);

  return (
    <Dialog
      open={Boolean(item)}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="md"
      PaperProps={{ className: classes.paper }}
      aria-labelledby="article-preview-title"
    >
      {item && (
        <>
          <div className={classes.topbar}>
            <img src="/brand-logo.png" alt="Blake News Now" className={classes.logo} />
            <span className={`${classes.source} ${getSourceColor(item.source)}`}>{item.source}</span>
            {usingAlternative && readerItem && (
              <>
                <span className={classes.sourceArrow}>→</span>
                <span className={`${classes.source} ${getSourceColor(readerItem.source)}`}>
                  {readerItem.source}
                </span>
              </>
            )}
            <span className={classes.grow} />
            <Tooltip title="Publisher scripts, cookies, popups, and embeds are not loaded">
              <span className={classes.safety}>
                <SecurityIcon className={classes.safetyIcon} />
                text-only reader
              </span>
            </Tooltip>
            <Button
              variant="outlined"
              size="small"
              onClick={openOriginal}
              endIcon={<OpenInNewIcon fontSize="small" />}
              className={classes.sourceButton}
            >
              {usingAlternative ? 'Original' : 'Open source'}
            </Button>
            {usingAlternative && (
              <Button
                variant="outlined"
                size="small"
                onClick={openReaderSource}
                endIcon={<OpenInNewIcon fontSize="small" />}
                className={classes.sourceButton}
              >
                Reader source
              </Button>
            )}
            <IconButton onClick={onClose} className={classes.close} aria-label="Close preview">
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>

          <DialogContent className={classes.content}>
            {loading && (
              <div className={classes.status}>
                <CircularProgress size={24} />
                <span>{loadingMessage}</span>
              </div>
            )}

            {!loading && error && !item.description && (
              <div className={classes.status}>
                <Typography className={classes.errorTitle}>Preview unavailable</Typography>
                <span>{error}</span>
                <Button variant="outlined" onClick={openOriginal} endIcon={<OpenInNewIcon />}>
                  Open the original article
                </Button>
              </div>
            )}

            {!loading && error && item.description && (
              <article className={classes.article}>
                <div className={classes.eyebrow}>
                  <span>{item.source}</span>
                  <span>•</span>
                  <span>feed excerpt</span>
                  <span>•</span>
                  <span>{formatTimeAgo(item.timestamp)}</span>
                </div>
                <Typography component="h1" id="article-preview-title" className={classes.title}>
                  {item.title}
                </Typography>
                <Typography component="p" className={classes.paragraph}>
                  {item.description}
                </Typography>
                <div className={classes.fallbackNote}>
                  The publisher did not make the full page available to the text reader.
                  This excerpt came directly from its feed. The original article is still
                  available through <strong>Open source</strong>.
                </div>
              </article>
            )}

            {!loading && preview && (
              <article className={classes.article}>
                {usingAlternative && readerItem && (
                  <div className={classes.alternateNotice}>
                    <strong>{item.source} did not expose a readable full article.</strong>{' '}
                    Showing independently published coverage from <strong>{readerItem.source}</strong>
                    {matchTerms.length > 0 && (
                      <> matched on {matchTerms.slice(0, 4).join(', ')}</>
                    )}. Details may differ, so both source links remain available.
                  </div>
                )}
                <div className={classes.eyebrow}>
                  <span>{preview.siteName || readerItem?.source || item.source}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(readerItem?.timestamp || item.timestamp)}</span>
                  {preview.extractionMode === 'metadata' && <span>• page excerpt</span>}
                  {preview.cached && <span>• cached reader copy</span>}
                </div>
                <Typography component="h1" id="article-preview-title" className={classes.title}>
                  {preview.title || item.title}
                </Typography>
                {preview.excerpt && preview.extractionMode === 'article' && (
                  <Typography component="p" className={classes.excerpt}>{preview.excerpt}</Typography>
                )}
                {preview.byline && <div className={classes.byline}>{preview.byline}</div>}
                {preview.paragraphs.map((paragraph, index) => (
                  <Typography component="p" className={classes.paragraph} key={`${index}-${paragraph.slice(0, 24)}`}>
                    {paragraph}
                  </Typography>
                ))}
              </article>
            )}
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
