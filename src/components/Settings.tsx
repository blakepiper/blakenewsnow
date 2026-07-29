import { useEffect, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
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
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import type { Settings as SettingsType, SourceConfig } from '../stores/settings';
import { UI_TIMING } from '../config';

interface SettingsProps {
  settings: SettingsType;
  onClose: () => void;
  onToggleSource: (sourceId: string) => void;
  onSetAllSources: (enabled: boolean) => void;
  onUpdateLocation: (zip: string, city: string) => void;
}

type TabId = 'sources' | 'location';

const SettingsDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    width: '100%',
    minHeight: 460,
    maxHeight: '82vh',
    backgroundImage: 'none',
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: '0 24px 80px rgba(1, 5, 8, 0.62)',
    [theme.breakpoints.down('sm')]: {
      height: '100%',
      maxHeight: 'none',
      margin: 0,
      border: 0,
      borderRadius: 0,
    },
  },
}));

const SettingsTitleBar = styled(DialogTitle)({
  display: 'flex',
  minHeight: 52,
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px 8px 16px',
});

const SettingsTitle = styled('h2')({
  margin: 0,
  fontSize: 17,
  fontWeight: 600,
  letterSpacing: '-0.02em',
});

const CloseButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  '&:hover': {
    color: theme.palette.text.primary,
    backgroundColor: 'rgba(225, 235, 242, 0.07)',
  },
}));

const SettingsTabs = styled(Tabs)(({ theme }) => ({
  minHeight: 38,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const SettingsTab = styled(Tab)({
  minHeight: 38,
  minWidth: 90,
  padding: '6px 14px',
  fontSize: 12,
});

const SettingsContent = styled(DialogContent)({
  padding: '18px 18px 24px',
});

const SourceCategory = styled('section')({
  '& + &': {
    marginTop: 24,
  },
});

const SourceToolbar = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 18,
});

const SourceActions = styled('div')({
  display: 'flex',
  gap: 6,
});

const SourceAction = styled(Button)({
  minWidth: 84,
});

const CategoryLabel = styled('h3')(({ theme }) => ({
  marginTop: 0,
  display: 'block',
  marginBottom: 8,
  color: theme.palette.text.secondary,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.12em',
}));

const SourceGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 6,
  '@media (max-width: 560px)': {
    gridTemplateColumns: '1fr',
  },
});

const SourceRow = styled('label')(({ theme }) => ({
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
}));

const SourceName = styled(Typography, {
  shouldForwardProp: prop => prop !== 'enabled',
})<{ enabled: boolean }>(({ enabled, theme }) => ({
  ...(!enabled && { color: theme.palette.text.secondary }),
}));

const SourceSwitch = styled(Switch)({
  marginRight: -4,
});

const FormStack = styled('div')({
  display: 'grid',
  maxWidth: 420,
  gap: 16,
});

const LocationRow = styled('div')({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
});

const LocationInput = styled(TextField)({
  flex: 1,
});

const SaveButton = styled(Button)({
  minWidth: 74,
  minHeight: 40,
});

const CurrentLocation = styled('div')({
  display: 'grid',
  gap: 4,
  paddingTop: 16,
});

const SettingsActions = styled(DialogActions)(({ theme }) => ({
  minHeight: 48,
  padding: '8px 12px',
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const ShortcutKey = styled('kbd')(({ theme }) => ({
  display: 'inline-block',
  minWidth: 22,
  padding: '1px 5px',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 3,
  color: theme.palette.text.secondary,
  fontFamily: 'inherit',
  fontSize: 10,
  textAlign: 'center',
}));

function SourceToggle({ source, onToggle }: { source: SourceConfig; onToggle: () => void }) {
  return (
    <SourceRow>
      <SourceName variant="body2" enabled={source.enabled}>
        {source.name}
      </SourceName>
      <SourceSwitch
        checked={source.enabled}
        onChange={onToggle}
        color="primary"
        size="small"
        slotProps={{ input: { 'aria-label': `Show ${source.name}` } }}
      />
    </SourceRow>
  );
}

export function Settings({
  settings,
  onClose,
  onToggleSource,
  onSetAllSources,
  onUpdateLocation,
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('sources');
  const [zipInput, setZipInput] = useState(settings.location.zip);
  const [locationSaved, setLocationSaved] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const zipIsValid = /^\d{5}$/.test(zipInput);
  const enabledSourceCount = settings.sources.filter(source => source.enabled).length;
  const allSourcesEnabled = enabledSourceCount === settings.sources.length;
  const allSourcesDisabled = enabledSourceCount === 0;

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
    <SettingsDialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="settings-title"
    >
      <SettingsTitleBar>
        <SettingsTitle id="settings-title">
          Settings
        </SettingsTitle>
        <CloseButton
          size="small"
          onClick={onClose}
          aria-label="Close settings"
        >
          <CloseIcon fontSize="small" />
        </CloseButton>
      </SettingsTitleBar>

      <SettingsTabs
        value={activeTab}
        onChange={(_: SyntheticEvent, value: TabId) => setActiveTab(value)}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons={false}
        aria-label="Settings sections"
      >
        <SettingsTab value="sources" label="Sources" />
        <SettingsTab value="location" label="Location" />
      </SettingsTabs>

      <SettingsContent>
        {activeTab === 'sources' && (
          <div>
            <SourceToolbar>
              <Typography variant="caption" color="text.secondary">
                {enabledSourceCount} of {settings.sources.length} enabled
              </Typography>
              <SourceActions>
                <SourceAction
                  size="small"
                  variant="outlined"
                  disabled={allSourcesEnabled}
                  onClick={() => onSetAllSources(true)}
                >
                  Select all
                </SourceAction>
                <SourceAction
                  size="small"
                  variant="outlined"
                  disabled={allSourcesDisabled}
                  onClick={() => onSetAllSources(false)}
                >
                  Unselect all
                </SourceAction>
              </SourceActions>
            </SourceToolbar>
            {Object.entries(sourcesByCategory).map(([category, sources]) => (
              <SourceCategory key={category}>
                <CategoryLabel>
                  {categoryLabels[category] || category}
                </CategoryLabel>
                <SourceGrid>
                  {sources.map(source => (
                    <SourceToggle
                      key={source.id}
                      source={source}
                      onToggle={() => onToggleSource(source.id)}
                    />
                  ))}
                </SourceGrid>
              </SourceCategory>
            ))}
          </div>
        )}

        {activeTab === 'location' && (
          <FormStack>
            <LocationRow>
              <LocationInput
                label="ZIP code"
                value={zipInput}
                onChange={event => setZipInput(event.target.value.replace(/\D/g, '').slice(0, 5))}
                error={zipInput.length > 0 && !zipIsValid}
                helperText={zipInput.length > 0 && !zipIsValid ? 'Enter a five-digit U.S. ZIP code.' : 'Used for local weather and radar.'}
                variant="outlined"
                size="small"
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 5 } }}
              />
              <SaveButton
                variant="contained"
                color="primary"
                disabled={!zipIsValid}
                onClick={handleSaveLocation}
              >
                {locationSaved ? 'Saved' : 'Save'}
              </SaveButton>
            </LocationRow>
            <Divider />
            <CurrentLocation>
              <Typography variant="caption" color="text.secondary">Current location</Typography>
              <Typography variant="body2">
                {settings.location.city || settings.location.zip}
              </Typography>
            </CurrentLocation>
          </FormStack>
        )}

      </SettingsContent>

      <SettingsActions>
        <Typography variant="caption" color="text.secondary">
          <ShortcutKey>Esc</ShortcutKey> closes this dialog
        </Typography>
      </SettingsActions>
    </SettingsDialog>
  );
}
