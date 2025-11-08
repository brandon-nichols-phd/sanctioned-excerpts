import { units } from '../../../../webapp-lib/pathspot-react'
import { SensorDataTypeEnum, SensorDataUnitEnum, SensorTemperatureUnit } from '../../api/sensor-types'
import {
  SensorGraphDisplayPreferences,
  SensorGraphDisplayDataset,
} from './sensor-graphs.types'
import {
  SensorOverviewGraphData,
  createDefaultSensorIndependentData,
  createDefaultSensorDependentData,
} from '../../monitored-processes/api/sensor-process.types'
import * as colors from '../../styles/colors'

export const okayButton = {
  buttonType: 'button',
  buttonText: 'Close Window',
  buttonIcon: 'cil-x',
  buttonClass: 'mx-1 pr-3',
  buttonColor: 'primary',
  buttonShape: 'standard',
  buttonSize: 'sm',
}
export const exportButton = {
  buttonType: 'button',
  buttonText: 'Export to .csv',
  buttonIcon: 'cil-arrow-thick-from-top',
  buttonClass: 'mx-1 pr-3',
  buttonColor: 'primary',
  buttonShape: 'standard',
  buttonSize: 'sm',
}
export const pdfButton = {
  buttonType: 'button',
  buttonText: 'Create PDF',
  buttonIcon: 'cil-print',
  buttonClass: 'mx-1 pr-3',
  buttonColor: 'primary',
  buttonShape: 'standard',
  buttonSize: 'sm',
}
export const TemperatureUnitKeys = {
  [SensorDataTypeEnum.TEMPERATURE]: 'temperatureUnit',
  [SensorDataTypeEnum.TEMPERATURE_SECONDARY]: 'temperatureSecondaryUnit',
}

export const TemperatureDataKeys = {
  [SensorDataTypeEnum.TEMPERATURE]: 'temperatureData',
  [SensorDataTypeEnum.TEMPERATURE_SECONDARY]: 'temperatureSecondaryData',
}
export const TemperatureYLabels = {
  [SensorDataUnitEnum.C]: units.degreesCelsius,
  [SensorDataUnitEnum.F]: units.degreesFarenheit,
}
export const SensorGraphYLabels = {
  [SensorDataTypeEnum.BATTERY]: '%',
  [SensorDataTypeEnum.HUMIDITY]: '%',
  [SensorDataTypeEnum.RSSI]: 'dB',
  [SensorDataTypeEnum.TEMPERATURE]: (unit: SensorTemperatureUnit) => TemperatureYLabels[unit],
  [SensorDataTypeEnum.TEMPERATURE_SECONDARY]: (unit: SensorTemperatureUnit) => TemperatureYLabels[unit],
}

export const makeDefaultGraphData = (): SensorOverviewGraphData => {
  return {
    time: { ...createDefaultSensorIndependentData() },
    temperature: { ...createDefaultSensorDependentData() },
    temperatureSecondary: { ...createDefaultSensorDependentData() },
    humidity: { ...createDefaultSensorDependentData() },
    battery: { ...createDefaultSensorDependentData() },
    rssi: { ...createDefaultSensorDependentData() },
  }
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

export const defaultSensorGraphDataDisplayAttributes: SensorGraphDisplayDataset = {
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
  yAxisLabelString: '',
  ymaxKey: '',
  yminKey: '',
} as any
export const sensorChartAttributes = {
  [SensorDataTypeEnum.TEMPERATURE]: {
    cubicInterpolationMode: 'monotone',
    fill: false,
    borderColor: colors.temperatureDataBackground,
    backgroundColor: colors.temperatureData,
    hoverOffset: 20,
    pointHoverRadius: 6,
    pointRadius: undefined,
    pointBackgroundColor: colors.temperatureData,
    pointBorderColor: colors.temperatureData,
    ymaxKey: 'temperatureMax',
    yminKey: 'temperatureMin',
  } as unknown as SensorGraphDisplayDataset,
  [SensorDataTypeEnum.TEMPERATURE_SECONDARY]: {
    cubicInterpolationMode: 'monotone',
    fill: false,
    borderColor: colors.temperatureDataBackground,
    backgroundColor: colors.temperatureData,
    hoverOffset: 20,
    pointHoverRadius: 8,
    pointBackgroundColor: colors.temperatureData,
    pointBorderColor: colors.temperatureData,
    ymaxKey: 'temperatureSecondaryMax',
    yminKey: 'temperatureSecondaryMin',
  } as unknown as SensorGraphDisplayDataset,
  [SensorDataTypeEnum.HUMIDITY]: {
    cubicInterpolationMode: 'monotone',
    borderDash: undefined,
    fill: false,
    hoverOffset: 20,
    pointHoverRadius: 8,
    borderColor: colors.humidityData,
    backgroundColor: colors.humidityDataBackground,
    ymaxKey: 'humidityMax',
    yminKey: 'humidityMin',
  } as unknown as SensorGraphDisplayDataset,
  [SensorDataTypeEnum.BATTERY]: undefined,
  [SensorDataTypeEnum.RSSI]: undefined,
}
export const movingAverageAttributes: SensorGraphDisplayDataset = {
  label: 'Average',
  fill: false,
  hidden: true,
  borderColor: colors.rollingAverageDataBackground,
  backgroundColor: colors.rollingAverageData,
  hoverOffset: 4,
  pointHoverRadius: 8,
  pointBackgroundColor: colors.rollingAverageData,
  pointBorderColor: colors.rollingAverageData,
}
export const constantAverageAttributes: SensorGraphDisplayDataset = {
  label: 'Average',
  fill: false,
  hidden: true,
  borderColor: colors.averagedDataBackground,
  backgroundColor: colors.averagedData,
  hoverOffset: 4,
  pointHoverRadius: 8,
  pointBackgroundColor: colors.averagedData,
  pointBorderColor: colors.averagedData,
}
export const cubicInterpolantAttributes: SensorGraphDisplayDataset = {
  label: 'Cubic Interpolant',
  fill: false,
  borderColor: colors.criticalThreshold,
  backgroundColor: colors.criticalThreshold,
  hoverOffset: 4,
  pointHoverRadius: 8,
  pointBackgroundColor: colors.criticalThreshold,
  pointBorderColor: colors.criticalThreshold,
}
const noDataAttributes: SensorGraphDisplayDataset = {
  label: 'No Data',
  showLine: true,
  borderColor: colors.noDataGray,
  backgroundColor: colors.noDataGray,
  pointBackgroundColor: colors.noDataGray,
  pointBorderColor: colors.noDataGray,
}
const intervalDataAttributes: SensorGraphDisplayDataset = {
  label: 'No Data',
  showLine: true,
  borderWidth: 10,
  borderColor: colors.gapDataGray,
  backgroundColor: colors.gapDataGray,
  pointBackgroundColor: colors.gapDataGray,
  pointBorderColor: colors.gapDataGray,
  borderCapStyle: 'round',
}

const alertLineAttributes = {
  min: {
    label: 'Alert Min',
    borderDash: [10, 10],
    fill: false,
  } as SensorGraphDisplayDataset,
  max: {
    label: 'Alert Max',
    borderDash: [10, 10],
    fill: false,
  } as SensorGraphDisplayDataset,
  legendHidden: {
    label: 'Alert Min',
    fillStyle: 'rgb(255, 255, 255, 0)',
    lineWidth: undefined,
    text: '',
    hidden: true,
    strokeStyle: 'rgb(255, 255, 255, 0)',
  },
  legendCombined: {
    label: 'Alert Max',
    text: 'Alert Max/Min',
    lineDash: [2, 2],
  },
}
export const defaultDataArray = [
  makeDefaultGraphData(),
  makeDefaultGraphData(),
  makeDefaultGraphData(),
  makeDefaultGraphData(),
  makeDefaultGraphData(),
  makeDefaultGraphData(),
  makeDefaultGraphData(),
  makeDefaultGraphData(),
]
