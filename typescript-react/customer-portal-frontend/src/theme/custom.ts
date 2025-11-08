import { Theme } from '@mui/material/styles'
import { CustomStyles } from './types'

export const customStyles = (theme: Theme): CustomStyles => ({
  customLinkStyling: {
    textOverflow: 'ellipsis',
    whiteSpace: 'normal',
    overflow: 'hidden',
    color: theme.palette.primary.main,
    textDecoration: 'none',
    cursor: 'pointer',
    '&:hover': {
      color: theme.palette.secondary.main,
    },
  },
})
