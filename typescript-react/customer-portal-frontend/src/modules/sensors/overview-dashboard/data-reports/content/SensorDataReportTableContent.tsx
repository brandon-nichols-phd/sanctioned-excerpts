import React from 'react'
import { Atomic } from '../../../../../webapp-lib/pathspot-react'
import SensorDataReportTableContentRow from './SensorDataReportTableContentRow'

const SensorDataReportTableContent = (props: any) => {
  const { tableColumns, items, tableCallbacks } = props
  return (
    <Atomic.PTable>
      {items.map((item: any, idx: number) => {
        return (
          <SensorDataReportTableContentRow
            key={`${item.sensorName}-table-row-${idx}`}
            rowIdx={idx}
            tableColumns={tableColumns}
            item={item}
            tableCallbacks={tableCallbacks}
          />
        )
      })}
    </Atomic.PTable>
  )
}

export default SensorDataReportTableContent
