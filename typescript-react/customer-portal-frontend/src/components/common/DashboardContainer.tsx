import { Box } from '@mui/system'
import React from 'react'

const DashboardContainer: React.FC<React.ReactNode> = ({ children }) => {
  return (
    <Box
      sx={{
        display: 'flex !important',
        flexDirection: 'column',
        flexWrap: 'nowrap',
        width: '100%',
        maxWidth: '100%',
        minWidth: '100%',
      }}
    >
      {children}
    </Box>
  )
}
export default DashboardContainer
