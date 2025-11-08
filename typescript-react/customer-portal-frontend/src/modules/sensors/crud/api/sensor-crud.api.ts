import { isNumber } from 'lodash'
import { toSelectableItem } from '../../../../api/helpers/utils'
import {
  celsiusToFarenheit,
  degreesCelsius,
  degreesFarenheit,
  farenheitToCelsus,
} from '../../../../webapp-lib/pathspot-react/api/base/units'
import { TimeUnit } from '../../../../webapp-lib/pathspot-react/api/time/time.types'
import { isNullOrUndefined } from '../../../../webapp-lib/pathspot-react/api/types/type-utils'
import {
  SensorAlertCriticality,
  SensorAlertCriticalityEnum,
  SensorDataType,
  SensorDataTypeEnum,
  SensorDataTypeLabel,
  SensorDataUnitType,
} from '../../api/sensor-types'
import {
  SelectableAlertRecipient,
  SensorAlertConfiguration,
  SensorAlertRecipient,
  SensorBounds,
  SensorDetailPayloadAction,
  SensorDuration,
  SensorLimit,
  SensorValueLimits,
} from '../containers/SensorDetailContainer'

export const getAlertRecipients = (alertConfiguration: SensorAlertConfiguration) => {
  const to = alertConfiguration.recipients?.to?.map((recipient: SelectableAlertRecipient) => recipient.source.id)
  const bcc = alertConfiguration.recipients?.bcc?.map((recipient) => recipient.source.id)
  const phoneTo = alertConfiguration.recipients?.phoneTo?.map((recipient) => recipient.source.id)
  const cc = alertConfiguration.recipients?.cc?.map((recipient) => recipient.source.id)

  return { to, bcc, phoneTo, cc }
}

export const convertSecondsToInterval = (interval: number): string | null => {
  //  from seconds -> units
  const days: number = 24 * 60 * 60
  const hours: number = 60 * 60
  const mins = 60
  if (!interval) {
    return null
  } else if (interval % days == 0) {
    return (interval / days).toString()
  } else if (interval % hours == 0) {
    return (interval / hours).toString()
  } else {
    return Math.trunc(interval / mins).toString()
  }
}

export const getIntervalUnits = (interval: number | undefined | null): SensorDuration | undefined => {
  const days: number = 24 * 60 * 60
  const hours: number = 60 * 60
  const minutes = 60
  if (interval === null || interval === undefined) {
    return undefined
  } else if (interval / days >= 1) {
    return { duration: Math.round((interval / days) * 100) / 100, unit: TimeUnit.days }
  } else if (interval / hours >= 1) {
    return { duration: Math.round((interval / hours) * 100) / 100, unit: TimeUnit.hours }
  } else {
    return { duration: Math.round((interval / minutes) * 100) / 100, unit: TimeUnit.minutes }
  }
}

export const durationAsSeconds = (sensorDuration: SensorDuration): number => {
  switch (sensorDuration.unit) {
    case TimeUnit.days:
      return sensorDuration.duration * 86400
    case TimeUnit.hours:
      return sensorDuration.duration * 3600
    case TimeUnit.minutes:
      return sensorDuration.duration * 60
    default:
      return sensorDuration.duration
  }
}
export const secondsAsDuration = (seconds: number, unit: TimeUnit): SensorDuration | undefined => {
  switch (unit) {
    case TimeUnit.days:
      return { duration: seconds / 86400, unit }
    case TimeUnit.hours:
      return { duration: seconds / 3600, unit }
    case TimeUnit.minutes:
      return { duration: seconds / 60, unit }
    default:
      return undefined
  }
}

export const alertLimitToPOSTPayload = (
  dataType: SensorDataType | undefined,
  limit: SensorLimit | undefined
): number | null | undefined => {
  if (isNullOrUndefined(limit) || isNullOrUndefined(dataType)) {
    return null
  }
  if (dataType === 'TEMPERATURE' || dataType === 'TEMPERATURE_SECONDARY') {
    const tempUnit = limit.unit.value
    const limitValue = isNumber(limit.value) ? (tempUnit === 'F' ? farenheitToCelsus(limit.value) : limit.value) : undefined
    return isNullOrUndefined(limitValue) ? null : limitValue
  }
  return limit.value || null
}

export const generateSensorConfigAlertLimit = (
  dataType: SensorDataType,
  limit: number | undefined | null,
  bound: SensorBounds,
  limitUnit: SensorDataUnitType | null
): SensorLimit => {
  const limitLabel = bound === SensorBounds.LOWER ? 'Lower Limit' : 'Upper Limit'
  if (dataType === 'TEMPERATURE' || dataType === 'TEMPERATURE_SECONDARY') {
    const tempUnitLabel = limitUnit === 'F' ? `${degreesFarenheit}` : `${degreesCelsius}`
    const tempUnit = limitUnit === null ? 'C' : limitUnit === 'C' ? 'C' : 'F'
    return {
      label: `${limitLabel} (${tempUnitLabel})`,
      dataType,
      unit: {
        label: tempUnitLabel,
        value: tempUnit,
        source: tempUnit,
      },
      value: limit,
      limitType: bound,
    } as unknown as SensorLimit
  } else if (dataType === 'HUMIDITY' || dataType === 'BATTERY') {
    const humidityUnit = '%'
    return {
      label: `${limitLabel} (${humidityUnit})`,
      dataType,
      unit: {
        label: humidityUnit,
        value: humidityUnit,
        source: humidityUnit,
      },
      value: limit,
      limitType: bound,
    } as unknown as SensorLimit
  } else {
    const signalUnit = 'dBm'
    return {
      label: `${limitLabel} (${signalUnit})`,
      dataType,
      unit: {
        label: signalUnit,
        value: signalUnit,
        source: signalUnit,
      },
      value: limit,
      limitType: bound,
    } as unknown as SensorLimit
  }
}

export const getLimitFromPayloadDataType = (
  dataType: SensorDataType,
  limit: number | null,
  bound: SensorBounds,
  userTemperatureInC = false
) => {
  if (!isNullOrUndefined(limit)) {
    if (dataType === 'TEMPERATURE' || dataType === 'TEMPERATURE_SECONDARY') {
      const tempUnit = userTemperatureInC === true ? 'C' : 'F'
      const tempLimitValue = isNumber(limit) ? (userTemperatureInC === true ? limit : celsiusToFarenheit(limit)) : undefined
      return { ...generateSensorConfigAlertLimit(dataType, tempLimitValue, bound, tempUnit) }
    }
  }
  return { ...generateSensorConfigAlertLimit(dataType, limit, bound, null) }
}

export const toPhoneToAlertRecipient = (recipient: SelectableAlertRecipient): SelectableAlertRecipient => {
  const phoneNumber =
    isNullOrUndefined(recipient.source.phoneNumber) || recipient.source.phoneNumber === ''
      ? 'No Phone on File'
      : recipient.source.phoneNumber
  return {
    value: recipient.source.id,
    label: `${recipient.source.firstName} (${phoneNumber})`,
    source: { ...recipient.source },
  }
}
export const reduceAlertRecipientPayload = (
  recipientData: SensorAlertRecipient | Array<SensorAlertRecipient>
): Array<SelectableAlertRecipient> => {
  if (Array.isArray(recipientData) && recipientData.length > 0) {
    return recipientData.map((recipient: SensorAlertRecipient) => {
      const email = recipient.email
      const emailLabel: string = email.includes('@') ? `${recipient.firstName || ''} (${email})` : 'No Email on File'
      return {
        value: recipient.id,
        label: emailLabel,
        source: recipient,
      }
    })
  } else if (!Array.isArray(recipientData) && !isNullOrUndefined(recipientData)) {
    const emailLabel: string = recipientData.email.includes('@')
      ? `${recipientData.firstName || ''} (${recipientData.email})`
      : 'No Email on File'

    return [{ value: recipientData.id, label: emailLabel, source: { ...recipientData } }]
  }
  return []
}

/**
 * @param recipients
 * @returns - filters out recipients for email emails that don't have a valid email or no email
 *
 * some users can be created from the safetysuite app without an email and will have a UUID string that is not a valid email
 * those users should not be includd in email based alerts
 */
export const filterAlertRecipientsWithoutEmail = (recipients: Array<SelectableAlertRecipient> | undefined) => {
  if (!recipients) {
    return []
  }

  return recipients.filter((recipient: SelectableAlertRecipient) => recipient.source.email && recipient.source.email.includes('@'))
}

export const reduceSensorAlertConfigurationPayload = (
  configurations: SensorDetailPayloadAction[] | null,
  userTemperatureInC: boolean
): SensorAlertConfiguration[] | undefined => {
  if (configurations === null) {
    return undefined
  }
  const alertConfigurations: SensorAlertConfiguration[] = configurations.map((alertConfig: SensorDetailPayloadAction) => {
    const {
      id,
      active,
      reportTemplateId,
      dataType: _dataType,
      highLimit,
      lowLimit,
      duration,
      recurrence,
      criticality: _criticality,
      cc,
      bcc,
      to,
      phoneTo,
      followBusinessHours,
      alertInC,
    } = alertConfig

    const dataType = _dataType as SensorDataType
    const dataTypeLabel = SensorDataTypeLabel.get(dataType) || ''
    const criticality = _criticality as SensorAlertCriticality
    const formattedConfig: SensorAlertConfiguration = {
      id: id || '',
      active: active,
      dataType: toSelectableItem(dataType, dataTypeLabel, SensorDataTypeEnum[dataType]),
      recurrence: getIntervalUnits(recurrence),
      suppression: getIntervalUnits(duration),
      limits: {
        [SensorBounds.UPPER]: getLimitFromPayloadDataType(dataType, highLimit, SensorBounds.UPPER, userTemperatureInC),
        [SensorBounds.LOWER]: getLimitFromPayloadDataType(dataType, lowLimit, SensorBounds.LOWER, userTemperatureInC),
      },
      criticality: {
        source: SensorAlertCriticalityEnum[criticality],
        label: criticality,
        value: criticality,
      },
      recipients: {
        // recipients may or may not be an array, so you need to sort it out accordingly
        cc: reduceAlertRecipientPayload(cc),
        bcc: reduceAlertRecipientPayload(bcc),
        to: reduceAlertRecipientPayload(to),
        phoneTo: reduceAlertRecipientPayload(phoneTo).map((phoneItem: SelectableAlertRecipient) => toPhoneToAlertRecipient(phoneItem)),
      },
      alertInC: alertInC || false,
      reportTemplateId: reportTemplateId || 15, // #TODO: Force pull of template table and find ID corresponding to sensors
      followBusinessHours: followBusinessHours || false,
    }
    return formattedConfig
  })
  return alertConfigurations
}

export const updateSensorAlertLimitConfiguration = (
  alertType: SensorDataType,
  currentLimits: SensorValueLimits | undefined,
  bound: SensorBounds,
  newValue: number,
  newUnit: SensorDataUnitType | null,
  userBaseTempUnitInC: boolean
) => {
  if (bound !== SensorBounds.NONE && currentLimits) {
    const currentLimit = currentLimits[bound]
    if (currentLimit) {
      const currentUnit = currentLimit.unit.value
      if (newUnit === currentUnit) {
        //not a unit change, just set the new value
        return { ...currentLimits, [bound]: { ...currentLimits[bound], value: newValue } }
      } else {
        //The unit changed and only temperature units are selectable
        const unitAdjustedValue = isNumber(currentLimit.value)
          ? newUnit === 'C'
            ? farenheitToCelsus(currentLimit.value)
            : celsiusToFarenheit(currentLimit.value)
          : undefined
        const newLimit: SensorLimit = generateSensorConfigAlertLimit(alertType, unitAdjustedValue, bound, newUnit || null)
        return { ...currentLimits, [bound]: { ...newLimit } }
      }
    } else {
      // limit doesn't currently exist
      const tempUnit = userBaseTempUnitInC ? 'C' : 'F'
      const newLimit: SensorLimit = generateSensorConfigAlertLimit(alertType, newValue, bound, tempUnit)
      return isNullOrUndefined(currentLimits) ? { [bound]: { ...newLimit } } : { ...currentLimits, [bound]: { ...newLimit } }
    }
  }
}
