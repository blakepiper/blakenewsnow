import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import type { Settings as SettingsType, SourceConfig } from '../stores/settings';
import { UI_TIMING } from '../config';

interface SettingsProps {
  settings: SettingsType;
  onClose: () => void;
  onToggleSource: (sourceId: string) => void;
  onUpdateLocation: (zip: string, city: string) => void;
}

type TabId = 'sources' | 'location' | 'display';

const useStyles = makeStyles(theme => ({
  paper: {
    width: '100%',
    minHeight: 460,
    maxHeight: '82vh',
    backgroundImage: 'none',
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: '0 24px 80px rgba(1, 5, 8, 0.62)',
    [theme.breakpoints.down('xs')]: {
      height: '100%',
      maxHeight: 'none',
      margin: 0,
      border: 0,
      borderRadius: 0,
    },
  },
  titleBar: {
    display: 'flex',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px 8px 16px',
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: '-0.02em',
  },
  closeButton: {
    color: theme.palette.text.secondary,
    '&:hover': {
      color: theme.palette.text.primary,
      backgroundColor: 'rgba(225, 235, 242, 0.07)',
    },
  },
  tabs: {
    minHeight: 38,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  tab: {
    minHeight: 38,
    minWidth: 90,
    padding: '6px 14px',
    fontSize: 12,
  },
  content: {
    padding: '18px 18px 24px',
  },
  category: {
    '& + &': {
      marginTop: 24,
    },
  },
  categoryLabel: {
    display: 'block',
    marginBottom: 8,
    color: theme.palette.text.secondary,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.12em',
  },
  sourceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 6,
    '@media (max-width: 560px)': {
      gridTemplateColumns: '1fr',
    },
  },
  sourceRow: {
    display: 'flex',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 6px 4px 11px',
    borderRadius: theme.shape.borderRadius,
    background: 'rgba(225, 235, 242, 0.035)',
    transition: 'background-color 160ms ease',
    '&:hover': {
      background: 'rgba(225, 235, 242, 0.065)',
    },
  },
  sourceDisabled: {
    color: theme.palette.text.secondary,
  },
  switchRoot: {
    marginRight: -4,
  },
  formStack: {
    display: 'grid',
    maxWidth: 420,
    gap: 16,
  },
  locationRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  saveButton: {
    minWidth: 74,
    minHeight: 40,
  },
  currentLocation: {
    display: 'grid',
    gap: 4,
    paddingTop: 16,
  },
  learningPanel: {
    maxWidth: 620,
    padding: 14,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    background: 'rgba(111, 159, 197, 0.06)',
  },
  code: {
    color: theme.palette.primary.light,
    fontFamily: 'inherit',
    fontSize: '0.92em',
  },
  learningList: {
    display: 'grid',
    gap: 8,
    margin: '12px 0 0',
    paddingLeft: 18,
    color: theme.palette.text.secondary,
    fontSize: 12,
    lineHeight: 1.55,
  },
  actions: {
    minHeight: 48,
    padding: '8px 12px',
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  key: {
    display: 'inline-block',
    minWidth: 22,
    padding: '1px 5px',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 3,
    color: theme.palette.text.secondary,
    fontFamily: 'inherit',
    fontSize: 10,
    textAlign: 'center',
  },
}));

function SourceToggle({ source, onToggle }: { source: SourceConfig; onToggle: () => void }) {
  const classes = useStyles();

  return (
    <label className={classes.sourceRow}>
      <Typography
        variant="body2"
        className={source.enabled ? undefined : classes.sourceDisabled}
      >
        {source.name}
      </Typography>
      <Switch
        className={classes.switchRoot}
        checked={source.enabled}
        onChange={onToggle}
        color="primary"
        size="small"
        inputProps={{ 'aria-label': `Show ${source.name}` }}
      />
    </label>
  );
}

export function Settings({
  settings,
  onClose,
  onToggleSource,
  onUpdateLocation,
}: SettingsProps) {
  const classes = useStyles();
  const [activeTab, setActiveTab] = useState<TabId>('sources');
  const [zipInput, setZipInput] = useState(settings.location.zip);
  const [locationSaved, setLocationSaved] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const zipIsValid = /^\d{5}$/.test(zipInput);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const handleSaveLocation = () => {
    if (!zipIsValid) return;
    onUpdateLocation(zipInput, '');
    setLocationSaved(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      setLocationSaved(false);
      saveTimerRef.current = null;
    }, UI_TIMING.feedbackDuration);
  };

  const sourcesByCategory = settings.sources.reduce((groups, source) => {
    if (!groups[source.category]) groups[source.category] = [];
    groups[source.category].push(source);
    return groups;
  }, {} as Record<string, SourceConfig[]>);

  const categoryLabels: Record<string, string> = {
    news: 'News',
    tech: 'Technology',
    social: 'Social',
    finance: 'Finance',
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="settings-title"
      classes={{ paper: classes.paper }}
    >
      <DialogTitle disableTypography className={classes.titleBar}>
        <Typography id="settings-title" component="h2" className={classes.title}>
          Settings
        </Typography>
        <IconButton
          size="small"
          className={classes.closeButton}
          onClick={onClose}
          aria-label="Close settings"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Tabs
        value={activeTab}
        onChange={(_: ChangeEvent<Record<string, never>>, value: TabId) => setActiveTab(value)}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="off"
        aria-label="Settings sections"
        className={classes.tabs}
      >
        <Tab className={classes.tab} value="sources" label="Sources" />
        <Tab className={classes.tab} value="location" label="Location" />
        <Tab className={classes.tab} value="display" label="MUI notes" />
      </Tabs>

      <DialogContent className={classes.content}>
        {activeTab === 'sources' && (
          <div>
            {Object.entries(sourcesByCategory).map(([category, sources]) => (
              <section key={category} className={classes.category}>
                <Typography component="h3" variant="overline" className={classes.categoryLabel}>
                  {categoryLabels[category] || category}
                </Typography>
                <div className={classes.sourceGrid}>
                  {sources.map(source => (
                    <SourceToggle
                      key={source.id}
                      source={source}
                      onToggle={() => onToggleSource(source.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {activeTab === 'location' && (
          <div className={classes.formStack}>
            <div className={classes.locationRow}>
              <TextField
                className={classes.locationInput}
                label="ZIP code"
                value={zipInput}
                onChange={event => setZipInput(event.target.value.replace(/\D/g, '').slice(0, 5))}
                error={zipInput.length > 0 && !zipIsValid}
                helperText={zipInput.length > 0 && !zipIsValid ? 'Enter a five-digit U.S. ZIP code.' : 'Used for local weather and radar.'}
                variant="outlined"
                size="small"
                inputProps={{ inputMode: 'numeric', maxLength: 5 }}
              />
              <Button
                className={classes.saveButton}
                variant="contained"
                color="primary"
                disabled={!zipIsValid}
                onClick={handleSaveLocation}
              >
                {locationSaved ? 'Saved' : 'Save'}
              </Button>
            </div>
            <Divider />
            <div className={classes.currentLocation}>
              <Typography variant="caption" color="textSecondary">Current location</Typography>
              <Typography variant="body2">
                {settings.location.city || settings.location.zip}
              </Typography>
            </div>
          </div>
        )}

        {activeTab === 'display' && (
          <section className={classes.learningPanel}>
            <Typography component="h3" variant="subtitle2">What this screen teaches</Typography>
            <Typography variant="body2" color="textSecondary">
              This is Material-UI 4.12.4, whose package name is <code className={classes.code}>@material-ui/core</code>.
              The app keeps BNN's dense visual language through a custom theme.
            </Typography>
            <ul className={classes.learningList}>
              <li><code className={classes.code}>ThemeProvider</code> supplies palette, type, shape, defaults, and global overrides.</li>
              <li><code className={classes.code}>makeStyles</code> creates scoped JSS classes with access to theme tokens.</li>
              <li><code className={classes.code}>Tabs</code> and <code className={classes.code}>Tab</code> manage selection and keyboard semantics.</li>
              <li><code className={classes.code}>Dialog</code>, <code className={classes.code}>Switch</code>, and <code className={classes.code}>TextField</code> supply accessible interaction behavior.</li>
            </ul>
          </section>
        )}
      </DialogContent>

      <DialogActions className={classes.actions}>
        <Typography variant="caption" color="textSecondary">
          <kbd className={classes.key}>Esc</kbd> closes this dialog
        </Typography>
      </DialogActions>
    </Dialog>
  );
}
