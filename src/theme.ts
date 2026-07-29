import { createMuiTheme } from '@material-ui/core/styles';

const interfaceFont = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  'Helvetica',
  'Arial',
  'sans-serif',
].join(',');

export const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#6f9fc5',
      light: '#9ac1df',
      dark: '#436f92',
    },
    secondary: {
      main: '#d49b63',
    },
    background: {
      default: '#0b0d0f',
      paper: '#15181b',
    },
    text: {
      primary: '#e8edf1',
      secondary: '#9aa5ad',
    },
    divider: 'rgba(225, 235, 242, 0.10)',
  },
  shape: {
    borderRadius: 4,
  },
  typography: {
    fontFamily: interfaceFont,
    fontSize: 12,
    button: {
      fontFamily: interfaceFont,
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.01em',
      textTransform: 'none',
    },
  },
  props: {
    MuiButtonBase: {
      disableRipple: true,
    },
  },
  overrides: {
    MuiTooltip: {
      tooltip: {
        backgroundColor: '#252a2f',
        border: '1px solid rgba(225, 235, 242, 0.12)',
        color: '#e8edf1',
        fontSize: '0.6875rem',
      },
    },
    MuiButton: {
      root: {
        minWidth: 0,
      },
    },
    MuiInputBase: {
      root: {
        fontSize: '0.8125rem',
      },
    },
  },
});
