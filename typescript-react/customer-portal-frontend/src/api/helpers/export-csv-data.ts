import { isArray } from 'lodash'

export const convertDataToString = (datum: unknown) => {
  return datum
    ? datum
        .toString()
        .replace(/,/g, '')
        .replace(
          /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?)*/g,
          ''
        )
    : '-'
}
export const convertArrayOfObjectsToCSV = <T extends Partial<T>>(data: T, columnNames: Partial<Record<keyof T, string>>) => {
  let result: string
  type ColumnKey = keyof T
  const dataKeys: Array<ColumnKey> = Object.keys(data).map((key) => key as ColumnKey)
  const columnKeys: Array<ColumnKey> = Object.keys(columnNames).map((key) => key as ColumnKey)
  const columnDelimiter = ','
  const rowDelimiter = '\r\n'
  // console.log('-------------------Column names are: ', columnNames)
  if (!(Object.keys(data).length > 0)) {
    result = ''
    result += columnKeys.map((x: ColumnKey) => columnNames[x]).join(columnDelimiter)
    result += rowDelimiter
    return result
  }

  result = `${columnKeys.map((x: ColumnKey) => columnNames[x]).join(columnDelimiter)}${rowDelimiter}`

  const keyMaxIterator: { key: ColumnKey | null; currentMax: number } = {
    key: null,
    currentMax: 0,
  }
  dataKeys.forEach((dataKey: ColumnKey) => {
    const dataItems = data[dataKey]
    const dataLength = isArray(dataItems) ? dataItems.length : 0
    if (dataLength > keyMaxIterator.currentMax) {
      keyMaxIterator.key = dataKey
      keyMaxIterator.currentMax = dataLength
    }
  })
  // console.log('Initially, column row is: ', result)
  let rowIdx = 0
  if (columnKeys.some((key) => key === keyMaxIterator.key) && keyMaxIterator.key !== null) {
    const columnData = data[keyMaxIterator.key]
    if (isArray(columnData)) {
      const generatedCSVData = columnData.reduce((runningResult: string, item: T[keyof T]) => {
        // console.log('In first reducer runningResult, item, idx are: ', runningResult, item, rowIdx)
        const generateCSVRow = dataKeys.reduce((rowResult: string, dataKey: ColumnKey) => {
          // console.log('Row result, data key are: ', rowResult, dataKey)
          const rowData = data[dataKey]
          if (isArray(rowData)) {
            const rowValue = rowData[rowIdx]
            const rowString = convertDataToString(rowValue)

            // console.log('Rowstring is: ', rowString)
            if (rowResult.length === 0) {
              rowResult = `${rowString}`
              // if (rowIdx < 3) {
              //   console.log('777777 Row result in empty checker, currently: ', rowResult)
              //   console.log('Empty row string is: ', rowString)
              // }
            } else {
              // if (rowIdx < 3) {
              //   console.log('888888 Row result in NON empty checker, currently: ', rowResult)
              //   console.log('888888 NON-Empty row string is: ', rowString)
              // }
              rowResult = `${rowResult}${columnDelimiter}${rowString}`
              // if (rowIdx < 3) {
              //   console.log('99999 Row result in NON empty checker, currently: ', rowResult)
              //   console.log('999999 NON-Empty row string is: ', rowString)
              // }
            }
          }
          return rowResult
        }, '')
        runningResult = `${runningResult}${rowDelimiter}${generateCSVRow}`
        rowIdx++

        return runningResult
      }, result)

      return generatedCSVData
    }
  }
}

export const downloadGenerateCSV = <T extends Partial<T>>(data: T, columnNames: Partial<Record<keyof T, string>>, fileName: string) => {
  let finalFileName = fileName + '.csv'
  finalFileName = finalFileName.replace(/ /g, '_')

  const csv = convertArrayOfObjectsToCSV(data, columnNames)
  //console.log("[downloadCSV] data and csv are ", data, csv);
  const BOM = '\uFEFF'

  const link: HTMLAnchorElement = document.createElement('a')
  link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(BOM + csv))

  link.setAttribute('download', finalFileName)
  link.click()
}
