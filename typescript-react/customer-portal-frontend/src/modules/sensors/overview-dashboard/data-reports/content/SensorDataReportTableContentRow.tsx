import React from 'react'
import { Atomic } from '../../../../../webapp-lib/pathspot-react'
import { v4 as uuidv4 } from 'uuid'

const componentUUID = uuidv4()

const SensorDataReportTableContentRow = (props: any) => {
  const { tableColumns, item, rowIdx, tableCallbacks } = props

  return (
    <Atomic.PTableRow key={`${item && item.sensorName ? item.sensorName : ''}-table-item-row${rowIdx}-outer`}>
      {tableColumns?.map((colAttr: any, idx: number) => {
        const { TableElement, width, label, valueKey, labelKey, type, readOnly, cstyles, stateStyling } = colAttr
        const key = `${valueKey || label}-table-item-row${rowIdx}-col${idx}-${componentUUID}`
        const isDisabled = labelKey === 'sensorName' && !((item.time && item.temperature) || item.comment || item.override)
        return (
          <Atomic.PTableElement
            key={key}
            value={undefined}
            rowIdx={rowIdx}
            TableElement={(props: any) => <TableElement {...props} disabled={isDisabled} />}
            width={width}
            item={item}
            valueKey={valueKey}
            label={undefined}
            labelKey={labelKey}
            colIdx={idx}
            type={type}
            callback={tableCallbacks[valueKey]}
            readOnly={readOnly}
            cstyles={cstyles}
            stateStyling={stateStyling}
          />
        )
      })}
    </Atomic.PTableRow>
  )
}

export default SensorDataReportTableContentRow
