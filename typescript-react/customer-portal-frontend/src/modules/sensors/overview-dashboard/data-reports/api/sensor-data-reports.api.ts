import { FormattedReading, ReportTableRow, TableFormattedReading } from '../sensor-data-reports.types'
import { celsiusToFarenheit, degreesCelsius, degreesFarenheit } from '../../../../../webapp-lib/pathspot-react/api/base/units'
import moment from 'moment'

export enum TempCategory {
  LineFridge = 'Line Fridge',
  Fridge = 'Fridge',
  WalkIn = 'Walk In',
  Freezer = 'Freezer',
  ServiceFreezer = 'Service Freezer',
}

export const isCoercedFiniteNumber = (value: unknown): boolean => Number.isFinite(Number(value));

export const reduceReportPayloadItems = (items: Array<TableFormattedReading>) => {
  const reducedItems = items.map((item: TableFormattedReading) => {
    const parsedTemperatureLimit = reportSensorValueLimit(item)
    const limitInC = item.temperature.unit.includes('C')
    const convertedLimit = parsedTemperatureLimit
      ? limitInC
        ? parsedTemperatureLimit
        : celsiusToFarenheit(parsedTemperatureLimit, 100)
      : null
    const tableReducedRow: ReportTableRow = {
      departmentId: item.departmentId,
      locationId: item.locationId,
      sensorCheckId: item.sensorCheckId,
      sensorId: item.sensorId,
      sensorCheckValue: false, //always false on first reception of items
      sensorName: item.sensorName,
      readingId: item.readingId,
      time: item.localCreatedWhen?.str
        ? moment(item.localCreatedWhen.str).utc().format('hh:mm a') // No conversions, only formatting
        : '',
      temperature: `${item.temperature.reading}${item.temperature.unit}`,
      user: item.signerName,
      override: item.override,
      overrideTime: item.override ? moment(item.overrideTime?.str).utc().format('hh:mm a') : '', // No conversions, only formatting
      overrideValue: item.override && isCoercedFiniteNumber(item.overrideValue) ? parseFloat(item.overrideValue!) : NaN,
      comment: item.comment && item.comment !== '-' ? item.comment : '',
      outOfRange: reportSensorValueInRange(item),
      limitExceeded: reportSensorValueLimit(item),
      temperatureExceeded: `${convertedLimit} ${limitInC ? degreesCelsius : degreesFarenheit}`,
      unitType: item.unitType,
      previouslySigned: !!item.signerId || item.signerId === 0, // previously signed if there is truthy value in signer ID, or if the signer id is the value 0, which is acceptable.
    }
    return tableReducedRow
  })
  return [...reducedItems]
}

export const expandItems = (items: Array<any>) => {
  const expandedItems = items.map((item: any) => {
    return {
      ...item,
      overrideTime: item?.overrideWhen || '',
      overrideTemp: item?.overrideTemp ?? null,
    }
  })
  return [...expandedItems]
}

export const collapseItems = (items: Array<any>) => {
  const collapseedItems = items.map((item: any) => {
    const { overrideTemp, overrideTime, ...rest } = item
    return { ...rest }
  })
  return [...collapseedItems]
}

export const downloadPDFToDisk = (pdfB64String: string, filename: string) => {
  const fn = `${filename}.pdf`.replace(/ /g, '_')
  const link = document.createElement('a')
  link.setAttribute('href', 'data:application/pdf;base64,' + encodeURIComponent(pdfB64String))
  link.setAttribute('download', fn)
  link.click()
}

export const downloadXlsxToDisk = (xlsxB64String: string, filename: string) => {
  const fn = `${filename}.xlsx`.replace(/ /g, '_')
  const link = document.createElement('a')
  const header = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,'
  link.setAttribute('href', `${header}${xlsxB64String}`)
  link.setAttribute('download', fn)
  link.click()
}

export const extractSensorReportLocationDepartments = (args: any) => {
  if (args && args.source && args.source.departments) {
    const availableDepartments = args.source.departments
    const deptOpts = Object.keys(availableDepartments).map((deptKey: any) => {
      const dept = availableDepartments[deptKey]
      return { ...dept, label: dept.departmentName, value: dept.departmentId }
    })
    return deptOpts
  }
}

export const transformTableReportData = (reportItems: Array<FormattedReading>, tempInC: boolean): Array<TableFormattedReading> => {
  const temperatureUnit = tempInC ? degreesCelsius : degreesFarenheit
  return reportItems.map((item) => {
    const isOverrideValid = item.override && isCoercedFiniteNumber(item.overrideValue)
    const parsedOverrideValue = isOverrideValid ? Number(item.overrideValue) : undefined
    if (item.localCreatedWhen === null) {
      return {
        ...item,
        temperature: { reading: '', unit: 'Unavailable' },
        overrideTemperature: { reading: parsedOverrideValue != null ? (!tempInC ? celsiusToFarenheit(parsedOverrideValue, 100) : parsedOverrideValue).toFixed(1) : '',
        unit: temperatureUnit },
        overrideValue: parsedOverrideValue != null ? String(tempInC ? parsedOverrideValue : celsiusToFarenheit(parsedOverrideValue, 100)) : ''
      } as TableFormattedReading
    }
    if ((!item.localCreatedWhen?.str || item.sensorReading == null) && !item.override) {
      return {
        ...item,
        temperature: { reading: String(item.sensorReading), unit: 'Unavailable' },
        overrideTemperature: { reading: parsedOverrideValue != null ? (!tempInC ? celsiusToFarenheit(parsedOverrideValue, 100) : parsedOverrideValue).toFixed(1) : '',
        unit: temperatureUnit },
        overrideValue: parsedOverrideValue != null ? String(tempInC ? parsedOverrideValue : celsiusToFarenheit(parsedOverrideValue, 100)) : ''
      } as TableFormattedReading
    }

    const parsedSensorReading = parseFloat(String(item.sensorReading))
    const convertedTemperature = tempInC ? parsedSensorReading : celsiusToFarenheit(parsedSensorReading, 100)
    
    return {
      ...item,
      temperature: {
        reading: convertedTemperature.toFixed(1),
        unit: temperatureUnit
      },
      overrideTemperature: {
        reading: parsedOverrideValue != null ? (tempInC ? parsedOverrideValue : celsiusToFarenheit(parsedOverrideValue, 100)).toFixed(1) : '',
        unit: temperatureUnit
      },
      overrideValue: parsedOverrideValue != null ? String(tempInC ? parsedOverrideValue : celsiusToFarenheit(parsedOverrideValue, 100)) : ''
    } as TableFormattedReading
  })
}

export const reportSensorValueInRange = (item: TableFormattedReading) => {
  if (item.category.length > 0) {
    const category = item.unitType
    if (category.toLowerCase().includes('fridge') || category.toLowerCase().includes('chiller')) {
      if (parseFloat(String(item.sensorReading)) > 5) {
        return true
      }
    } else if (category.toLowerCase().includes('freezer')) {
      if (parseFloat(String(item.sensorReading)) > -15) {
        return true
      }
    }
  }
  return false
}

export const reportSensorValueLimit = (item: TableFormattedReading) => {
  if (item.category.length > 0) {
    const category = item.unitType
    if (category.toLowerCase().includes('fridge') || category.toLowerCase().includes('chiller')) {
      return 5
    } else if (category.toLowerCase().includes('freezer')) {
      return -15
    }
  }
  return NaN
}
