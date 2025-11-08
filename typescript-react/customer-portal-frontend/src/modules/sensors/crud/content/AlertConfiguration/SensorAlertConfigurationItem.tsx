import React, { FC } from 'react'
import _, { isNaN } from 'lodash'

import { TimeUnit } from '../../../../../webapp-lib/pathspot-react/api/time/time.types'
import { Atomic, SelectableItem, valueof } from '../../../../../webapp-lib/pathspot-react'
import { degreesCelsius, degreesFarenheit } from '../../../../../webapp-lib/pathspot-react/api/base/units'
import { isNullOrUndefined } from '../../../../../webapp-lib/pathspot-react/api/types/type-utils'

import DeleteConfigurationButton from './DeleteConfigurationButton'
import AlertType from './AlertType'
import {
  SelectableAlertRecipient,
  SensorAlertConfiguration,
  SensorAlertError,
  SensorAlertRecipient,
  SensorAlertRecipients,
  SensorBounds,
} from '../../containers/SensorDetailContainer'
import TimeConfiguration from './TimeConfiguration'
import ConfigurationSwitch from './ConfigurationSwitch'
import OptionSelector from './OptionSelector'
import LimitConfiguration from './LimitConfiguration'
import {
  SensorAlertCriticalityEnum,
  SensorDataType,
  SensorDataTypeList,
  SensorDataUnitType,
  SensorTemperatureUnit,
} from '../../../api/sensor-types'
import { updateSensorAlertLimitConfiguration } from '../../api/sensor-crud.api'

const criticalityOptions = Object.keys(SensorAlertCriticalityEnum).map((key: string) => {
  return {
    type: key,
    label: key,
    value: key,
  }
})

const temperatureOptions = [
  { label: `${degreesCelsius}`, value: 'C' },
  { label: `${degreesFarenheit}`, value: 'F' },
]
const percentOptions = [{ label: '%', value: '%' }]
const signalOptions = [{ label: 'dB', value: 'dB' }]

const dynamicUnitOptions = {
  TEMPERATURE: [...temperatureOptions],
  TEMPERATURE_SECONDARY: [...temperatureOptions],
  HUMIDITY: [...percentOptions],
  BATTERY: [...percentOptions],
  RSSI: [...signalOptions],
}

type Props = {
  alertableUserOptions: SensorAlertRecipients
  alertConfig: SensorAlertConfiguration
  viewOnly: boolean
  removeAlert: (index: number) => void
  editAlert: (index: number, field: keyof SensorAlertConfiguration, value: valueof<SensorAlertConfiguration>) => void

  alertIndex: number
  userPreferredTemperatureUnit: SensorTemperatureUnit
  errors: SensorAlertError | undefined
}

const SensorAlertConfigurationItem: FC<Props> = (props) => {
  const { alertableUserOptions, alertConfig, viewOnly, removeAlert, editAlert, alertIndex, userPreferredTemperatureUnit, errors } = props

  const alertType = alertConfig.dataType?.source
  const dynamicAlertLimitUnitOptions = alertType ? dynamicUnitOptions[alertType] : undefined
  return (
    <Atomic.PWrapper asCard width="100%" margin={{ marginBottom: '1rem' }}>
      <Atomic.PContainer isRow width="100%">
        <Atomic.PContainer justifyContent="center" alignItems="center" width="10%">
          <DeleteConfigurationButton onClick={() => removeAlert(alertIndex)} viewOnly={viewOnly} />
        </Atomic.PContainer>
        <Atomic.PContainer justifyContent="center" alignItems="center" width="45%">
          <AlertType
            viewOnly={viewOnly}
            value={alertConfig.dataType}
            options={SensorDataTypeList}
            onChange={(val: SelectableItem<SensorDataType>) => {
              editAlert(alertIndex, 'dataType', val)
            }}
          />
          {errors?.dataType && (
            <Atomic.PContainer isRow isGroup width="100%" margin={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                {errors.dataType}
              </span>
            </Atomic.PContainer>
          )}
          <TimeConfiguration
            label={'Suppression *'}
            viewOnly={viewOnly}
            placeholder="Enter desired suppression duration."
            value={alertConfig.suppression?.duration}
            unit={alertConfig.suppression?.unit}
            onValueChange={(val: number | undefined) => {
              if (_.isNumber(val)) {
                const currentDuration = alertConfig.suppression
                const newDuration = !isNullOrUndefined(currentDuration)
                  ? { ...currentDuration, duration: val }
                  : { unit: TimeUnit.minutes, duration: val }
                editAlert(alertIndex, 'suppression', newDuration)
              }
            }}
            onUnitChange={(newUnit: TimeUnit) => {
              if (!isNullOrUndefined(alertConfig.suppression)) {
                const newDuration = { duration: alertConfig.suppression.duration, unit: newUnit }
                editAlert(alertIndex, 'suppression', newDuration)
              }
            }}
          />
          {errors?.suppression && (
            <Atomic.PContainer isRow isGroup width="100%" margin={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                {errors.suppression}
              </span>
            </Atomic.PContainer>
          )}
          <TimeConfiguration
            label={'Recurrence'}
            placeholder="Enter desired recurrence duration."
            viewOnly={viewOnly}
            value={alertConfig.recurrence?.duration}
            unit={alertConfig.recurrence?.unit}
            onValueChange={(val: number | undefined) => {
              if (_.isNumber(val) && !isNaN(val)) {
                const currentDuration = alertConfig.recurrence
                const newDuration = currentDuration ? { ...currentDuration, duration: val } : { unit: TimeUnit.minutes, duration: val }
                editAlert(alertIndex, 'recurrence', newDuration)
              } else {
                editAlert(alertIndex, 'recurrence', undefined)
              }
            }}
            onUnitChange={(newUnit: TimeUnit) => {
              if (alertConfig.recurrence?.duration) {
                const newDuration = { duration: alertConfig.recurrence.duration, unit: newUnit }
                editAlert(alertIndex, 'recurrence', newDuration)
              }
            }}
          />
          <ConfigurationSwitch
            label={'Follow Business Hours'}
            viewOnly={viewOnly}
            value={alertConfig.followBusinessHours}
            onChange={(val: boolean) => editAlert(alertIndex, 'followBusinessHours', val)}
          />
          <OptionSelector
            isMulti
            label={'To'}
            viewOnly={viewOnly}
            value={alertConfig.recipients?.to}
            onChange={(val: SelectableAlertRecipient[]) => {
              const currentRecipients = alertConfig.recipients
              if (!isNullOrUndefined(currentRecipients)) {
                editAlert(alertIndex, 'recipients', { ...currentRecipients, to: val })
              } else {
                editAlert(alertIndex, 'recipients', { to: val })
              }
            }}
            options={alertableUserOptions.to}
          />
          <OptionSelector
            isMulti
            label={'BCC'}
            viewOnly={viewOnly}
            value={alertConfig.recipients?.bcc}
            onChange={(val: SelectableAlertRecipient[]) => {
              const currentRecipients = alertConfig.recipients
              if (!isNullOrUndefined(currentRecipients)) {
                editAlert(alertIndex, 'recipients', { ...currentRecipients, bcc: val })
              } else {
                editAlert(alertIndex, 'recipients', { bcc: val })
              }
            }}
            options={alertableUserOptions.bcc}
          />
        </Atomic.PContainer>
        <Atomic.PContainer margin={{ marginLeft: '1rem' }} justifyContent="space-between" alignItems="center" width="45%">
          <OptionSelector
            label={'Criticality *'}
            viewOnly={viewOnly}
            value={alertConfig.criticality}
            options={criticalityOptions}
            onChange={(val: SensorAlertCriticalityEnum) => editAlert(alertIndex, 'criticality', val)}
          />
          {errors?.criticality && (
            <Atomic.PContainer isRow isGroup width="100%" margin={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                {errors.criticality}
              </span>
            </Atomic.PContainer>
          )}
          <LimitConfiguration
            limit={alertConfig.limits?.UPPER}
            unit={alertConfig.limits?.UPPER?.unit.value}
            viewOnly={viewOnly}
            unitOptions={dynamicAlertLimitUnitOptions}
            onValueChange={(val: number) => {
              if (alertType) {
                const currentUnit = alertConfig.limits?.UPPER?.unit.value
                if (currentUnit) {
                  const newLimits = updateSensorAlertLimitConfiguration(
                    alertType,
                    alertConfig.limits,
                    SensorBounds.UPPER,
                    val,
                    currentUnit as SensorDataUnitType,
                    userPreferredTemperatureUnit === 'C'
                  )
                  editAlert(alertIndex, 'limits', newLimits)
                }
              }
            }}
            onUnitChange={(newUnit: SensorDataUnitType) => {
              const currentValue = alertConfig.limits?.UPPER?.value
              if (alertType && currentValue) {
                const newLimits = updateSensorAlertLimitConfiguration(
                  alertType,
                  alertConfig.limits,
                  SensorBounds.UPPER,
                  currentValue,
                  newUnit,
                  userPreferredTemperatureUnit === 'C'
                )
                editAlert(alertIndex, 'limits', newLimits)
              }
            }}
          />
          {errors?.limits && (
            <Atomic.PContainer isRow isGroup width="100%" margin={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                {errors.limits}
              </span>
            </Atomic.PContainer>
          )}
          <LimitConfiguration
            limit={alertConfig.limits?.LOWER}
            unit={alertConfig.limits?.LOWER?.unit.value}
            viewOnly={viewOnly}
            unitOptions={dynamicAlertLimitUnitOptions}
            onValueChange={(val: number) => {
              if (alertType) {
                const currentUnit = alertConfig.limits?.LOWER?.unit.value
                if (currentUnit) {
                  const newLimits = updateSensorAlertLimitConfiguration(
                    alertType,
                    alertConfig.limits,
                    SensorBounds.LOWER,
                    val,
                    currentUnit as SensorDataUnitType,
                    userPreferredTemperatureUnit === 'C'
                  )
                  editAlert(alertIndex, 'limits', newLimits)
                }
              }
            }}
            onUnitChange={(newUnit: SensorDataUnitType) => {
              const currentValue = alertConfig.limits?.LOWER?.value
              if (alertType && currentValue) {
                const newLimits = updateSensorAlertLimitConfiguration(
                  alertType,
                  alertConfig.limits,
                  SensorBounds.LOWER,
                  currentValue,
                  newUnit,
                  userPreferredTemperatureUnit === 'C'
                )
                editAlert(alertIndex, 'limits', newLimits)
              }
            }}
          />
          <ConfigurationSwitch
            label={`Alert in ${degreesCelsius}`}
            viewOnly={viewOnly}
            value={alertConfig.alertInC}
            onChange={(val: boolean) => {
              editAlert(alertIndex, 'alertInC', val)
            }}
          />
          <OptionSelector
            isMulti
            label={'CC'}
            viewOnly={viewOnly}
            value={alertConfig.recipients?.cc}
            onChange={(val: SelectableAlertRecipient[]) => {
              const currentRecipients = alertConfig.recipients
              if (!isNullOrUndefined(currentRecipients)) {
                editAlert(alertIndex, 'recipients', { ...currentRecipients, cc: val })
              } else {
                editAlert(alertIndex, 'recipients', { cc: val })
              }
            }}
            options={alertableUserOptions.cc}
          />
          <OptionSelector
            isMulti
            label={'SMS'}
            viewOnly={viewOnly}
            value={alertConfig.recipients?.phoneTo}
            onChange={(val: SelectableAlertRecipient[]) => {
              const currentRecipients = alertConfig.recipients
              if (!isNullOrUndefined(currentRecipients)) {
                editAlert(alertIndex, 'recipients', { ...currentRecipients, phoneTo: val })
              } else {
                editAlert(alertIndex, 'recipients', { phoneTo: val })
              }
            }}
            options={alertableUserOptions.phoneTo}
          />
        </Atomic.PContainer>
      </Atomic.PContainer>
    </Atomic.PWrapper>
  )
}

export default SensorAlertConfigurationItem
