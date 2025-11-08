import React, { useState } from 'react'
import { Line } from 'react-chartjs-2'
import _ from 'lodash'
import { SensorDataType, SensorGridItem } from '../../api/sensor-types'
import {
  SensorGraphAlertSparsitySeries,
  SensorGraphDataSparsity,
  SensorGraphDisplayPreferences,
  SensorGraphSparsitySeries,
} from './sensor-graphs.types'
import { useChartOptions } from './use-chart-options'
import { useDataDisplayConfig } from './use-data-display-config'
import { Typography } from '@mui/material'
import { Box } from '@mui/system'

type SensorGraphTabProps = {
  dataSeries?: SensorGraphSparsitySeries
  alertLines?: Array<SensorGraphAlertSparsitySeries>
  cardData: SensorGridItem
  isPrint: boolean
  sensorContext: SensorDataType
}
export const defaultLineDisplayPreferences: SensorGraphDisplayPreferences = {
  useNoData: false,
  useInterpolated: true,
  useDownsampled: false,
  useOriginal: false,
  useAlertOverlay: true,
  useMaxMinLines: true,
  showMovingAverageLine: false,
  showConstantAverageLine: true,
  showGaps: true,
  showCubic: false,
  showAlertMaxLine: false,
  showAlertMinLine: false,
  showAlertMaxDurationExceeded: false,
  showAlertMinDurationExceeded: false,
}

const printAnimationOptions = {
  animation: {
    duration: 0, // general animation time
  },
  hover: {
    animationDuration: 0, // duration of animations when hovering an item
  },
  responsiveAnimationDuration: 0, // animation duration after a resize
}

const SensorGraphTab: React.FC<SensorGraphTabProps> = ({ dataSeries, alertLines, cardData, isPrint, sensorContext }) => {
  const [displayPreferences, setDisplayPreferences] = useState<SensorGraphDisplayPreferences>({ ...defaultLineDisplayPreferences })
  // #TODO: callbacks/ side effects to modify display preferences

  const gapThreshold = 3600
  const sparsityTarget: SensorGraphDataSparsity = 'RAW'

  const displayData = useDataDisplayConfig({
    dataSeries,
    alertLines,
    displayPreferences,
    sparsityTarget,
    dataContext: sensorContext,
    cardInfo: cardData,
  })

  // useChartOptions to dynamically adjust coloring and line style based on datatype, criticality, and user preference
  // Status is necessary here becasue destructuring causes typescript to lose context.
  const { status, options, data } = useChartOptions({ displayData, displayPreferences })

  // This line forces chartjs to remove animations when printing
  const displayOptions = isPrint ? { ...options, ...printAnimationOptions } : { ...options }
  const nameKey = `${cardData.sensorId}-${cardData.sensorName}-${sensorContext}`
  const divKey = isPrint ? `${nameKey}-print` : nameKey
  return status === 'valid' ? (
    <Box key={divKey}>
      <Line data={data} options={displayOptions} datasetKeyProvider={(dataset) => `${dataset.label}-${divKey}`} />
    </Box>
  ) : (
    <Typography> No Data to Display for current date range...</Typography>
  )
}
export default SensorGraphTab
