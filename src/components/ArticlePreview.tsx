import { useEffect, useRef, useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SecurityIcon from '@mui/icons-material/Security';
import { API_BASE } from '../config';
import type { FeedItem } from '../types';
import {
  findReadableArticleRecommendation,
  type ArticlePreviewDocument,
  type ReadableArticleRecommendation,
} from '../ml/articleRecommendations';
import { formatTimeAgo, getSourceColor } from '../utils/formatters';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface ArticlePreviewProps {
  item: FeedItem | null;
  alternatives: FeedItem[];
  onClose: () => void;
}

type RecommendationStatus = 'idle' | 'searching' | 'available' | 'unavailable';

const ReaderDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    height: 'min(860px, 90vh)',
    background: '#101316',
    backgroundImage: 'none',
    border: `1px solid ${theme.palette.divider}`,
    '@media (max-width: 767px)': {
      height: '100%',
      border: 0,
    },
  },
}));

const ReaderTopbar = styled('div')(({ theme }) => ({
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
}));

const ReaderLogo = styled('img')({
  width: 116,
  height: 24,
  objectFit: 'contain',
  objectPosition: 'left center',
  '@media (max-width: 600px)': {
    width: 82,
  },
});

const SourceBadge = styled('span')({
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
});

const SourceArrow = styled('span')(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: 11,
  '@media (max-width: 600px)': {
    display: 'none',
  },
}));

const ReaderSafety = styled('span')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  color: theme.palette.text.secondary,
  fontSize: 10,
  '@media (max-width: 600px)': {
    display: 'none',
  },
}));

const SafetyIcon = styled(SecurityIcon)(({ theme }) => ({
  color: theme.palette.secondary.main,
  fontSize: 14,
}));

const SourceButton = styled(Button)(({ theme }) => ({
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
}));

const CloseButton = styled(IconButton)(({ theme }) => ({
  padding: 5,
  color: theme.palette.text.secondary,
}));

const ReaderContent = styled(DialogContent)({
  padding: 0,
  overflowY: 'auto',
});

const ReaderArticle = styled('article')({
  width: 'min(100%, 760px)',
  margin: '0 auto',
  padding: '34px 28px 64px',
  '@media (max-width: 767px)': {
    padding: '24px 18px 56px',
  },
});

const ReaderEyebrow = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 7,
  marginBottom: 12,
  color: theme.palette.text.secondary,
  fontSize: 11,
}));

const ReaderTitle = styled('h1')(({ theme }) => ({
  marginTop: 0,
  marginBottom: 12,
  color: theme.palette.text.primary,
  fontSize: 'clamp(1.55rem, 4vw, 2.25rem)',
  fontWeight: 750,
  lineHeight: 1.08,
  letterSpacing: '-0.025em',
}));

const ReaderExcerpt = styled('p')({
  marginBottom: 18,
  color: 'rgba(222, 230, 235, 0.72)',
  fontSize: 16,
  lineHeight: 1.5,
});

const ReaderByline = styled('div')(({ theme }) => ({
  marginBottom: 26,
  paddingBottom: 15,
  borderBottom: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.secondary,
  fontSize: 12,
}));

const ReaderParagraph = styled('p')({
  margin: '0 0 1.15em',
  color: 'rgba(235, 240, 243, 0.9)',
  fontSize: 16,
  lineHeight: 1.72,
});

const ReaderStatus = styled('div')(({ theme }) => ({
  minHeight: 360,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  padding: 32,
  color: theme.palette.text.secondary,
  textAlign: 'center',
}));

const ErrorTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 700,
}));

const FallbackNote = styled('div')(({ theme }) => ({
  marginTop: 24,
  padding: '12px 14px',
  border: '1px solid rgba(212, 155, 99, 0.25)',
  borderRadius: 4,
  background: 'rgba(212, 155, 99, 0.06)',
  color: theme.palette.text.secondary,
  fontSize: 12,
  lineHeight: 1.5,
}));

const AlternateNotice = styled('div')(({ theme }) => ({
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
}));

const RecommendationPanel = styled('aside')(({ theme }) => ({
  marginTop: 18,
  paddingTop: 16,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const RecommendationLabel = styled('div')(({ theme }) => ({
  marginBottom: 8,
  color: theme.palette.text.secondary,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
}));

const RecommendationStatus = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: theme.palette.text.secondary,
  fontSize: 11,
}));

const RecommendationCard = styled('button')(({ theme }) => ({
  width: '100%',
  padding: '12px 13px',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  background: 'rgba(111, 159, 197, 0.06)',
  color: theme.palette.text.primary,
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'background-color 140ms ease, border-color 140ms ease',
  '&:hover': {
    borderColor: 'rgba(154, 193, 223, 0.4)',
    background: 'rgba(111, 159, 197, 0.11)',
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

const RecommendationHeadline = styled('span')({
  display: 'block',
  fontSize: 14,
  fontWeight: 650,
  lineHeight: 1.35,
});

const RecommendationMeta = styled('span')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 7,
  color: theme.palette.text.secondary,
  fontSize: 10,
}));

const RecommendationAction = styled('span')(({ theme }) => ({
  color: theme.palette.primary.light,
  fontWeight: 700,
}));

export function ArticlePreview({ item, alternatives, onClose }: ArticlePreviewProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const readerContentRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<ArticlePreviewDocument | null>(null);
  const [readerItem, setReaderItem] = useState<FeedItem | null>(null);
  const [matchTerms, setMatchTerms] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<ReadableArticleRecommendation | null>(null);
  const [recommendationStatus, setRecommendationStatus] = useState<RecommendationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    if (!item) {
      setPreview(null);
      setReaderItem(null);
      setMatchTerms([]);
      setRecommendation(null);
      setRecommendationStatus('idle');
      setError(null);
      return;
    }

    const controller = new AbortController();
    setPreview(null);
    setReaderItem(null);
    setMatchTerms([]);
    setRecommendation(null);
    setRecommendationStatus('idle');
    setError(null);
    setLoading(true);
    setLoadingMessage(`Extracting readable text from ${item.source}…`);

    const fetchPreview = async (candidate: FeedItem) => {
      const response = await fetch(
        `${API_BASE}/api/article-preview?url=${encodeURIComponent(candidate.link)}`,
        { signal: controller.signal }
      );
      const data = await response.json().catch(() => ({})) as ArticlePreviewDocument & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Unable to preview this article.');
      return data;
    };

    const loadPreview = async () => {
      let partialPreview: ArticlePreviewDocument | null = null;
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
      if (partialPreview) {
        setPreview(partialPreview);
        setReaderItem(item);
      } else {
        setReaderItem(item);
        setError(originalError);
      }
      setLoading(false);
      setRecommendationStatus('searching');

      const relatedArticle = await findReadableArticleRecommendation(
        item,
        alternatives,
        fetchPreview
      );
      if (controller.signal.aborted) return;

      setRecommendation(relatedArticle);
      setRecommendationStatus(relatedArticle ? 'available' : 'unavailable');
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
  const openRecommendation = () => {
    if (!recommendation) return;
    setPreview(recommendation.preview);
    setReaderItem(recommendation.item);
    setMatchTerms(recommendation.sharedTerms);
    setRecommendation(null);
    setRecommendationStatus('idle');
    setError(null);
    window.requestAnimationFrame(() => {
      readerContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };
  const usingAlternative = Boolean(item && readerItem && item.id !== readerItem.id);
  const showLimitedPreviewNotice = Boolean(
    !usingAlternative
    && preview?.extractionMode === 'metadata'
  );

  const recommendationPrompt = recommendationStatus === 'idle' ? null : (
    <RecommendationPanel aria-live="polite">
      <RecommendationLabel>Related full-text coverage</RecommendationLabel>
      {recommendationStatus === 'searching' && (
        <RecommendationStatus>
          <CircularProgress size={13} />
          Checking similar reports for readable full text…
        </RecommendationStatus>
      )}
      {recommendationStatus === 'available' && recommendation && (
        <RecommendationCard type="button" onClick={openRecommendation}>
          <RecommendationHeadline>{recommendation.item.title}</RecommendationHeadline>
          <RecommendationMeta>
            <span>{recommendation.item.source}</span>
            {recommendation.sharedTerms.length > 0 && (
              <span>matched on {recommendation.sharedTerms.slice(0, 4).join(', ')}</span>
            )}
            <RecommendationAction>Read full text here →</RecommendationAction>
          </RecommendationMeta>
        </RecommendationCard>
      )}
      {recommendationStatus === 'unavailable' && (
        <RecommendationStatus>
          No closely related full-text report is currently available.
        </RecommendationStatus>
      )}
    </RecommendationPanel>
  );

  return (
    <ReaderDialog
      open={Boolean(item)}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="md"
      aria-labelledby="article-preview-title"
    >
      {item && (
        <>
          <ReaderTopbar>
            <ReaderLogo src="/brand-logo.png" alt="Blake News Now" />
            <SourceBadge className={getSourceColor(item.source)}>{item.source}</SourceBadge>
            {usingAlternative && readerItem && (
              <>
                <SourceArrow>→</SourceArrow>
                <SourceBadge className={getSourceColor(readerItem.source)}>
                  {readerItem.source}
                </SourceBadge>
              </>
            )}
            <span style={{ flex: 1 }} />
            <Tooltip title="Publisher scripts, cookies, popups, and embeds are not loaded">
              <ReaderSafety>
                <SafetyIcon />
                text-only reader
              </ReaderSafety>
            </Tooltip>
            <SourceButton
              variant="outlined"
              size="small"
              onClick={openOriginal}
              endIcon={<OpenInNewIcon fontSize="small" />}
            >
              {usingAlternative ? 'Original' : 'Open source'}
            </SourceButton>
            {usingAlternative && (
              <SourceButton
                variant="outlined"
                size="small"
                onClick={openReaderSource}
                endIcon={<OpenInNewIcon fontSize="small" />}
              >
                Reader source
              </SourceButton>
            )}
            <CloseButton onClick={onClose} aria-label="Close preview">
              <CloseIcon fontSize="small" />
            </CloseButton>
          </ReaderTopbar>

          <ReaderContent ref={readerContentRef}>
            {loading && (
              <ReaderStatus>
                <CircularProgress size={24} />
                <span>{loadingMessage}</span>
              </ReaderStatus>
            )}

            {!loading && error && !item.description && (
              <ReaderStatus>
                <ErrorTitle>Preview unavailable</ErrorTitle>
                <span>{error}</span>
                <Button variant="outlined" onClick={openOriginal} endIcon={<OpenInNewIcon />}>
                  Open the original article
                </Button>
                {recommendationPrompt}
              </ReaderStatus>
            )}

            {!loading && error && item.description && (
              <ReaderArticle>
                <ReaderEyebrow>
                  <span>{item.source}</span>
                  <span>•</span>
                  <span>feed excerpt</span>
                  <span>•</span>
                  <span>{formatTimeAgo(item.timestamp)}</span>
                </ReaderEyebrow>
                <ReaderTitle id="article-preview-title">
                  {item.title}
                </ReaderTitle>
                <ReaderParagraph>
                  {item.description}
                </ReaderParagraph>
                <FallbackNote>
                  The publisher did not make the full page available to the text reader.
                  This excerpt came directly from its feed. The original article is still
                  available through <strong>Open source</strong>.
                </FallbackNote>
                {recommendationPrompt}
              </ReaderArticle>
            )}

            {!loading && preview && (
              <ReaderArticle>
                {usingAlternative && readerItem && (
                  <AlternateNotice>
                    <strong>{item.source} did not expose a readable full article.</strong>{' '}
                    Showing independently published coverage from <strong>{readerItem.source}</strong>
                    {matchTerms.length > 0 && (
                      <> matched on {matchTerms.slice(0, 4).join(', ')}</>
                    )}. Details may differ, so both source links remain available.
                  </AlternateNotice>
                )}
                <ReaderEyebrow>
                  <span>{preview.siteName || readerItem?.source || item.source}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(readerItem?.timestamp || item.timestamp)}</span>
                  {preview.extractionMode === 'metadata' && <span>• page excerpt</span>}
                  {preview.cached && <span>• cached reader copy</span>}
                </ReaderEyebrow>
                <ReaderTitle id="article-preview-title">
                  {preview.title || item.title}
                </ReaderTitle>
                {preview.excerpt && preview.extractionMode === 'article' && (
                  <ReaderExcerpt>{preview.excerpt}</ReaderExcerpt>
                )}
                {preview.byline && <ReaderByline>{preview.byline}</ReaderByline>}
                {preview.paragraphs.map((paragraph, index) => (
                  <ReaderParagraph key={`${index}-${paragraph.slice(0, 24)}`}>
                    {paragraph}
                  </ReaderParagraph>
                ))}
                {showLimitedPreviewNotice && (
                  <>
                    <FallbackNote>
                      The publisher did not make the full page available to the text reader.
                      This preview contains only source-provided page metadata. The original
                      article is still available through <strong>Open source</strong>.
                    </FallbackNote>
                    {recommendationPrompt}
                  </>
                )}
              </ReaderArticle>
            )}
          </ReaderContent>
        </>
      )}
    </ReaderDialog>
  );
}
