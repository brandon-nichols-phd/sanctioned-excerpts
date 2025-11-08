import * as Yup from 'yup'

export type Item = {
  active: boolean
  allLocations: boolean
  allergen: null
  code: null
  customerId: number
  customerName: string
  description: string
  expiring: boolean
  id: number
  name: string
}

type Category = {
  active: boolean
  color?: string
  customerId: number
  id: number
  locationId: null
  name: string
  order?: number
}

export type ConfiguredItem = {
  active: boolean
  categories: Category[]
  categoryIds: number[]
  configuredDoc: StagesConfig
  customerId: number
  id: number
  item: Item
  itemId: number
  locations: number[] | null
  picture: string | null
  stackingType: string
  customerName: string
}

export type Stage = {
  color: string
  stateName: string
  whenToChange: number | null // In minutes
}

export type StagesConfig = Record<
  string,
  {
    stages: Stage[]
    expiration: number // In minutes
  }
>

type OptionBaseInfo = {
  id: number
  name: string
}

export type OptionSection = {
  sectionOrder: number
} & OptionBaseInfo

export type OptionsForCustomer = {
  name: string | null
  possibleLocations: OptionBaseInfo[]
  possibleCategories: OptionBaseInfo[]
  possibleItems: OptionBaseInfo[]
  possibleSections: OptionSection[]
}

export type AllOptions = Record<string, OptionsForCustomer>

export type ItemForTable = {
  id: number
  name: string
  customerName: string
  active: string
}

export const mapItemToTableRows = (item: Item): ItemForTable => {
  return {
    id: item.id,
    name: item.name,
    active: item.active ? 'Yes' : 'No',
    customerName: item.customerName,
  }
}

export const ItemValidationSchema = Yup.object().shape({
  itemId: Yup.number().min(1, 'Item Required'),
  locationIds: Yup.array().of(Yup.number()).nullable(),
  categories: Yup.array().min(1, 'At least one category is required'),
  configuredDoc: Yup.lazy(() => {
    return Yup.object().test('valid-config', 'Configuration validation failed', (value: FormDoc) => {
      // Check each section configuration
      for (const sectionKey in value) {
        const config = value[sectionKey]

        // Check if expiration exists and is not negative
        if (!config?.expiration || config.expiration < 0) {
          throw new Yup.ValidationError(
            `Total expiration time is required and must be positive for ${sectionKey === '0' ? 'default' : `section ${sectionKey}`}`,
            value,
            'configuredDoc'
          )
        }

        // Check if there's at least one stage
        if (config.stages.length === 0) {
          throw new Yup.ValidationError(
            `At least one stage is required for ${sectionKey === '0' ? 'default' : `section ${sectionKey}`}`,
            value,
            'configuredDoc'
          )
        }

        // Check stages
        config.stages.forEach((stage, index) => {
          const isLastStage = index === config.stages.length - 1

          // If it's not the last stage, whenToChange must have a positive value
          if (!isLastStage && (stage.whenToChange === null || stage.whenToChange < 0)) {
            throw new Yup.ValidationError(
              `Stage ${index + 1} must have a "When to Change" time for ${sectionKey === '0' ? 'default' : `section ${sectionKey}`}`,
              value,
              'configuredDoc'
            )
          }
        })
      }
      return true
    })
  }),
})

export type FormDoc = {
  [key: string]: {
    stages: Stage[]
    expiration: number
  }
}

export type ItemFormValues = {
  itemId: number
  description: string
  active: boolean
  customerId: number
  categories: Array<{ label: string; value: string }>
  locationIds: number[] | null
  picture: string | null
  stackingType: string
  configuredDoc: FormDoc
}

export type SavePayload = {
  itemId: number
  customerId: number
  locationIds: number[] | null
  categoryIds?: number[]
  configuredDoc: FormDoc // or any specific type for the dict
  picture: string | null
  stackingType: string
  active: boolean
}

export const mapFormValuesToPayload = (values: ItemFormValues): SavePayload => {
  return {
    itemId: values.itemId,
    customerId: values.customerId,
    locationIds: values.locationIds,
    categoryIds: values.categories.map((cat) => parseInt(cat.value, 10)),
    configuredDoc: values.configuredDoc,
    picture: values.picture,
    stackingType: values.stackingType,
    active: values.active,
  }
}

export const createEmptyStage = (): Stage => {
  return {
    color: '#000000',
    stateName: '',
    whenToChange: null,
  }
}

export const createEmptyConfig = () => {
  return {
    stages: [createEmptyStage()],
    expiration: 0,
  }
}
