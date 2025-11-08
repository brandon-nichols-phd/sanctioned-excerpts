import { Components, Theme } from '@mui/material/styles'
import { pathspotBlue } from './colors-pathspot/colors'

const overrides = (theme: Theme): Components => ({
  MuiButton: {
    styleOverrides: {
      root: {
        padding: theme.spacing(1, 2),
        borderRadius: 4,
        gap: theme.spacing(1),
        textTransform: 'none',
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 4,
        padding: theme.spacing(2),
      },
    },
  },
  MuiTypography: {
    variants: [
      {
        props: { variant: 'SensorCardGroup' },
        style: {
          fontColor: pathspotBlue,
          fontWeight: 'bold',
          fontSize: '1.5rem',
        },
      },
    ],
  },
  MuiPaper: {
    variants: [
      {
        props: { variant: 'layoutFlexColumnCenter' },
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      {
        props: { variant: 'layoutFlexRowBetween' },
        style: {
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      {
        props: { variant: 'cardBlank' },
        style: {
          borderRadius: 8,
          padding: 16,
        },
      },
      {
        props: { variant: 'sensorCard' },
        style: {
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.spacing(1),
          padding: theme.spacing(2),
          boxShadow: theme.palette.mode === 'dark' ? 'none' : theme.shadows[1],
        },
      },
      {
        props: { variant: 'sensorCardAlert' },
        style: {
          backgroundColor: theme.palette.error.light,
          color: theme.palette.error.contrastText,
          borderColor: theme.palette.error.main,
          borderRadius: theme.spacing(1),
          padding: theme.spacing(2),
        },
      },
    ],
  },
})

export default overrides
