import { cloneDeep, isNumber } from 'lodash'
import { SensorAlertCriticalityEnum, SensorDataTypeEnum } from '../../api/sensor-types'
import {
  SensorGraphLineDisplayCategory,
  SensorGraphDisplayDataset,
  SensorGraphLineType,
  SensorGraphLineDisplayOptions,
} from './sensor-graphs.types'
import { PointStyle } from 'chart.js'

export type LineDisplayColor = {
  PRIMARY: string
  SECONDARY: string
}
const pointStyles: Array<PointStyle> = ['dash', 'circle', 'cross', 'crossRot', 'line', 'rect', 'rectRounded', 'rectRot', 'star', 'triangle']
const defaultDisplayDataset: SensorGraphDisplayDataset = {
  label: '',
  data: undefined,
  fill: false,
  borderColor: '',
  backgroundColor: '',
  hoverOffset: 0,
  pointHoverRadius: 0,
  pointRadius: 0,
  pointBackgroundColor: '',
  pointBorderColor: '',
  showLine: true,
  legendOptions: { hidden: false, lineWidth: 3, pointStyle: 'line' },
}

export const GraphDisplayDatasetIndex: Record<SensorGraphLineType, SensorGraphDisplayDataset> = {
  TEMPERATURE: { ...defaultDisplayDataset },
  TEMPERATURE_SECONDARY: { ...defaultDisplayDataset },
  HUMIDITY: { ...defaultDisplayDataset },
  BATTERY: { ...defaultDisplayDataset },
  RSSI: { ...defaultDisplayDataset },
  'Alert Exceeded: HIGH (Max)': { ...defaultDisplayDataset },
  'Alert Exceeded: HIGH (Min)': { ...defaultDisplayDataset },
  'Alert Exceeded: LOW (Max)': { ...defaultDisplayDataset },
  'Alert Exceeded: LOW (Min)': { ...defaultDisplayDataset },
  'Alert Exceeded: MEDIUM (Max)': { ...defaultDisplayDataset },
  'Alert Exceeded: MEDIUM (Min)': { ...defaultDisplayDataset },
  'Alert: HIGH (Max)': { ...defaultDisplayDataset },
  'Alert: HIGH (Min)': { ...defaultDisplayDataset },
  'Alert: LOW (Max)': { ...defaultDisplayDataset },
  'Alert: LOW (Min)': { ...defaultDisplayDataset },
  'Alert: MEDIUM (Max)': { ...defaultDisplayDataset },
  'Alert: MEDIUM (Min)': { ...defaultDisplayDataset },
  'Constant Average': { ...defaultDisplayDataset },
  'Rolling Average': { ...defaultDisplayDataset },
  Unavailable: { ...defaultDisplayDataset },
}

const DATA_LINE_DISPLAY_COLORS: Record<SensorGraphLineDisplayCategory, LineDisplayColor> = {
  TEMPERATURE: { PRIMARY: '#027b97', SECONDARY: '#027b97' },
  TEMPERATURE_SECONDARY: { PRIMARY: '#027b97', SECONDARY: '#027b97' },
  HUMIDITY: { PRIMARY: '#117785', SECONDARY: '#00FFFFFF' },
  AVERAGE: { PRIMARY: '#a55095', SECONDARY: '#a55095' },
  UNAVAILABLE: { PRIMARY: '#99a2b2', SECONDARY: '#c5cad3' },
  BATTERY: { PRIMARY: '#2ae74a', SECONDARY: '#2ae74a' },
  RSSI: { PRIMARY: '#000000', SECONDARY: '#000000' },
  HIGH: { PRIMARY: '#ff0000', SECONDARY: '#e60000' },
  MEDIUM: { PRIMARY: '#e6e600', SECONDARY: '#cccc00' },
  LOW: { PRIMARY: '#71d8c9', SECONDARY: '#2ca08f' },
  UNKNOWN: { PRIMARY: '#ff33cc', SECONDARY: '#b30086' },
}

export const getGraphDataDisplayObject = <T extends SensorGraphLineType>(
  lineType: T,
  options: SensorGraphLineDisplayOptions = {}
): SensorGraphDisplayDataset => {
  //Generate an object to set how the lines on the graph will be displayed based on the data it represents and, in the case of an alert, the criticality as well as whether or not it is actual out of range data or an indicator line of the alert threshold (dashed)
  const displayObject = cloneDeep({ ...defaultDisplayDataset })
  if (Object.keys(SensorDataTypeEnum).includes(lineType)) {
    displayObject.backgroundColor = DATA_LINE_DISPLAY_COLORS[lineType as SensorGraphLineDisplayCategory].PRIMARY
    displayObject.borderColor = DATA_LINE_DISPLAY_COLORS[lineType as SensorGraphLineDisplayCategory].SECONDARY
    displayObject.pointBackgroundColor = DATA_LINE_DISPLAY_COLORS[lineType as SensorGraphLineDisplayCategory].PRIMARY
    displayObject.pointBorderColor = DATA_LINE_DISPLAY_COLORS[lineType as SensorGraphLineDisplayCategory].PRIMARY
    displayObject.hoverOffset = 20
    displayObject.pointHoverRadius = 8
    displayObject.pointRadius = undefined
  } else {
    const alertKey = Object.keys(SensorAlertCriticalityEnum).find((criticality) => lineType.includes(criticality))
    if (alertKey) {
      const alertColor = DATA_LINE_DISPLAY_COLORS[alertKey as SensorGraphLineDisplayCategory]
      const isMultiAlert = isNumber(options.multiAlertIdx)
      const alertIdxStr = isMultiAlert ? ` #${options.multiAlertIdx}` : ''
      const isMax = lineType.includes('Max')
      const alertIdx = options.multiAlertIdx || 1
      const lineTypeLabel = options.isComboLine ? 'Alert Max/Min' : `${lineType}`
      const label = isMultiAlert ? `${lineTypeLabel} ${alertIdxStr}` : `${lineTypeLabel}`
      displayObject.label = label
      displayObject.legendOptions!.text = label

      //If 'Exceeded' is part of the line type, the data is out of range; highlight the region that is out of range
      const isOutOfRangeDuration = lineType.includes('Exceeded')
      if (isOutOfRangeDuration) {
        displayObject.showLine = true
        displayObject.borderWidth = 10
        displayObject.borderColor = alertColor.SECONDARY
        displayObject.backgroundColor = alertColor.SECONDARY
        displayObject.pointBackgroundColor = alertColor.SECONDARY
        displayObject.pointBorderColor = alertColor.SECONDARY
        displayObject.borderCapStyle = 'round'
        displayObject.legendOptions!.lineWidth = 1
        displayObject.legendOptions!.pointStyle = 'circle'
      } else {
        displayObject.borderDash = [10 * alertIdx, 10 * alertIdx]
        displayObject.borderColor = alertColor.PRIMARY
        displayObject.backgroundColor = alertColor.PRIMARY
        displayObject.pointBackgroundColor = alertColor.PRIMARY
        displayObject.pointBorderColor = alertColor.PRIMARY
        //We could possible change the line point style if things are difficult to see with multiple alerts of the same kind
        // displayObject.pointStyle = pointStyles[alertIdx]
        // displayObject.legendOptions.pointStyle = pointStyles[alertIdx]
        displayObject.legendOptions!.lineDash = [3 * alertIdx, 3 * alertIdx]
      }
    } else {
      const isAverage = lineType.includes('Average')
      const isMissing = lineType.includes('Unavailable')
      const colorSet = isAverage
        ? DATA_LINE_DISPLAY_COLORS.AVERAGE
        : isMissing
        ? DATA_LINE_DISPLAY_COLORS.UNAVAILABLE
        : DATA_LINE_DISPLAY_COLORS.UNKNOWN
      displayObject.label = lineType
      displayObject.fill = false
      displayObject.hoverOffset = 4
      displayObject.pointHoverRadius = 8
      displayObject.borderColor = colorSet.PRIMARY
      displayObject.backgroundColor = colorSet.PRIMARY
      displayObject.pointBackgroundColor = colorSet.PRIMARY
      displayObject.pointBorderColor = colorSet.PRIMARY
      if (isMissing && options.hasGaps) {
        displayObject.borderWidth = 10
        displayObject.borderCapStyle = 'round'
        displayObject.borderColor = colorSet.SECONDARY
        displayObject.backgroundColor = colorSet.SECONDARY
        displayObject.pointBackgroundColor = colorSet.SECONDARY
        displayObject.pointBorderColor = colorSet.SECONDARY
      }
    }
  }
  displayObject.hidden = options.hidden === true ? true : false
  displayObject.legendOptions!.hidden = options.hidden === true ? true : false
  if (options.isComboLine) {
    displayObject.legendOptions!.lineDash = [2, 2]
  }
  return { ...displayObject }
}
