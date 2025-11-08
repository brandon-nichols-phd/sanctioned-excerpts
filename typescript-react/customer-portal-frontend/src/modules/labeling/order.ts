import { Numeric } from './item'

type Customer = {
  id: number
  name: string
  locations: Location[]
}

type Location = {
  id: number
  name: string
  contactName: string | null
  address: string | null
}

export type LabelMaterial = {
  id: number
  active: boolean
  size: string
  type: string
  description: string
  image: string
  allowedCustomers: number[] | null
  rollPriceAmount: number
}

export type AllOptions = {
  customers: Record<Numeric, Customer>
  materials: LabelMaterial[]
}

export type LabelOrderRequest = {
  customerId: number
  materialId: number
  locationId: number
  quantity: number
}

/**
 * This type represents the details of a labels order we are placing.
 */
export type LabelOrderFormValues = {
  customerId: number
  materialId: number
  locationId: number
  quantity: number
  size: string
}

/**
 * This function returns an object that represents a blank order. It's main use is to provide the initial values of
 * a newly created order.
 *
 * @param customerId An optional customer id to use for the order
 * @returns An object with initial values for a new order
 */
export const createBlankOrderForForm = (customerId: number = 0): LabelOrderFormValues => {
  return {
    customerId,
    materialId: 0,
    locationId: 0,
    quantity: 0,
    size: '',
  }
}

/**
 * This is a transform function that takes in the values set on the form and returns an object with the
 * neccessary data to create a labels order.
 *
 * @param formValues The values set on the form
 * @returns An object with the proper format to perform a create operation
 */
export const mapFormValuesToLabelOrder = (formValues: LabelOrderFormValues): LabelOrderRequest => {
  return {
    customerId: formValues.customerId,
    materialId: formValues.materialId,
    locationId: formValues.locationId,
    quantity: formValues.quantity,
  }
}

/**
 * This function takes in a price amount and returns it's representation in dollars.
 *
 * @param amount The price amount
 * @returns A string representation of the provided dice amount in dollars
 */
export const priceToDollars = (amount: number) => {
  return `$${(amount / 100).toFixed(2)}`
}
