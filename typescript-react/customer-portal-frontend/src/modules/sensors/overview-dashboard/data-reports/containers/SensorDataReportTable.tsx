import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import SensorDataReportTableHeader from '../content/SensorDataReportTableHeader'
import SensorDataReportTableContent from '../content/SensorDataReportTableContent'
import { Atomic, StyledSpinner } from '../../../../../webapp-lib/pathspot-react'
import {
  pathspotPrimary,
  pathspotSecondary,
  pathspotWhite,
  toastifyError,
  toastifyError50,
} from '../../../../../webapp-lib/pathspot-react/styles/ts/colors'
import {
  CurrentReport,
  FormattedReading,
  OutboundReportSave,
  ReportSaveItem,
  ReportTableRow,
  TableRowContext,
  TimeMeridiem,
} from '../sensor-data-reports.types'
import { defaultButtonAttributes } from '../../../../../webapp-lib/pathspot-react/atomic/styles/buttons'
import { collapseItems, expandItems, reduceReportPayloadItems, transformTableReportData, isCoercedFiniteNumber } from '../api/sensor-data-reports.api'
import _ from 'lodash'
import { farenheitToCelsus } from '../../../../../webapp-lib/pathspot-react/api/base/units'
import { submitReportsDetailsForApprovals } from '../api/sensor-data-reports.requests'
import { CurrentUser } from '../../../../../api/authentication/AuthenticationContext'
import moment from 'moment'
import CorrectiveActionBox from '../content/CorrectiveActionBox'
import SensorDataReportSigningVerification from '../modal/SensorDataReportSigningVerification'
import { NoSelections } from '../modal/NoSelections'
import { ToastNotificaitonMessage, ToastNotification } from '../content/ToastNotification'

const baseTableColumns = [
  {
    label: 'Sensor',
    width: '25%',
    TableElement: Atomic.PCheckBox,
    type: 'boolean',
    labelKey: 'sensorName',
    valueKey: 'sensorCheckValue',
    readOnly: false,
    cstyles: [{ textAlign: 'left' }],
  },
  { label: 'Unit Type', width: '12%', TableElement: Atomic.PItemText, type: 'text', valueKey: 'unitType', readOnly: true },
  { label: 'Time', width: '12%', TableElement: Atomic.PItemText, type: 'text', valueKey: 'time', readOnly: true },
  {
    label: 'Temperature',
    width: '13%',
    TableElement: Atomic.PItemText,
    type: 'text',
    valueKey: 'temperature',
    readOnly: true,
    stateStyling: { key: 'outOfRange', states: { true: { backgroundColor: toastifyError50 } } },
  },
  { label: 'Action/Comment', width: '25%', TableElement: CorrectiveActionBox, type: 'text', valueKey: 'comment', readOnly: false },
  { label: 'User', width: '18%', TableElement: Atomic.PTextInput, type: 'text', valueKey: 'user', readOnly: true },
  { label: 'Override?', width: '10%', TableElement: Atomic.PCheckBox, type: 'boolean', valueKey: 'override', readOnly: false },
]
const extendedTableColumns = [
  {
    label: 'Sensor',
    width: '22.5%',
    TableElement: Atomic.PCheckBox,
    type: 'boolean',
    labelKey: 'sensorName',
    valueKey: 'sensorCheckValue',
    readOnly: false,
  },
  { label: 'Unit Type', width: '8%', TableElement: Atomic.PItemText, type: 'text', valueKey: 'unitType', readOnly: true },
  { label: 'Time', width: '8%', TableElement: Atomic.PItemText, type: 'text', valueKey: 'time', readOnly: true },
  {
    label: 'Temperature',
    width: '10%',
    TableElement: Atomic.PItemText,
    type: 'text',
    valueKey: 'temperature',
    readOnly: true,
    stateStyling: { key: 'outOfRange', states: { true: { backgroundColor: toastifyError50 } } },
  },
  { label: 'Action/Comment', width: '19.5%', TableElement: CorrectiveActionBox, type: 'text', valueKey: 'comment', readOnly: false },
  { label: 'User', width: '16%', TableElement: Atomic.PTextInput, type: 'text', valueKey: 'user', readOnly: true },
  { label: 'Override?', width: '6%', TableElement: Atomic.PCheckBox, type: 'boolean', valueKey: 'override', readOnly: false },
  { label: 'Override Time', width: '8%', TableElement: Atomic.PTimePicker, type: 'text', valueKey: 'overrideTime', readOnly: false },
  {
    label: 'Override Temperature',
    width: '9%',
    TableElement: Atomic.PTextInput,
    type: 'text',
    valueKey: 'overrideValue',
    readOnly: false,
  },
]
const buttonMargins = {
  marginLeft: '0.5rem',
  marginRight: '0.5rem',
  marginTop: '0.25rem',
  marginBottom: '0.25rem',
}
export const selectAll = {
  ...defaultButtonAttributes,
  name: 'selectAll',
  text: 'Select All',
  icon: 'cil-check-alt',
  margin: { ...buttonMargins },
  marginTop: '1rem',
  backgroundColor: pathspotPrimary,
  color: pathspotWhite,
}

export const signSelected = {
  ...defaultButtonAttributes,
  name: 'signSelected',
  text: 'Sign Selected',
  icon: 'cil-chevron-right',
  margin: { ...buttonMargins },
  marginTop: '1rem',
  backgroundColor: pathspotSecondary,
  color: pathspotWhite,
}

export const cancel = {
  ...defaultButtonAttributes,
  name: 'cancelButton',
  text: 'Cancel',
  icon: 'cil-x',
  margin: { ...buttonMargins },
  marginTop: '1rem',
  backgroundColor: toastifyError,
  color: pathspotWhite,
}

type SensorDataReportTableProps = {
  items: Array<FormattedReading>
  context: TimeMeridiem
  initialRowContext: TableRowContext
  tempInC: boolean
  currentReport: CurrentReport
  currentUser: CurrentUser
}

const SensorDataReportTable: React.FC<SensorDataReportTableProps> = ({
  items,
  context,
  initialRowContext,
  tempInC,
  currentReport,
  currentUser,
}) => {
  const [formattedItems, setFormattedItems] = useState<Array<ReportTableRow> | null>(null)
  const initialItems = useRef<Array<FormattedReading> | null>(null)
  const [tableColumns, setTableColumns] = useState<Array<Record<string, unknown>> | null>(null)
  const [rowContext, setRowContext] = useState<TableRowContext | null>(null)
  const [displayModal, setDisplayModal] = useState<boolean>(false)
  const [noSelectionsVisible, setNoSelectionsVisible] = useState<boolean>(false)
  const [modalCallback, setModalCallback] = useState<{ onConfirm: () => void; invalidData: Array<ReportTableRow> } | null>(null)
  const [toast, setToast] = useState<ToastNotificaitonMessage | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  useEffect(() => {
    if (currentUser.firstName || currentUser.lastName) {
      const localUserName = `${currentUser.firstName} ${currentUser.lastName}`
      if (userName !== localUserName) {
        setUserName(localUserName)
      }
    }
  }, [currentUser])

  useEffect(() => {
    if (items.length > 0) {
      setRowContext(initialRowContext)
      initialItems.current = _.cloneDeep(items)
      setTableColumns(initialRowContext === TableRowContext.expanded ? [...extendedTableColumns] : [...baseTableColumns])
      const reducedItems = reduceReportPayloadItems(transformTableReportData(items, tempInC))
      if (reducedItems.length > 0) {
        setFormattedItems([...reducedItems])
      }
    }
  }, [initialRowContext, items, setFormattedItems, tempInC])

  const resetReport = useCallback(() => {
    if (initialItems.current !== null) {
      setFormattedItems(reduceReportPayloadItems(transformTableReportData(_.cloneDeep(initialItems.current), tempInC)))
    }
  }, [tempInC])

  const isEligibleForSelection = (item: ReportTableRow) => {
    return (item.time && item.temperature) || item.comment || item.override
  }
  const onSelectAll = useCallback(() => {
    setFormattedItems((prevFormattedItems) => {
      if (!prevFormattedItems || prevFormattedItems.length === 0) return []
      let newValue = true
      // Check if all eligible items are already selected
      if (
        prevFormattedItems.every((item: ReportTableRow) => {
          return isEligibleForSelection(item) ? item.sensorCheckValue === true : true
        })
      ) {
        newValue = false
      }

      const updatedFormattedItems = prevFormattedItems.map((formattedItem: ReportTableRow) => {
        if (!isEligibleForSelection(formattedItem)) {
          return {
            ...formattedItem,
            sensorCheckValue: false,
            user: null,
          }
        }

        return {
          ...formattedItem,
          sensorCheckValue: newValue,
          //Maintain prior signature state
          user: newValue ? userName : formattedItem.previouslySigned ? formattedItem.user : null,
        }
      })

      return _.cloneDeep(updatedFormattedItems) // 🛠 Ensures deep copy
    })
  }, [userName])

  const onRowSelectChange = useCallback(
    (value: boolean, item: ReportTableRow) => {
      if (value === true) {
        item.sensorCheckValue = true
        item.user = userName
      } else {
        //need to check if item was signed prior to checking and then unchecking, otherwise user gets removed
        item.sensorCheckValue = false
        item.user = item.previouslySigned ? item.user : null //restore signer if one existed previously
      }
      setFormattedItems((prevFormattedItems) => {
        if (!prevFormattedItems) return []

        return prevFormattedItems.map((formattedItem) =>
          formattedItem.sensorId === item.sensorId && formattedItem.sensorCheckId === item.sensorCheckId
            ? { ...formattedItem, ...item }
            : formattedItem
        )
      })
    },
    [userName]
  )

  const onCommentChange = useCallback((value: string, item: ReportTableRow) => {
    item.comment = value
    setFormattedItems((prevFormattedItems) => {
      if (!prevFormattedItems) return [] // Ensure no null values
      return prevFormattedItems.map((formattedItem) =>
        formattedItem.sensorId === item.sensorId && formattedItem.sensorCheckId === item.sensorCheckId
          ? { ...formattedItem, ...item }
          : formattedItem
      )
    })
  }, [])

  const onOverrideChange = useCallback(
    (value: boolean, item: ReportTableRow) => {
      //update the item value
      if (value === true) {
        item.override = true
      } else {
        item.override = false
        item.sensorCheckValue = !!((item.time && item.temperature) || item.comment || item.override)
        item.user = item.sensorCheckValue ? `${currentUser.firstName} ${currentUser.lastName}` : null
      }
      //Update the item list
      const updatedFormattedItems = formattedItems?.map((formattedItem: ReportTableRow) => {
        if (formattedItem.sensorId === item.sensorId && formattedItem.sensorCheckId === item.sensorCheckId) {
          return { ...formattedItem, ...item }
        } else {
          return formattedItem
        }
      })
      //Check to see if override is true for any of the items after the change
      const expandedRequired = updatedFormattedItems?.some((item: ReportTableRow) => {
        return item.override
      })
      //Update row context
      if (expandedRequired && updatedFormattedItems?.length) {
        //if already expanded, no change necessary
        if (rowContext !== TableRowContext.expanded) {
          setRowContext(TableRowContext.expanded)
          setTableColumns([...extendedTableColumns])
          setFormattedItems([...expandItems([...updatedFormattedItems])])
          return
        }
      } else {
        // if already normalized, no change necessary
        if (rowContext !== TableRowContext.normal && updatedFormattedItems?.length) {
          setRowContext(TableRowContext.normal)
          setTableColumns([...baseTableColumns])
          setFormattedItems([...collapseItems([...updatedFormattedItems])])
          return
        }
      }
      if (updatedFormattedItems?.length) {
        setFormattedItems([...updatedFormattedItems])
      }
    },
    [currentUser.firstName, currentUser.lastName, formattedItems, rowContext]
  )

  const onOverrideTimeChange = useCallback(
    (value: string, item: ReportTableRow) => {
      item.overrideTime = value
      //Update the item list
      const updatedFormattedItems = formattedItems?.map((formattedItem: ReportTableRow) => {
        if (formattedItem.sensorId === item.sensorId) {
          return { ...formattedItem, ...item }
        } else {
          return formattedItem
        }
      })
      if (updatedFormattedItems?.length) {
        setFormattedItems([...updatedFormattedItems])
      }
    },
    [formattedItems]
  )

  const onOverrideValueChange = useCallback(
    (value: string, item: ReportTableRow) => {
      item.overrideValue = parseFloat(value)
      //store value as is without conversion
      const updatedFormattedItems = formattedItems?.map((formattedItem: ReportTableRow) => {
        if (formattedItem.sensorId === item.sensorId) {
          return { ...formattedItem, ...item }
        } else {
          return formattedItem
        }
      })
      if (updatedFormattedItems?.length) {
        setFormattedItems([...updatedFormattedItems])
      }
    },
    [formattedItems, tempInC]
  )

  const openModal = useCallback(
    (callback: { onConfirm: () => void; invalidData: Array<ReportTableRow> }) => {
      if (displayModal === false) {
        setModalCallback(callback)
        setDisplayModal(true)
      }
    },
    [displayModal]
  )

  const closeModal = useCallback(() => {
    if (displayModal !== false) {
      setDisplayModal(false)
    }
  }, [displayModal])

  const saveReportChanges = useCallback(async (reportId: string, reportDate: string, entries: Array<ReportSaveItem>) => {
    const saveObject: OutboundReportSave = { reportId, reportDate, entries }
    try {
      await submitReportsDetailsForApprovals(saveObject)
      setIsSaving(false)
      setToast({ display: true, message: 'Items signed successfully...', success: true })
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (e) {
      setToast({ display: true, success: false, message: 'An error occured. Approvals not saved. Please contact PathSpot Support.' })
    }
  }, [])

  const stageChangesToSave = useCallback(async () => {
    const reportConfigEntryIndex = context === 'pm' ? 1 : 0
    const reportId = currentReport.reportSelections.selectedReport.value
    const reportDate = currentReport.reportSelections.selectedDate
    if (reportId !== null) {
      const itemsToSave = formattedItems?.filter((formattedItem) => {
        return formattedItem.sensorCheckValue && formattedItem.sensorCheckId === reportConfigEntryIndex
      })
      if (itemsToSave && itemsToSave.length > 0) {
        let invalidEntriesToSave: Array<ReportTableRow> = []
        const entries = itemsToSave.map((item) => {
          const { sensorId, comment, overrideValue, overrideTime, readingId, outOfRange } = item
          const readingToSave = {
            sensorId: sensorId,
            readingId: readingId,
            correctiveAction: comment ? (comment !== '' ? comment : null) : null,
            overrideTime: overrideTime ? moment(overrideTime).utcOffset(0, true).unix() : null,
            overrideValue: isCoercedFiniteNumber(overrideValue) ? (tempInC ? overrideValue : farenheitToCelsus(overrideValue, 100)) : null,
            reportConfigEntryIndex: reportConfigEntryIndex,
          } as ReportSaveItem
          if (outOfRange && readingToSave.correctiveAction === null) {
            invalidEntriesToSave = [...invalidEntriesToSave, { ...item }]
          }
          return { ...readingToSave }
        })
        if (invalidEntriesToSave.length > 0) {
          openModal({
            onConfirm: () => {
              setIsSaving(true)
              saveReportChanges(reportId, reportDate, entries)
            },
            invalidData: invalidEntriesToSave,
          })
        } else {
          setIsSaving(true)
          saveReportChanges(reportId, reportDate, entries)
        }
      } else {
        //No items to save
        setNoSelectionsVisible(true)
      }
    }
  }, [
    context,
    currentReport.reportSelections.selectedDate,
    currentReport.reportSelections.selectedReport.value,
    formattedItems,
    openModal,
    saveReportChanges,
    tempInC,
  ])
  const tableCallbacks = useMemo(
    () => ({
      sensorCheckValue: onRowSelectChange,
      comment: onCommentChange,
      override: onOverrideChange,
      overrideTime: onOverrideTimeChange,
      overrideValue: onOverrideValueChange,
    }),
    [onCommentChange, onOverrideChange, onOverrideTimeChange, onOverrideValueChange, onRowSelectChange]
  )

  if (formattedItems === null || tableColumns === null) {
    return <StyledSpinner message="Loading data..." />
  }
  if (isSaving) {
    return <StyledSpinner message="Saving changes, please wait..." />
  }
  return (
    <Atomic.PContainer>
      <ToastNotification message={toast?.message} display={toast?.display} success={toast?.success} />
      {!!displayModal && modalCallback !== null && (
        <SensorDataReportSigningVerification
          open={displayModal}
          onClose={closeModal}
          onGoBack={closeModal}
          onSignAnyway={modalCallback}
          title={`Corrective Action${modalCallback.invalidData.length > 1 ? 's' : ''} Missing for Out of Range Item${
            modalCallback.invalidData.length > 1 ? 's' : ''
          }`}
        />
      )}
      {noSelectionsVisible && <NoSelections visible={noSelectionsVisible} setDisplayState={setNoSelectionsVisible} />}
      <Atomic.PButtonRow buttons={[selectAll]} callbacks={[onSelectAll]} width="100%" justifyContent="flex-start" />
      <SensorDataReportTableHeader tableColumns={tableColumns} />
      <SensorDataReportTableContent tableColumns={tableColumns} items={[...formattedItems]} tableCallbacks={tableCallbacks} />
      <Atomic.PButtonRow
        buttons={[cancel, signSelected]}
        width="100%"
        justifyContent="center"
        buttonMargin={{ marginLeft: '1rem', marginRight: '1rem' }}
        callbacks={[resetReport, stageChangesToSave]}
      />
    </Atomic.PContainer>
  )
}

export default SensorDataReportTable
