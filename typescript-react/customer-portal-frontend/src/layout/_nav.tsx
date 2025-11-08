import { api } from '../api/api'
import { DISPLAY_PAGES, PATHNAME_LIST_USERS } from '../api/constants'

export type NavigationOption = {
  _tag: 'CSidebarNavDropdown' | 'CSidebarNavItem'
  name: string
  icon: string
  to?: string
  onClick?: () => void
  permissions?: DISPLAY_PAGES[]
  hideIfNotPermitted?: boolean
  filtersbar?: 'true'
  _children?: NavigationOption[]
}

const navigationObject: NavigationOption[] = [
  {
    _tag: 'CSidebarNavDropdown',
    name: 'Hand Scanning',
    icon: 'cil-drop',
    onClick: () => api.abortAllRequests(),
    permissions: [
      DISPLAY_PAGES.ITEM_VIEW_HANDWASHES,
      DISPLAY_PAGES.ITEM_VIEW_COMPLIANCE,
      DISPLAY_PAGES.ITEM_VIEW_DEVICES,
      DISPLAY_PAGES.ITEM_VIEW_SCAN_IMAGES,
    ],
    _children: [
      {
        _tag: 'CSidebarNavItem',
        name: 'Scanning Activity',
        to: '/account',
        icon: 'cil-bar-chart',
        permissions: [DISPLAY_PAGES.ITEM_VIEW_HANDWASHES],
        hideIfNotPermitted: true,
        filtersbar: 'true',
      },
      {
        _tag: 'CSidebarNavItem',
        name: 'Goal Compliance',
        to: '/compliance',
        icon: 'cil-chart-line',
        permissions: [DISPLAY_PAGES.ITEM_VIEW_COMPLIANCE],
        hideIfNotPermitted: true,
        filtersbar: 'true',
      },
      {
        _tag: 'CSidebarNavItem',
        name: 'Scanner Details',
        to: '/devices',
        icon: 'cil-cast',
        permissions: [DISPLAY_PAGES.ITEM_VIEW_DEVICES],
        hideIfNotPermitted: true,
        filtersbar: 'true',
      },
      {
        _tag: 'CSidebarNavItem',
        name: 'Scan Images',
        to: '/image-review',
        icon: 'cil-image',
        permissions: [DISPLAY_PAGES.ITEM_VIEW_SCAN_IMAGES],
        hideIfNotPermitted: true,
        filtersbar: 'true',
      },
    ],
  },
  {
    _tag: 'CSidebarNavDropdown',
    name: 'Forms and Checklists',
    icon: 'cil-task',
    onClick: () => api.abortAllRequests(),
    permissions: [DISPLAY_PAGES.ITEM_VIEW_FORM_RESPONSES],
    hideIfNotPermitted: true,
    _children: [
      {
        _tag: 'CSidebarNavItem',
        name: 'Safety Forms',
        to: '/safety-forms',
        icon: 'cil-clipboard',
        filtersbar: 'true',
        permissions: [DISPLAY_PAGES.ITEM_VIEW_FORM_RESPONSES],
      },
    ],
  },
  {
    _tag: 'CSidebarNavDropdown',
    name: 'Sensors',
    icon: 'cil-audio',
    permissions: [DISPLAY_PAGES.ITEM_VIEW_SENSORS, DISPLAY_PAGES.ITEM_VIEW_COOLDOWN],
    onClick: () => api.abortAllRequests(),
    _children: [
      {
        _tag: 'CSidebarNavItem',
        name: 'Sensor Overview',
        to: '/sensors-overview',
        icon: 'cil-view-module',
        permissions: [DISPLAY_PAGES.ITEM_VIEW_SENSORS],
        hideIfNotPermitted: true,
      },
      {
        _tag: 'CSidebarNavItem',
        name: 'Sensor Processes',
        to: '/sensors-processes',
        icon: 'cil-graph',
        permissions: [DISPLAY_PAGES.ITEM_VIEW_COOLDOWN],
        hideIfNotPermitted: true,
      },
      {
        _tag: 'CSidebarNavItem',
        name: 'Sensor List',
        to: '/sensors',
        icon: 'cil-list',
        permissions: [DISPLAY_PAGES.ITEM_VIEW_SENSORS],
        hideIfNotPermitted: true,
      },
    ],
  },
  {
    _tag: 'CSidebarNavDropdown',
    name: 'Task Management',
    icon: 'cil-check',
    onClick: () => api.abortAllRequests(),
    permissions: [DISPLAY_PAGES.ITEM_VIEW_TASKS, DISPLAY_PAGES.ITEM_CREATE_TASKS],
    _children: [
      {
        _tag: 'CSidebarNavItem',
        name: 'View Task Lists',
        to: `/tasks`,
        icon: 'cil-list',
        permissions: [DISPLAY_PAGES.ITEM_VIEW_TASKS],
      },
      {
        _tag: 'CSidebarNavItem',
        name: 'Create Task List',
        to: '/tasks/new',
        icon: 'cil-plus',
        permissions: [DISPLAY_PAGES.ITEM_CREATE_TASKS],
      },
      {
        _tag: 'CSidebarNavItem',
        name: 'Create Task List (Refactor)',
        to: '/tasks/refactor/new',
        icon: 'cil-plus',
        permissions: [DISPLAY_PAGES.INTERNAL_ONLY],
        hideIfNotPermitted: true,
      },
    ],
  },
  {
    _tag: 'CSidebarNavDropdown',
    name: 'Labels',
    icon: 'cil-tag',
    onClick: () => api.abortAllRequests(),
    permissions: [DISPLAY_PAGES.ITEM_VIEW_LABELS, DISPLAY_PAGES.ITEM_CREATE_LABELS, DISPLAY_PAGES.ITEM_ORDER_LABELS],
    _children: [
      {
        _tag: 'CSidebarNavDropdown',
        name: 'Category Management',
        icon: 'cil-layers',
        _children: [
          {
            _tag: 'CSidebarNavItem',
            name: 'View Category List',
            to: '/labels/categories',
            icon: 'cil-list',
            permissions: [DISPLAY_PAGES.ITEM_VIEW_LABELS],
          },
          {
            _tag: 'CSidebarNavItem',
            name: 'Digital Prep Categories',
            to: '/digital-prep/categories',
            icon: 'cil-list',
            permissions: [DISPLAY_PAGES.ITEM_VIEW_DIGITAL_PREP],
            hideIfNotPermitted: true,
          },
          {
            _tag: 'CSidebarNavItem',
            name: 'Create Category',
            to: '/labels/categories/new',
            icon: 'cil-plus',
            permissions: [DISPLAY_PAGES.ITEM_CREATE_LABELS],
          },
        ],
      },
      {
        _tag: 'CSidebarNavDropdown',
        name: 'Ingredient Management',
        icon: 'cil-restaurant',
        _children: [
          {
            _tag: 'CSidebarNavItem',
            name: 'View Ingredient List',
            to: '/labels/items',
            icon: 'cil-list',
            permissions: [DISPLAY_PAGES.ITEM_VIEW_LABELS],
          },
          {
            _tag: 'CSidebarNavItem',
            name: 'Digital Prep Items',
            to: '/digital-prep/items',
            icon: 'cil-list',
            permissions: [DISPLAY_PAGES.ITEM_VIEW_DIGITAL_PREP],
            hideIfNotPermitted: true,
          },
          {
            _tag: 'CSidebarNavItem',
            name: 'Create Ingredient',
            to: '/labels/items/new',
            icon: 'cil-plus',
            permissions: [DISPLAY_PAGES.ITEM_CREATE_LABELS],
          },
        ],
      },
      //{
      //  _tag: 'CSidebarNavItem',
      //  name: 'Order Labels',
      //  icon: 'cil-basket',
      //  permissions: [DISPLAY_PAGES.ITEM_ORDER_LABELS],
      //  to: '/labels/order',
      //},
    ],
  },
  {
    _tag: 'CSidebarNavDropdown',
    name: 'Locations',
    icon: 'cil-building',
    onClick: () => api.abortAllRequests(),
    _children: [
      {
        _tag: 'CSidebarNavItem',
        name: 'All Locations',
        to: '/location-list',
        icon: 'cil-building',
      },
      {
        _tag: 'CSidebarNavItem',
        name: 'Location Groups',
        to: '/location-group-list',
        icon: 'cil-object-group',
      },
      {
        _tag: 'CSidebarNavDropdown',
        name: 'Handwashing Goals',
        icon: 'cil-task',
        permissions: [DISPLAY_PAGES.ITEM_SET_GOALS],
        hideIfNotPermitted: true,
        _children: [
          {
            _tag: 'CSidebarNavItem',
            name: 'Edit Goals',
            to: '/handwashing-goals-list',
            icon: 'cil-list',
          },
          {
            _tag: 'CSidebarNavItem',
            name: 'Create New Goals',
            to: '/handwashing-goals-set',
            icon: 'cil-plus',
          },
        ],
      },
    ],
  },
  {
    _tag: 'CSidebarNavDropdown',
    name: 'Manage Employees',
    icon: 'cil-people',
    onClick: () => api.abortAllRequests(),
    permissions: [DISPLAY_PAGES.ITEM_VIEW_EMPLOYEES, DISPLAY_PAGES.ITEM_EDIT_EMPLOYEES, DISPLAY_PAGES.ITEM_UPLOAD_EMPLOYEES],
    hideIfNotPermitted: true,
    _children: [
      {
        _tag: 'CSidebarNavItem',
        name: 'View All Employees',
        to: '/employees-list',
        icon: 'cil-list',
        permissions: [DISPLAY_PAGES.ITEM_VIEW_EMPLOYEES],
        hideIfNotPermitted: true,
      },
      {
        _tag: 'CSidebarNavItem',
        name: 'Create New Employee',
        to: '/employees/new',
        icon: 'cil-plus',
        permissions: [DISPLAY_PAGES.ITEM_EDIT_EMPLOYEES],
        hideIfNotPermitted: true,
      },
      {
        _tag: 'CSidebarNavItem',
        name: 'Import Employees',
        to: '/import-employees',
        icon: 'cil-user-plus',
        permissions: [DISPLAY_PAGES.ITEM_UPLOAD_EMPLOYEES],
        hideIfNotPermitted: true,
      },
    ],
  },
  {
    _tag: 'CSidebarNavDropdown',
    name: 'Manage Users',
    icon: 'cil-user',
    onClick: () => api.abortAllRequests(),
    permissions: [DISPLAY_PAGES.ITEM_VIEW_USERS, DISPLAY_PAGES.ITEM_CREATE_USERS],
    hideIfNotPermitted: true,
    _children: [
      {
        _tag: 'CSidebarNavItem',
        name: 'View All Users',
        to: `/${PATHNAME_LIST_USERS}`,
        icon: 'cil-list',
        permissions: [DISPLAY_PAGES.ITEM_VIEW_USERS],
      },
      {
        _tag: 'CSidebarNavItem',
        name: 'Create User',
        to: `/${PATHNAME_LIST_USERS}/new`,
        icon: 'cil-plus',
        permissions: [DISPLAY_PAGES.ITEM_CREATE_USERS],
        hideIfNotPermitted: true,
      },
    ],
  },
  {
    _tag: 'CSidebarNavItem',
    name: 'Accessories Store',
    icon: 'cil-basket',
    permissions: [DISPLAY_PAGES.ITEM_ORDER_LABELS],
    onClick: () => {
      api.abortAllRequests(); 
      window.open('https://31p8hk-ku.myshopify.com/collections/all', '_blank', 'noopener');
    }
  },
  {
    _tag: 'CSidebarNavItem',
    name: 'Resources',
    to: '/resources',
    icon: 'cil-folder-open',
  },
  {
    _tag: 'CSidebarNavItem',
    name: 'Support',
    to: '/support',
    icon: 'cil-speech',
  },
]

export default navigationObject
