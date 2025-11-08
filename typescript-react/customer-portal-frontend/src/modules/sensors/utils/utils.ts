import { toast } from 'react-toastify'
import { AlertTemperatureField } from '../api/sensor-types'

export const toastOptions: any = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: false,
  draggable: true,
  progress: undefined,
}

export const notifyToast = (success: any, message: any) => {
  if (success) {
    toast.success(message, toastOptions)
  } else {
    toast.error(message, toastOptions)
  }
}

export const getUserIds = (field: any): number[] => {
  if (!field.length) {
    return []
  }
  const res: number[] = field?.map((val: any) => (val.value == 'None' ? undefined : val.value)).filter((val: any) => val != undefined)
  return res
}

export const formatPhoneNumbers = (phone: string): string => {
  if (!phone) {
    return ''
  }
  const cc: string = phone.slice(0, 2)
  const areaCode: string = phone.slice(2, 5)
  const three: string = phone.slice(5, 8)
  const rest: string = phone.slice(8)

  return `(${cc} (${areaCode})-${three}-${rest})`
}

const temperatureFieldmap = () => {
  return (Object.keys(AlertTemperatureField) as Array<keyof typeof AlertTemperatureField>).map((key) => key)
}

export const isTemperature = (alertType: string): boolean => {
  const tempFieldList: any = temperatureFieldmap()
  return tempFieldList.includes(alertType.toUpperCase())
}

export const convertTempToFahrenheit = (temp: any) => {
  if (temp == undefined || temp == null || temp == '') {
    return ''
  }
  const c: number = typeof temp == 'string' ? parseFloat(temp) : temp
  return Math.round(c * (9 / 5) + 32)
}

export const convertTempToCelsius = (temp: any) => {
  if (temp == undefined || temp == null || temp == '') {
    return ''
  }
  const f: number = typeof temp == 'string' ? parseFloat(temp) : temp
  return (f - 32) * (5 / 9)
}
