import React, { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'
import { SensorCategory, SensorGridItem } from '../../api/sensor-types'

import { SensorGridGroupContainer } from './SensorGridGroupContainer'
import LoadingSpinner from '../../../generic/LoadingSpinner'
import { useSensorOverview } from '../context/useSensorOverview'
import { SENSOR_CARD_WIDTH_REM } from '../../api/sensor-constants'

const sortSensorGroup = (sensorGroup: Array<SensorGridItem>): Array<SensorGridItem> => {
  const sortingObject: Record<'onAlert' | 'inRange' | 'noRange' | 'offline', Array<SensorGridItem>> = {
    onAlert: [],
    inRange: [],
    noRange: [],
    offline: [],
  }

  for (const sensor of sensorGroup) {
    if (!sensor.primaryDataCurrent) {
      sortingObject.offline.push(sensor)
    } else if (sensor.primaryDataOutOfAlertsRange) {
      sortingObject.onAlert.push(sensor)
    } else if (sensor.primaryDataAlerts) {
      sortingObject.inRange.push(sensor)
    } else {
      sortingObject.noRange.push(sensor)
    }
  }
  // Sort each group alphabetically by name
  Object.values(sortingObject).forEach((group) => group.sort((a, b) => a.sensorName.localeCompare(b.sensorName)))

  // Flatten groups in defined order
  return [...sortingObject.onAlert, ...sortingObject.inRange, ...sortingObject.noRange, ...sortingObject.offline]
}

const getLayoutColumns = (nCards: number, maxCardsInRow: number, nGroups: number): number => {
  if (nGroups <= 4) {
    // If you have 2-4 groups, use fun logic to based on number of cards to set container width
    //Otherwise just return equal column count groups
    // return nCards <= Math.floor(maxCardsInRow / nGroups) ? nCards : Math.floor(maxCardsInRow / nGroups)
    return nCards <= maxCardsInRow ? nCards : maxCardsInRow
  } else if (nGroups < maxCardsInRow) {
    return Math.floor(maxCardsInRow / nGroups)
  } else {
    // If the number of groups exceeds the number of cards you could fit on a row, restrict each group to a single column
    return 1
  }
}

export const SensorGridContainer: React.FC = () => {
  const [groupedSensors, setGroupedSensors] = useState<{ [index: SensorCategory]: Array<SensorGridItem> } | null>(null)

  const boxRef = useRef<HTMLDivElement>(null)
  const [maxRemWidth, setMaxRemWidth] = useState<number | null>(null)
  const { gridItems, isLoading } = useSensorOverview()

  // Creat observer to monitor window resizing and adjust cards accordingly
  // isLoading dependency so box size is set once data fetching is complete
  useEffect(() => {
    if (!boxRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      const { width } = entry.contentRect
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const remWidth = width / rootFontSize
      setMaxRemWidth(remWidth)
    })

    observer.observe(boxRef.current)
    return () => observer.disconnect()
  }, [isLoading])

  useEffect(() => {
    if (gridItems?.length && isLoading === false) {
      // console.debug('Grid items may have changed...')

      setGroupedSensors(() => {
        // console.debug('Grid items changed and are being reset..')

        // Group sensors by category
        const grouped = gridItems.reduce((acc: { [index: SensorCategory]: Array<SensorGridItem> }, sensor: SensorGridItem) => {
          if (acc[sensor.category]) {
            acc[sensor.category]?.push(sensor)
          } else {
            acc[sensor.category] = [sensor]
          }
          return acc
        }, {})
        // Sort items within sensor groups
        const groupSorted = Object.fromEntries(
          Object.entries(grouped).map(([category, sensorArray]) => {
            return [category, sortSensorGroup(sensorArray)]
          })
        )
        // Return alphabetically ordered map of sensor groups
        return Object.fromEntries(Object.entries(groupSorted).sort(([a], [b]) => a.localeCompare(b)))
      })
    }
  }, [gridItems, isLoading])

  if (!(gridItems && gridItems.length > 0) || isLoading) {
    return <LoadingSpinner message="Loading Sensor Data...." />
  }

  const nGroups = groupedSensors ? Object.keys(groupedSensors).length : 0
  return (
    <Box
      ref={boxRef}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        flex: '0 0 100%',
        paddingBottom: '3rem',
        marginBottom: '3rem',
      }}
    >
      {maxRemWidth === null ? (
        <LoadingSpinner message="Loading Sensor Data...." />
      ) : (
        groupedSensors !== null &&
        nGroups && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'center',
              flex: '0 0 100%',
            }}
          >
            {Object.entries(groupedSensors).map(([category, sensorList]) => {
              const nSensorCards = sensorList.length
              // Don't render group if no cards exist for it
              if (!nSensorCards) {
                return <></>
              }
              // Max cards based on relative width of container to card; ncols * width of card not to exceed 95% of total width to gaurantee number of cols can accommodate padding and margins
              const maxCardsInRow = Math.floor((0.95 * maxRemWidth) / SENSOR_CARD_WIDTH_REM)
              const cols = getLayoutColumns(nSensorCards, maxCardsInRow, nGroups)
              // Add nCols based card width to make sure group can accomodate padding and gaps between cards
              const remWidthCols = cols * SENSOR_CARD_WIDTH_REM + (cols / maxRemWidth + 0.25) * SENSOR_CARD_WIDTH_REM
              // Don't exceed the max width. If the group width is > 90% of the max width, just make it the full width
              const remWidth = remWidthCols > maxRemWidth ? maxRemWidth : remWidthCols > 0.9 * maxRemWidth ? maxRemWidth : remWidthCols
              return <SensorGridGroupContainer key={category} group={sensorList} remWidth={remWidth} category={category} />
            })}
          </Box>
        )
      )}
    </Box>
  )
}
