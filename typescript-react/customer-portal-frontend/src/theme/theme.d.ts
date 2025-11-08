import '@mui/material/Paper'
import '@mui/material/Typography'
//You have to override MUI component types to use variants in most cases.
declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    sensorCard: true
    sensorCardAlert: true
    cardBlank: true
    layoutFlexRowBetween: true
    layoutFlexColumnCenter: true
    cardBlank: true
  }
}
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    SensorCardGroup: true
  }
}
