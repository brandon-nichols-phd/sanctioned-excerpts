import React, { useEffect, useCallback, useLayoutEffect, useState } from 'react'
import { StyledSpinner, cancelButtonLight, CIconButton } from '../../../webapp-lib/pathspot-react'
import { getAccessTokens, updateAccessTokens } from './api-management.api'
import { CDataTable } from '@coreui/react'

const tableDataColumnNames = []

const fieldsTableData = []

const APIAccessTokenList = (props: any) => {
  const { setRefreshList, refreshList } = props
  const [tableData, setTableData] = useState<any>(null)
  const [isFetching, setIsFetching] = useState<any>(false)
  const fetchAccessTokens = useCallback(async () => {
    if (tableData === null || refreshList === true) {
      const responseObj = await getAccessTokens()
      // const responseData = JSON.parse(responseObj.data)
      const responseData = responseObj.data
      const sortedData =
        responseObj && responseObj.data ? (responseData as Array<{ id: number | string }>).sort((a, b) => (a.id > b.id ? -1 : 1)) : null

      setTableData(sortedData)
      if (refreshList === true) {
        setRefreshList(false)
      }
    }
  }, [refreshList])

  useEffect(() => {
    fetchAccessTokens()
  }, [fetchAccessTokens])

  const revokeToken = useCallback(async (item: any) => {
    const { userId, ...payload } = item
    payload.active = false
    const status = await updateAccessTokens({ ...payload })
    // const newItem = JSON.parse(status.data)
    fetchAccessTokens()
  }, [])

  const displayRevokeButton = (item: any) => {
    const buttonProps = { ...cancelButtonLight }
    buttonProps.buttonText = 'Revoke'
    buttonProps.buttonColor = 'danger'
    return item.active ? (
      <td className="py-2 text-center">
        <CIconButton {...buttonProps} onClickAction={() => revokeToken(item)} />
      </td>
    ) : (
      <td className="py-2 text-center">{`Inactive Token.`}</td>
    )
  }

  if (tableData === null) {
    return <StyledSpinner />
  }

  return (
    <CDataTable
      items={tableData}
      fields={fieldsTableData}
      columnHeaderSlot={tableDataColumnNames}
      loading={isFetching}
      columnFilter
      tableFilter={false}
      hover
      sorter
      itemsPerPage={50}
      pagination={{
        align: 'center',
      }}
      scopedSlots={{
        revokeTokenButton: displayRevokeButton,
      }}
    />
  )
}
export default APIAccessTokenList
