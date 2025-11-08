import * as Yup from 'yup'

export type NumericString = string

export type CategoryFormValues = {
  id?: number
  name: string
  customerId: number
  locationId: number | null
  order: number
  color: string
  active: boolean
}

export const CategoryValidationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  customerId: Yup.number().required('Customer is required'),
  order: Yup.number().required('Order is required'),
  color: Yup.string().required('Color is required'),
})

export type CategoryForTable = {
  id: number
  name: string
  customerName: string
  locationName: string | null
  order: number
  active: string
  color: string
}

export type Category = {
  active: boolean
  color?: string
  customerId: number
  id: number
  locationId: null
  name: string
  order?: number
  customerName: string
  locationName: string | null
}

export const mapCategoryToTableRow = (category: Category): CategoryForTable => {
  return {
    id: category.id,
    name: category.name,
    customerName: category.customerName,
    locationName: category.locationName || 'All Locations',
    order: category.order ?? 0,
    active: category.active ? 'Yes' : 'No',
    color: category.color ?? '',
  }
}

type OptionBaseInfo = {
  id: number
  name: string
}

export type OptionsForCustomer = {
  name: string | null
  possibleLocations: OptionBaseInfo[]
  possibleCategories: OptionBaseInfo[]
}

export type AllOptions = Record<string, OptionsForCustomer>
