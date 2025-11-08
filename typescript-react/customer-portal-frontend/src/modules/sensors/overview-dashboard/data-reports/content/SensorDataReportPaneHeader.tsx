import React from 'react'
import { PDaySelector, PDropdownSelect } from '../../../../../webapp-lib/pathspot-react/atomic'
import { Atomic } from '../../../../../webapp-lib/pathspot-react'
import { CPopover } from '@coreui/react'
import { PathSpotAlert } from '../../../../../webapp-lib/pathspot-react/assets/icons/pathspot/catalog'
import { element, iconAlignment, tooltipAlignment } from '../../../../../webapp-lib/pathspot-react/atomic/styles/containers'
import { useFela } from 'react-fela'
import { grayInput } from '../../../../../webapp-lib/pathspot-react/styles/ts/colors'
import { stringToMoment } from '../../../api/sensor-api.api'

const SensorDataReportPaneHeader = (props: any) => {
  const {
    reportSelections,
    isDepartmentContext,
    locationOptions,
    departmentOptions,
    onSelectedDayChange,
    onNextDay,
    onPreviousDay,
    onLocationChange,
    onDepartmentChange,
  } = props
  const {
    selectedDate: _selectedDate,
    selectedLocation,
    selectedReport,
    selectedDepartment,
  } = reportSelections ? reportSelections : ({} as any)
  const { css } = useFela()
  const tooltipMessage = (
    <span className={css(element({ width: '20rem' }))}>
      <p>{'Record temperatures two (2) times during each 24 hour period. One AM and one PM.'}</p>
      <ul>
        <li>{'Refrigerator internal temperatures above 41 °F (5° C) are out of range. Best practice is 36-38° F (2- 3° C)'}</li>
        <li>{'Freezer internal temperatures above 5 °F (-15° C) are out of range. Best practice is 0° F (-18° C)'}</li>
      </ul>

      <p>{'Each refrigerator/freezer must have a working thermometer that measures internal temperature.'}</p>
    </span>
  )
  const selectedDate = stringToMoment(_selectedDate, 'YYYY-MM-DD hh:mm a').toDate()
  return (
    <Atomic.PContainer isColumn alignItems="center">
      <Atomic.PElement isRow widthIsMin justifyContent="center" width="100%">
        <Atomic.PTitle title={selectedReport && selectedReport.label ? selectedReport.label : 'HACCP Form'} />
        <CPopover header="Details" content={tooltipMessage}>
          <span className={css(tooltipAlignment({ width: '2rem' }))}>
            <PathSpotAlert className={css(iconAlignment)} fillColor={grayInput} />
          </span>
        </CPopover>
      </Atomic.PElement>

      <Atomic.PContent isRow justifyContent="space-between" width="100%">
        <Atomic.PElement isRow widthIsMin justifyContent="flex-start" width="30%" height="3.5rem">
          <PDaySelector
            selectedDate={selectedDate}
            setSelectedDate={onSelectedDayChange}
            onNextDay={onNextDay}
            onPreviousDay={onPreviousDay}
            height="2.25rem"
          />
        </Atomic.PElement>

        <Atomic.PElement isRow widthIsMin justifyContent="flex-end" width="30%" height="3.5rem">
          <PDropdownSelect
            fontSize="1rem"
            value={isDepartmentContext ? selectedDepartment : selectedLocation}
            width="100%"
            options={isDepartmentContext ? departmentOptions : locationOptions}
            placeholder="Current Location or Department"
            onChange={isDepartmentContext ? onDepartmentChange : onLocationChange}
          />
        </Atomic.PElement>
      </Atomic.PContent>
    </Atomic.PContainer>
  )
}

export default SensorDataReportPaneHeader
