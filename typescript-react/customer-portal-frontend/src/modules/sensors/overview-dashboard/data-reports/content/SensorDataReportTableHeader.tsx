import React from 'react'
import { useFela } from 'react-fela'
import { pathspotPrimary } from '../../../../../webapp-lib/pathspot-react/styles/ts/colors'
import { Atomic } from '../../../../../webapp-lib/pathspot-react'
import { v4 as uuidv4 } from 'uuid'
const componentKey = uuidv4()
const bottomBorder = (args: any) => {
  return {
    display: 'inline-flex !important',
    flexDirection: 'row',
    alignItems: 'center',
    width: '98%',
    borderWidth: '0.5px',
    borderStyle: 'solid',
    borderColor: pathspotPrimary,
  }
}
const headerAttrs = (args: any = {}) => {
  const { textAlign, fontSize, fontStyle, fontWeight, color } = args
  return {
    display: 'inline-flex !important',
    flexDirection: 'row',
    textAlign: textAlign || undefined,
    fontSize: fontSize || '1.15rem',
    fontStyle: fontStyle || 'normal',
    fontWeight: fontWeight || '600',
    color: color || pathspotPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  }
}
const SensorDataReportTableHeader = (props: any) => {
  const { tableColumns } = props
  const { css } = useFela()
  return (
    <Atomic.PContainer>
      <Atomic.PTableRow key={`table-row-header-${componentKey}`} isHeader>
        {tableColumns?.map((column: any, idx: number) => {
          const label = column.label || ''
          return (
            <Atomic.PTableElement
              key={`${label}-table-header-col-${idx}`}
              value={label}
              TableElement={Atomic.PItemText}
              elementArgs={{ ...headerAttrs() }}
              width={column.width}
              rowIdx={0}
              colIdx={idx}
            />
          )
        })}
      </Atomic.PTableRow>
      <div className={css(bottomBorder)}>{''}</div>
    </Atomic.PContainer>
  )
}

export default SensorDataReportTableHeader
