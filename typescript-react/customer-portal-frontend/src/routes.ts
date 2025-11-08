import React from 'react'
import {
  DISPLAY_PAGES,
  PATHNAME_LIST_USERS,
  PATHNAME_EDIT_USER,
  PATHNAME_CREATE_USER,
  SENSOR_DATA_REPORTING_PATHNAME,
} from './api/constants'

// const Insights = React.lazy(() => import('./views/insights/Insights'));
import Insights from './modules/hand-scanning/insights/Insights'
import APIManagement from './modules/tools/api-management/APIManagementContainer'
import Sensors from './modules/sensors/crud/containers/Sensors'
import EditSensor from './modules/sensors/crud/containers/SensorDetails'
import NewSensor from './modules/sensors/crud/containers/SensorDetails'
const Devices = React.lazy(() => import('./modules/hand-scanning/device-tables/Devices'))
const Compliance = React.lazy(() => import('./modules/hand-scanning/compliance/Compliance'))
const ImageReview = React.lazy(() => import('./modules/hand-scanning/image-review/ImageReview'))
const Resources = React.lazy(() => import('./layout/resources/Resources'))
const Support = React.lazy(() => import('./layout/support/Support'))
const ChangePassword = React.lazy(() => import('./layout/login/change-password/ChangePassword'))

const SetGoalsView = React.lazy(() => import('./modules/operations/locations/handwashing-goals/pages/SetGoalsView'))
const LocationsAndGoalsView = React.lazy(() => import('./modules/operations/locations/handwashing-goals/pages/LocationsAndGoalsView'))

const Users = React.lazy(() => import('./modules/operations/users/Users'))
const UserDetails = React.lazy(() => import('./modules/operations/users/UserDetails'))
// const NewUser = React.lazy(() => import('./modules/operations/users/NewUser'))

const Employees = React.lazy(() => import('./modules/operations/employees/Employees'))
const EmployeeDetails = React.lazy(() => import('./modules/operations/employees/EmployeeDetails'))
const NewEmployee = React.lazy(() => import('./modules/operations/employees/NewEmployee'))

const Locations = React.lazy(() => import('./modules/operations/locations/pages/Locations'))
const LocationDetails = React.lazy(() => import('./modules/operations/locations/pages/LocationDetails'))

const LocationGroups = React.lazy(() => import('./modules/operations/locations/location-groups/pages/LocationGroups'))

const ImportEmployees = React.lazy(() => import('./modules/operations/locations/pages/ImportEmployees'))
const DefaultDesktopFallback = React.lazy(() => import('./modules/overview/Default'))
const WellnessCheckDashboard = React.lazy(() => import('./modules/forms/wellness-checks/components/WellnessCheckDashboard'))
const OverviewSection = React.lazy(() => import('./modules/overview/OverviewSection'))
const SensorOverview = React.lazy(() => import('./modules/sensors/overview-dashboard/containers/SensorDashboard'))
const SensorAlerts = React.lazy(() => import('./modules/sensors/dashboard-alerts/containers/SensorAlerts'))
const SensorProcessDashboard = React.lazy(() => import('./modules/sensors/monitored-processes/SensorProcessDashboard'))
const Categories = React.lazy(() => import('./modules/labeling/categories'))
const CategoryEdit = React.lazy(() => import('./modules/labeling/category-edit'))
const Items = React.lazy(() => import('./modules/labeling/items'))
const ItemEdit = React.lazy(() => import('./modules/labeling/item-edit'))
const LabelOrder = React.lazy(() => import('./modules/labeling/label-order'))
const SensorDataReports = React.lazy(() => import('./modules/sensors/overview-dashboard/data-reports/SensorDataReports'))
// const SensorOverview = React.lazy(() => import('./modules/view-only/RaisingCanes'))
// const UserDetails = React.lazy(() => import('./views/manage-users/UserDetails'))

const DigiPrepItems = React.lazy(() => import('./modules/digital-prep/items'))
const DigiPrepItemEdit = React.lazy(() => import('./modules/digital-prep/item-edit'))
const DigiPrepCategories = React.lazy(() => import('./modules/digital-prep/categories'))
const DigiPrepCategoryEdit = React.lazy(() => import('./modules/digital-prep/category-edit'))

const Tasks = React.lazy(() => import('./modules/tasks/tasks'))
const TaskListReport = React.lazy(() => import('./modules/tasks/task-report-page'))
const TaskEdit = React.lazy(() => import('./modules/tasks/task-edit'))
const TaskEditNew = React.lazy(() => import('./modules/tasks/task-edit-new'))

// https://github.com/ReactTraining/react-router/tree/master/packages/react-router-config
export interface AppRoute {
  path: string
  name: string
  exact?: boolean
  component?: any //()=>JSX.Element | ((props: any) => JSX.Element);
  filtersbar?: string
  requiredpermission?: DISPLAY_PAGES
}

export const routes: AppRoute[] = [
  { path: '/', exact: true, name: 'Home' },
  {
    path: '/account',
    name: 'Handwashes Dashboard',
    component: Insights,
    filtersbar: 'true',
  },
  {
    path: '/account-noauth',
    name: 'Handwashes Dashboard',
    component: DefaultDesktopFallback,
  },

  {
    path: '/account/:departmentId',
    name: 'Handwashes Dashboard',
    component: Insights,
    filtersbar: 'true',
  },

  {
    path: '/handwashing-goals-list',
    name: 'Edit Goals',
    component: LocationsAndGoalsView,
    requiredpermission: DISPLAY_PAGES.ITEM_SET_GOALS,
  },
  {
    path: '/handwashing-goals-set',
    name: 'Set Handwashing Goals',
    component: SetGoalsView,
    requiredpermission: DISPLAY_PAGES.ITEM_SET_GOALS,
  },
  {
    path: '/handwashing-goals-set?editLocationId=:id',
    name: 'Set Handwashing Goals',
    component: SetGoalsView,
    requiredpermission: DISPLAY_PAGES.ITEM_SET_GOALS,
  },
  {
    path: '/location-list',
    exact: true,
    name: 'Locations',
    component: Locations,
  },
  {
    path: '/location-list/:id',
    exact: true,
    name: 'Location Details',
    component: LocationDetails,
  },
  {
    path: '/location-group-list',
    name: 'Location Groups',
    component: LocationGroups,
  },
  {
    path: '/import-employees',
    name: 'Import Employees',
    component: ImportEmployees,
    requiredpermission: DISPLAY_PAGES.ITEM_UPLOAD_EMPLOYEES,
  },

  {
    path: `/${PATHNAME_LIST_USERS}`,
    name: 'User List',
    exact: true,
    component: Users,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_USERS,
  },
  {
    path: `/${PATHNAME_EDIT_USER}/:id`,
    name: 'User Details',
    component: UserDetails,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_USERS,
  },
  {
    path: `/${PATHNAME_CREATE_USER}`,
    name: 'New User Details',
    component: UserDetails,
    requiredpermission: DISPLAY_PAGES.ITEM_CREATE_USERS,
  },
  {
    path: '/employees-list',
    exact: true,
    name: 'View All Employees',
    component: Employees,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_EMPLOYEES,
  },
  {
    path: '/employees-list/:id',
    exact: true,
    name: 'Employee Details',
    component: EmployeeDetails,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_EMPLOYEES,
  },
  {
    path: '/employees/new',
    exact: true,
    name: 'Create New Employee',
    component: NewEmployee,
    requiredpermission: DISPLAY_PAGES.ITEM_EDIT_EMPLOYEES,
  },

  {
    path: '/devices',
    name: 'Devices Dashboard',
    component: Devices,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_DEVICES,
    filtersbar: 'true',
  },
  {
    path: '/compliance',
    name: 'Compliance Dashboard',
    component: Compliance,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_COMPLIANCE,
    filtersbar: 'true',
  },
  {
    path: '/safety-forms',
    name: 'Safety Form Dashboard',
    component: WellnessCheckDashboard,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_COMPLIANCE,
    filtersbar: 'true',
  },
  { path: '/resources', name: 'Resources', component: Resources },
  {
    path: '/image-review',
    name: 'Image Review Dashboard',
    component: ImageReview,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_SCAN_IMAGES,
    filtersbar: 'true',
  },
  { path: '/resources', name: 'Resources', component: Resources },
  { path: '/support', name: 'Support', component: Support },
  {
    path: '/change-password',
    name: 'Change Password',
    component: ChangePassword,
  },
  // route for the new overview page for designing the new dashboard

  {
    path: '/overview',
    name: 'Overview',
    component: OverviewSection,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_OVERVIEW,
  },
  {
    path: '/api-management',
    name: 'API Management',
    component: APIManagement,
    requiredpermission: DISPLAY_PAGES.ITEM_DEVELOPER_OPTIONS,
  }, // route for sensors
  {
    path: '/sensors',
    name: 'Sensors',
    exact: true,
    component: Sensors,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_SENSORS,
  },
  {
    path: '/sensors/new',
    name: 'Create New Sensor',
    exact: true,
    component: NewSensor,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_SENSORS,
  },
  {
    path: '/sensors-alerts',
    name: 'Sensor Alerts',
    component: SensorAlerts,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_SENSORS,
    filtersbar: 'true',
  },
  {
    path: '/sensors-overview',
    name: 'Sensors',
    component: SensorOverview,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_SENSORS,
    filtersbar: 'true',
  },
  {
    path: '/sensors-processes',
    name: 'Sensor Processes',
    component: SensorProcessDashboard,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_SENSORS,
    filtersbar: 'true',
  },

  {
    path: '/sensors/:id',
    name: 'View / Edit Sensor',
    exact: true,
    component: EditSensor,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_SENSORS,
  },
  {
    path: '/tasks/task-list-report',
    name: 'Task List Report',
    exact: true,
    component: TaskListReport,
    requiredpermission: DISPLAY_PAGES.ITEM_EDIT_TASKS,
  },
  {
    path: '/tasks',
    name: 'Tasks',
    exact: true,
    component: Tasks,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_TASKS,
  },
  {
    path: '/tasks/new',
    name: 'Task Edit',
    exact: true,
    component: TaskEdit,
    requiredpermission: DISPLAY_PAGES.ITEM_CREATE_TASKS,
  },
  {
    path: '/tasks/:id',
    name: 'Task Edit',
    exact: true,
    component: TaskEdit,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_TASKS,
  },
  {
    path: '/tasks/refactor/new',
    name: 'Task Edit (Refactor)',
    exact: true,
    component: TaskEditNew,
    requiredpermission: DISPLAY_PAGES.INTERNAL_ONLY,
  },
  {
    path: '/tasks/refactor/:id',
    name: 'Task Edit (Refactor)',
    exact: true,
    component: TaskEditNew,
    requiredpermission: DISPLAY_PAGES.INTERNAL_ONLY,
  },
  /* Labeling Routes */
  {
    path: '/labels/categories',
    name: 'Categories',
    exact: true,
    component: Categories,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_LABELS,
  },
  {
    path: '/labels/categories/new',
    name: 'Category Edit',
    exact: true,
    component: CategoryEdit,
    requiredpermission: DISPLAY_PAGES.ITEM_CREATE_LABELS,
  },
  {
    path: '/labels/categories/:categoryId',
    name: 'Category Edit',
    exact: true,
    component: CategoryEdit,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_LABELS,
  },
  {
    path: '/labels/items',
    name: 'Ingredients',
    exact: true,
    component: Items,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_LABELS,
  },
  {
    path: '/labels/items/new',
    name: 'Ingredient Edit',
    exact: true,
    component: ItemEdit,
    requiredpermission: DISPLAY_PAGES.ITEM_CREATE_LABELS,
  },
  {
    path: '/labels/items/:itemId',
    name: 'Ingredient Edit',
    exact: true,
    component: ItemEdit,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_LABELS,
  },
  {
    path: '/digital-prep/items',
    name: 'Items - Digital Prep',
    exact: true,
    component: DigiPrepItems,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_DIGITAL_PREP,
  },
  {
    path: '/digital-prep/items/new',
    name: 'Item Edit',
    exact: true,
    component: DigiPrepItemEdit,
    requiredpermission: DISPLAY_PAGES.ITEM_CREATE_DIGITAL_PREP,
  },
  {
    path: '/digital-prep/items/:itemId',
    name: 'Item Edit',
    exact: true,
    component: DigiPrepItemEdit,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_DIGITAL_PREP,
  },
  {
    path: '/digital-prep/categories',
    name: 'Categories - Digital Prep',
    exact: true,
    component: DigiPrepCategories,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_DIGITAL_PREP,
  },
  {
    path: '/digital-prep/categories/new',
    name: 'Category Edit',
    exact: true,
    component: DigiPrepCategoryEdit,
    requiredpermission: DISPLAY_PAGES.ITEM_CREATE_DIGITAL_PREP,
  },
  {
    path: '/digital-prep/categories/:categoryId',
    name: 'Category Edit',
    exact: true,
    component: DigiPrepCategoryEdit,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_DIGITAL_PREP,
  },
  {
    path: '/labels/order',
    name: 'Order',
    exact: true,
    component: LabelOrder,
    requiredpermission: DISPLAY_PAGES.ITEM_ORDER_LABELS,
  },
  {
    path: '/' + SENSOR_DATA_REPORTING_PATHNAME,
    name: 'Sensor Data Reports',
    exact: true,
    component: SensorDataReports,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_SENSORS,
  },
  {
    path: `/${SENSOR_DATA_REPORTING_PATHNAME}/:date/locationId:/reportId:`,
    name: 'Sensor Data Reports',
    exact: true,
    component: SensorDataReports,
    requiredpermission: DISPLAY_PAGES.ITEM_VIEW_SENSORS,
  },
]

export default routes
