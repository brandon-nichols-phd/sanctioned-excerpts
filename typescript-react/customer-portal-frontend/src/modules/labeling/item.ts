import * as Yup from 'yup'

/**
 * This object consolidates all the constants used for hard-codding specific behavior. The intent is for a
 * developer to immediatly notice code that is niche and might need a refactoring down the line.
 */
export const TECH_DEBT = {
  // 1- The iOS app requires every configured item to have at least one phase or it wont show up. But it is possible
  // for the user to remove all phases from a configuration on the web app. If that happens we save to the database
  // a modified 'Default' phase.
  // Issue: https://app.asana.com/0/1204835722465497/1206362249651486/f
  // 2- On the iOS app the 'Default' phase of the 'Custom' category has a special interpretation for one of it's
  // expirations.
  // Issue: https://app.asana.com/0/1204835722465497/1206313487637005/f
  NAME_OF_DEFAULT_PHASE: 'default',

  // When the 'Custom' category is selected on the iOS app the user can see that the item can both expire and not.
  // Issue: https://app.asana.com/0/1204835722465497/1206313487637005/f
  NAME_OF_CUSTOM_CATEGORY: 'custom',

  // The 'Default' phase of the 'Custom' category uses this string to represent an item that can also have no
  // expiration.
  // Issue: https://app.asana.com/0/1204835722465497/1206313487637005/f
  NO_EXPIRATION_STRING_VALUE: 'No Expiration',

  // For now we only have 2 different template ids and id = 2 is only used for a single phase. If a phase uses this
  // template id then we need extra information from the user.
  // Issue: https://app.asana.com/0/1204835722465497/1206313487637003/f
  TEMPLATE_ID_FOR_QR_CODE_PHASE: 2,

  // Some of the columns on most of the "List" pages are generated dinamically because they are directly related to the
  // configured phases on the objects we're listing. Until we devise a way to let the user dinamically choose which
  // ones to show we default to the below number as the maximum.
  // Issue: https://app.asana.com/0/1204835722465497/1206313487637001/f
  MAXIMUM_NUMBER_OF_DISPLAYED_PHASES: 4,
}

export type ExpirationFormats = 'EOD' | 'Date Only' | 'Time Only' | 'Date and Time'
type BaseDocConfiguration = {
  phaseId: number
  phaseName: string
  isTabbed: boolean
  expirationCustom: boolean
  expirationAdditional: string | null
  expirationCalculated: string | null
  expirationFormat: ExpirationFormats | null
  expirationAdditionalFormat: ExpirationFormats | null
}

export type ConfiguredPhase = BaseDocConfiguration & {
  templateId: number | null
}

type Category = {
  id: number
  name: string
  customerId: number | null
  active: boolean
  colorBackground: number
  colorText: number
  defaultDoc: ConfiguredPhase[] | null
}

type ExpandedCategory = Category & {
  // This value can't be `null` from our perspective because we always query for items that are linked to a customer.
  customerId: number
  itemsCount: number
  customerName: string | null
}

export type CategoryDetails = Category & {
  // This value can't be `null` from our perspective because we always query for items that are linked to a customer.
  customerId: number
}

export type AllExpandedCategories = ExpandedCategory[]

type ItemConfiguration = {
  id: number
  itemId: number | null
  categoryId: number | null
  active: boolean
  configuredDoc: ConfiguredPhase[] | null
}

type Item = {
  id: number
  name: string
  // This value can't be `null` from our perspective because we always query for items that are linked to a customer.
  customerId: number
  customerName: string | null
  description: string | null
  allergen: string | null
  expiring: boolean
  active: boolean
  allLocations: boolean
  code: string | null
}

export type NumericString = `${number}`
export type Numeric = NumericString | number

export type ConfiguredItem = {
  item: Item
  assignedLocations?: Record<Numeric, string>
  categories: Record<
    Numeric,
    {
      category: Category
      configuration: ItemConfiguration
    }
  >
}

export type AllConfiguredItems = Record<Numeric, ConfiguredItem>

type OptionBaseInfo = {
  id: number
  name: string
}

type OptionCategoryInfo = OptionBaseInfo & {
  defaultDoc: ConfiguredPhase[]
}

type OptionPhaseInfo = OptionBaseInfo & {
  // This value can't be `null` from our perspective because we always query for entries that are linked to a customer.
  customerId: number
  active: boolean
  isTabbed: boolean
  printTemplateId: number | null
}

export type OptionsForCustomer = {
  name: string | null
  possibleLocations: OptionBaseInfo[]
  possibleCategories: OptionCategoryInfo[]
  possiblePhases: OptionPhaseInfo[]
}

export type AllOptions = Record<Numeric, OptionsForCustomer>

export type CategoryUpdate = {
  id?: number
  customerId: number
  name: string
  active: boolean
  colorBackground: number
  colorText: number
  defaultDoc: ConfiguredPhase[] | null
}

export type CategoryUpdateOptions = {
  categoryId?: number
}

export type ConfiguredItemUpdate = {
  id?: number
  customerId: number
  name: string
  description?: string
  code?: string
  active: boolean
  expiring: boolean
  allLocations: boolean
  categories: Record<
    number,
    {
      configuration: ConfiguredPhase[]
    }
  >
  assignedLocations: number[]
}

export type ConfiguredItemUpdateOptions = {
  itemId?: number
  defaultPhase?: OptionPhaseInfo
}

// Key prefix and type used to flatten the phases' data. This is neccessary to allow proper column binding.
export const PHASE_FLATTENED_KEY_PREFIX = 'phase.'
export type PhaseKey = `phase.${string}`

/**
 * This type represents an category as a list/table row.
 */
export type CategoryForTable = {
  id: number
  name: string
  customerName: string
  itemsCount: number
  active: string
  [phase: PhaseKey]: string | null
}

/**
 * This type represents an item as a list/table row.
 */
export type ItemForTable = {
  id: number
  name: string
  category: string
  customerName: string
  active: string
  [phase: PhaseKey]: string | null
}

/**
 * This type represents the details of a category we are viewing.
 */
export type CategoryFormValues = {
  name: string
  active: boolean
  customerId: number
  colorBackground: string
  colorText: string
  configuration: ConfiguredPhase[]
}

/**
 * This type represents the details of an item we are viewing.
 */
export type ItemFormValues = {
  name: string
  description: string
  code: string
  active: boolean
  expiring: boolean
  customerId: number
  categories: Array<{ label: string; value: NumericString }>
  locations: Array<{ label: string; value: NumericString }>
  configurations: Record<Numeric, ConfiguredPhase[]>
}

/**
 * An object used to represent the `allLocations` flag.
 */
export const AllLocationsObject = {
  label: 'All',
  value: '-1' as NumericString,
}

/**
 * This function returns a blank configured phase using the passed phase as a base.
 *
 * @returns A configured phase object based on the passed phase
 */
export const createNewPhaseConfigurationFromOption = (phaseOption: OptionPhaseInfo): ConfiguredPhase => {
  return {
    phaseId: phaseOption.id,
    phaseName: phaseOption.name,
    templateId: phaseOption.printTemplateId,
    isTabbed: phaseOption.isTabbed,
    expirationCustom: false,
    expirationCalculated: null,
    expirationAdditional: null,
    expirationFormat: 'Date and Time',
    expirationAdditionalFormat: 'Date and Time',
  }
}

/**
 * This function returns an object that represents a blank category. It's main use is to provide the initial values
 * of a newly created category.
 *
 * @returns An object with initial values for a new category
 */
export const createBlankCategoryForForm = (options: AllOptions, customerId: number = 0): CategoryFormValues => {
  return {
    name: '',
    active: true,
    customerId,
    colorBackground: '#ffffff',
    colorText: '#000000',
    configuration: options[customerId]?.possiblePhases.map((phaseOption) => createNewPhaseConfigurationFromOption(phaseOption)) ?? [],
  }
}

/**
 * This function returns an object that represents a blank item. It's main use is to provide the initial values of
 * a newly created item.
 *
 * @returns An object with initial values for a new item
 */
export const createBlankItemForForm = (customerId: number = 0): ItemFormValues => {
  return {
    name: '',
    description: '',
    code: '',
    active: true,
    expiring: true,
    customerId,
    categories: [],
    locations: [],
    configurations: {},
  }
}

/**
 * Validation schema to use when modifying the item's form.
 */
export const ItemValidationSchema = Yup.object().shape({
  name: Yup.string().required('Required'),
  categories: Yup.array().min(1),
  locations: Yup.array().min(1),
})

/**
 * Validation schema to use when modifying the category's form.
 */
export const CategoryValidationSchema = Yup.object().shape({
  name: Yup.string().required('Required'),
  colorBackground: Yup.string().required('Required'),
  configuration: Yup.array().min(1),
})

/**
 * This is a transform function that takes in an expanded category (usually from the response of an API call)
 * and returns an abstraction of said category ready to be displayed on a table.
 *
 * @param expandedItemCategory An category that has some extra information
 * @returns An abstraction of the given category ready for display in a table
 */
export const mapExpandedItemCategoryToTableRow = (expandedItemCategory: ExpandedCategory) => {
  const categoryForTable: CategoryForTable = {
    id: expandedItemCategory.id,
    name: expandedItemCategory.name,
    customerName: expandedItemCategory.customerName ?? '',
    itemsCount: expandedItemCategory.itemsCount,
    active: expandedItemCategory.active ? 'Yes' : 'No',
  }

  // Add each phase as a flatten property.
  expandedItemCategory.defaultDoc?.forEach((phase) => {
    categoryForTable[`${PHASE_FLATTENED_KEY_PREFIX}${phase.phaseName}`] = phase.expirationCalculated
  })

  return categoryForTable
}

/**
 * This is a transform function that takes in a configured item (usually from the response of an API call)
 * and returns an abstraction of said item ready to be displayed on a table.
 *
 * @param configuredItem An item that has been configured
 * @returns An abstraction of the given item ready for display in a table
 */
export const mapConfiguredItemToTableRows = (configuredItem: ConfiguredItem) => {
  return Object.values(configuredItem.categories).map((catConfig) => {
    const itemForTable: ItemForTable = {
      id: configuredItem.item.id,
      name: configuredItem.item.name,
      category: catConfig.category.name,
      customerName: configuredItem.item.customerName ?? '',
      active: configuredItem.item.active ? 'Yes' : 'No',
    }

    // Add each phase as a flatten property.
    catConfig.configuration.configuredDoc?.forEach((phase) => {
      itemForTable[`${PHASE_FLATTENED_KEY_PREFIX}${phase.phaseName}`] = phase.expirationCalculated
    })

    return itemForTable
  })
}

/**
 * This function takes in an color represented as an integer and converts it to a string in hexadecimal format.
 *
 * @returns An hexadecimal string with a leading `#` character.
 */
const convertDecToHexColorString = (color: number) => {
  const converted = color.toString(16)
  return `#${'0'.repeat(6 - converted.length)}${converted}`
}

/**
 * This is a transform function that takes in a category (usually from the response of an API call) and returns
 * an abstraction of said item ready to be displayed in a form.
 *
 * @param category A category object
 * @returns An abstraction of the given category ready for display in a form
 */
export const mapCategoryToFormValues = (category: CategoryDetails): CategoryFormValues => {
  return {
    name: category.name,
    active: category.active,
    customerId: category.customerId,
    colorBackground: convertDecToHexColorString(category.colorBackground),
    colorText: convertDecToHexColorString(category.colorText),
    configuration: category.defaultDoc ?? [],
  }
}

/**
 * This is a transform function that takes in a configured item (usually from the response of an API call)
 * and returns an abstraction of said item ready to be displayed in a form.
 *
 * @param configuredItem An item that has been configured
 * @returns An abstraction of the given item ready for display in a form
 */
export const mapConfiguredItemToFormValues = (configuredItem: ConfiguredItem): ItemFormValues => {
  const categoriesEntries = Object.entries(configuredItem.categories)

  return {
    name: configuredItem.item.name,
    description: configuredItem.item.description ?? '',
    code: configuredItem.item.code ?? '',
    active: configuredItem.item.active,
    expiring: configuredItem.item.expiring,
    customerId: configuredItem.item.customerId,
    categories: categoriesEntries.map(([categoryId, catAndConfig]) => {
      return { label: catAndConfig.category.name, value: categoryId as NumericString }
    }),
    locations: configuredItem.item.allLocations
      ? [AllLocationsObject]
      : Object.entries(configuredItem.assignedLocations ?? {}).map(([locationId, locationName]) => {
          return { label: locationName, value: locationId as NumericString }
        }),
    configurations: categoriesEntries.reduce((accum, [categoryId, catAndConfig]) => {
      // TECH DEBT: Phase configurations are only defined when the item can expire. However, an item with the 'Custom' category can
      // have a configuration defined since that represents that the item can simultaneously expire and not expire.
      if (configuredItem.item.expiring || catAndConfig.category.name.toLowerCase() === TECH_DEBT.NAME_OF_CUSTOM_CATEGORY) {
        accum[categoryId as NumericString] = catAndConfig.configuration.configuredDoc?.map((phase) => ({ ...phase })) ?? []
      }
      return accum
    }, {} as ItemFormValues['configurations']),
  }
}

/**
 * This function takes in an color represented as a string in hexadecimal format (with a leading `#` character)
 * and converts it to an integer.
 *
 * @returns An integer that represents the passed color
 */
function convertHexToDecColorInt(color: string) {
  return parseInt(color.substring(1), 16)
}

/**
 * This is a transform function that takes in the values set on the form and returns an object with the
 * neccessary data to create or modify a category.
 *
 * @param formValues The values set on the form
 * @param options Conditional values used to complement the ones from the form
 * @returns An object with the proper format to perform a create/update operation
 */
export const mapFormValuesToCategory = (formValues: CategoryFormValues, updateOptions: CategoryUpdateOptions): CategoryUpdate => {
  const { categoryId } = updateOptions

  return {
    ...(categoryId && { id: categoryId }),
    customerId: formValues.customerId,
    name: formValues.name,
    active: formValues.active,
    colorBackground: convertHexToDecColorInt(formValues.colorBackground),
    colorText: convertHexToDecColorInt(formValues.colorText),
    defaultDoc: formValues.configuration,
  }
}

/**
 * This is a transform function that takes in the values set on the form and returns an object with the
 * neccessary data to create or modify a configured item.
 *
 * @param formValues The values set on the form
 * @param options Conditional values used to complement the ones from the form
 * @returns An object with the proper format to perform a create/update operation
 */
export const mapFormValuesToConfiguredItem = (
  formValues: ItemFormValues,
  updateOptions: ConfiguredItemUpdateOptions
): ConfiguredItemUpdate => {
  const { itemId, defaultPhase } = updateOptions

  // TECH DEBT: The "dummy" configuration to use when no configurations were defined by the user but we need to save
  // something to the database. Needed because the app will break if there is no configured doc for each label
  const notExpiringConfig: ConfiguredPhase[] = [
    {
      phaseId: defaultPhase?.id ?? 0, // id = 0 is normally not possible because the database ids start at 1
      phaseName: defaultPhase?.name ?? "Default'", // The name mimics the one used by the true 'Default' phase but with a hint that it is not
      isTabbed: true,
      templateId: 1,
      expirationCustom: false,
      expirationCalculated: 'No Expiration',
      expirationAdditional: null,
      expirationFormat: null,
      expirationAdditionalFormat: null,
    },
  ]
  const assignedLocations = formValues.locations
    .filter((location) => location.value !== AllLocationsObject.value)
    .map((location) => parseInt(location.value, 10))

  return {
    ...(itemId && { id: itemId }),
    customerId: formValues.customerId,
    name: formValues.name,
    ...(formValues.description && { description: formValues.description }),
    ...(formValues.code && { code: formValues.code }),
    active: formValues.active,
    expiring: formValues.expiring,
    allLocations: formValues.locations.length > assignedLocations.length,
    categories: formValues.categories.reduce((accum, category) => {
      const categoryId = category.value
      const configuration = formValues.configurations[categoryId] ?? []
      accum[categoryId] = {
        configuration: configuration.length > 0 ? configuration : notExpiringConfig,
      }
      return accum
    }, {} as ConfiguredItemUpdate['categories']),
    assignedLocations,
  }
}
