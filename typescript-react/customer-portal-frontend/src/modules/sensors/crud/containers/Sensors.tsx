import CIcon from '@coreui/icons-react'
import React, { useEffect, useState } from 'react'
import { USER_RENDER_MODE } from '../../../../api/constants'
import SensorTablePanel from '../content/SensorTablePanel'

const Sensors = () => {
  const [renderContext, setRenderContext] = useState({ renderMode: USER_RENDER_MODE.DEFAULT, columnHeaders: null, tableFields: null })

  const getRenderContext = (filters?: any) => {
    let columnHeaders: any = {}
    let tableFields: any[] = []
    let returnFormat: any = {}

    columnHeaders = {
      sensorName: 'Name',
      sensorType: 'Sensor Type',
      sensorEui: 'Dev-EUI',
      category: 'Category',
      unitType: 'Unit Type',
      locationName: 'Location',
      departmentName: 'Department',
      alertsConfigured: 'Alerts Configured',
      lastModified: 'Last Modified',
      active: 'Active',
      options: <CIcon name={'cil-options'} className={'mx-2'} />,
    }

    tableFields = [
      { key: 'sensorName', _style: { width: 'auto' } },
      { key: 'sensorType', _style: { width: 'auto' } },
      { key: 'sensorEui', _style: { width: 'auto' } },
      { key: 'category', _style: { width: 'auto' } },
      { key: 'unitType', _style: { width: 'auto' } },
      { key: 'locationName', _style: { width: 'auto' } },
      { key: 'departmentName', _style: { width: 'auto' } },
      { key: 'alertsConfigured', _style: { width: 'auto' } },
      { key: 'lastModified', _style: { width: 'auto' } },
      { key: 'active', _style: { width: 'auto', marginTop: '5%' } },
      {
        key: 'options',
        _style: { width: 'auto' },
        label: '', // () =>  <CIcon name={'cil-options'} className={'mx-2'} />,
        sorter: false,
        filter: false,
      },
    ]

    returnFormat = { ...returnFormat, columnHeaders, tableFields }
    return returnFormat
  }

  useEffect(() => {
    const rc: any = getRenderContext()
    setRenderContext(rc)
  }, [])

  return (
    <div>
      <SensorTablePanel colHeaders={renderContext.columnHeaders} tableFields={renderContext.tableFields} />
    </div>
  )
}

export default Sensors
