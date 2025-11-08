import { useEffect, useMemo, useState } from 'react'

import { ChartData, ChartLegendLabelItem, ChartLegendOptions, ChartOptions, ChartTitleOptions, PositionType } from 'chart.js'
import { SensorGraphDisplay, SensorGraphDisplayData, SensorGraphDisplayDataset, SensorGraphDisplayPreferences } from './sensor-graphs.types'
import { SensorDataType, SensorGridItem, SensorTemperatureUnit } from '../../api/sensor-types'
import { degreesCelsius, degreesFarenheit } from '../../api/sensor-constants'
import { isNumber } from 'lodash'

type SensorChartOptionsProps = {
  displayData: SensorGraphDisplayData | undefined
  displayPreferences: SensorGraphDisplayPreferences
}

export const useChartOptions = ({ displayData, displayPreferences }: SensorChartOptionsProps): SensorGraphDisplay => {
  if (!displayData) {
    return { status: 'invalid', options: undefined, data: undefined }
  }
  const options: ChartOptions = {
    elements: {
      line: {
        tension: 0.5,
      },
    },
    legend: {
      position: 'bottom' as PositionType,
      align: 'center',
      display: true,
      fullWidth: true,
      labels: {
        usePointStyle: true,
        boxWidth: 100,
        filter: (legendItem: ChartLegendLabelItem, data: SensorGraphDisplayData) => {
          if (isNumber(legendItem.datasetIndex)) {
            const dataLegendOptions = data.datasets[legendItem.datasetIndex]?.legendOptions
            legendItem.pointStyle = dataLegendOptions?.pointStyle || legendItem.pointStyle
            legendItem.lineWidth = dataLegendOptions?.lineWidth || legendItem.lineWidth
            legendItem.fillStyle = dataLegendOptions?.fillStyle || legendItem.fillStyle
            legendItem.text = dataLegendOptions?.text || legendItem.text
            legendItem.strokeStyle = dataLegendOptions?.strokeStyle || legendItem.strokeStyle
            legendItem.lineDash = dataLegendOptions?.lineDash || legendItem.lineDash
            return dataLegendOptions?.hidden !== true
          }
          return true
        },
      },
    } as ChartLegendOptions,
    title: {
      display: false,
      text: '',
      fontSize: 16,
      padding: 10,
    } as ChartTitleOptions,
    responsive: true,
    scales: {
      yAxes: [
        {
          display: true,
          scaleLabel: {
            display: true,
            labelString: displayData.axes.y.label,
          },
          ticks: {
            maxTicksLimit: 10,
            suggestedMax: displayData.axes.y.lims?.max || 100,
            suggestedMin: displayData.axes.y.lims?.min || 0,
          },
        },
      ],
      xAxes: [
        {
          ticks: {
            maxTicksLimit: 10,
            maxRotation: 0,
            minRotation: 0,
          },
        },
      ],
    },
    plugins: {},
    hover: {
      mode: 'index',
      intersect: false,
    },
    tooltips: {
      position: 'nearest',
      mode: 'index',
      intersect: false,
    },
  }

  return { status: 'valid', options, data: displayData }
}
