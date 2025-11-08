import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import amplitude from './amplitude'
import { Product } from './analytics/product-analytics'

const usePageNameAsEventName = true

const CLICK_SAMPLE_RATE = 1.0

const cleanProps = (o?: Record<string, unknown>) =>
  o
    ? Object.fromEntries(
        Object.entries(o).filter(
          ([, v]) => v !== undefined && !(typeof v === 'number' && Number.isNaN(v))
        )
      )
    : undefined

const trackSafely = (eventName: string, properties?: Record<string, unknown>) => {
  try {
    amplitude.track(eventName, cleanProps(properties))
  } catch (error) {
    /* noop on analytics failure */
  }
}

const routeToProduct = (path: string): Product | undefined => {
  if (path.startsWith('/labels')) return 'PowerLabels'
  if (path.startsWith('/tasks')) return 'PowerTasks'
  if (path.startsWith('/sensor')) return 'PowerTemp'
  if (path.startsWith('/sensors-processes')) return 'ProcessProbe'
  if (path.startsWith('/digital-prep')) return 'DigitalPrep'
  if (path.startsWith('/account') || path.startsWith('/device') || path.startsWith('/compliance')) return 'HandScanner'
  return undefined
}

const getFeatureGroup = (pathname: string): string => {
  if (pathname.startsWith('/sensors') || pathname.startsWith('/sensor-data-reporting')) return 'Sensor Monitoring'
  if (pathname.startsWith('/sensors-processes')) return 'Processes Monitoring'
  if (pathname.startsWith('/labels') || pathname.startsWith('/digital-prep')) return 'Labeling & Digital Prep'
  if (pathname.startsWith('/tasks')) return 'Tasks'
  if (pathname.startsWith('/account') || pathname.startsWith('/compliance')) return 'Handwashing Data'
  if (pathname.startsWith('/employees') || pathname.startsWith('/users')) return 'People Management'
  if (pathname.startsWith('/change-password') || pathname.startsWith('/login') || pathname.startsWith('/api-management')) return 'Account & Auth'
  if (pathname.startsWith('/devices') || pathname.startsWith('/image-review')) return 'Scanner Insights'
  return 'Other'
}

const routeNameMap: Record<string, string> = {
  '/account': 'Home',
  '/compliance': 'Goal Compliance',
  '/devices': 'Scanner Details',
  '/login': 'Login',
  '/image-review': 'Scanning Images',
  '/safety-forms': 'Compliance Forms',
  '/sensors-overview': 'Sensor Dashboard',
  '/sensor-data-reporting': 'Sensor Data Reporting',
  '/sensors-processes': 'Cooldown Dashboard',
  '/sensors': 'Sensor List',
  '/tasks': 'Task Lists',
  '/tasks/new': 'Create a Task List',
  '/labels/categories': 'Label Categories List',
  '/digital-prep/categories': 'Digital Prep Categories List',
  '/labels/categories/new': 'New Label Categories',
  '/digital-prep/categories/new': 'New Digital Prep Categories',
  '/labels/items': 'List of Label Items',
  '/digital-prep/items': 'List of Digital Prep Items',
  '/labels/items/new': 'Create New Label Items',
  '/digital-prep/items/new': 'Create New Digital Prep Items',
  '/location-list': 'Location Lists',
  '/location-group-list': 'Location Groups',
  '/handwashing-goals-list': 'Handwashing Goals Details',
  '/handwashing-goals-set': 'Create New Handwashing Goals',
  '/employees-list': 'List of Employees',
  '/employees/new': 'Create New Employees',
  '/import-employees': 'Bulk Import Employees',
  '/users': 'User List',
  '/users/new': 'Create New User',
  '/api-management': 'API Key Management',
  '/change-password': 'Change Account Password',
}

const getPageName = (pathname: string): string => {
  if (pathname.startsWith('/sensors/')) return 'Sensor Detail'
  if (pathname.startsWith('/sensor-data-reporting')) return 'Sensor Data Reporting'
  if (pathname.startsWith('/tasks/')) return 'Task Detail'
  if (pathname.startsWith('/labels/categories/')) return 'Label Category Detail'
  if (pathname.startsWith('/digital-prep/categories/')) return 'Digital Prep Category Detail'
  if (pathname.startsWith('/labels/items/')) return 'Label Item Detail'
  if (pathname.startsWith('/digital-prep/items/')) return 'Digital Prep Item Detail'
  if (pathname.startsWith('/location-list/')) return 'Location Detail'
  if (pathname.startsWith('/employees-list/')) return 'Employee Detail'
  if (pathname.startsWith('/users/edit/')) return 'User Detail'
  return routeNameMap[pathname] || 'Unknown Page'
}

// ---- Page context ---------------------------------------------------
type PageCtx = {
  path: string
  page_name: string
  product?: Product
  feature_group: string
  // params / ids
  report_id?: string | null
  location_id?: string | null
  date?: string | null
  sensor_id?: string
  tasklist_id?: string
  labelcategory_id?: string
  digitalprepcategory_id?: string
  labelitem_id?: string
  digitalprepitem_id?: string
  locationdetails_id?: string
  employeedetails_id?: string
  userdetails_id?: string
}

function buildPageCtx(path: string, search: string): PageCtx {
  const page_name = getPageName(path)
  const product = routeToProduct(path)
  const feature_group = getFeatureGroup(path)

  const sp = new URLSearchParams(search)
  const report_id = sp.get('reportId')
  const location_id = sp.get('locationId')
  const date = sp.get('date')

  return {
    path,
    page_name,
    product,
    feature_group,
    report_id,
    location_id,
    date,
    sensor_id: path.match(/^\/sensors\/([a-zA-Z0-9-]+)$/)?.[1],
    tasklist_id: path.match(/^\/tasks\/(\d+)$/)?.[1],
    labelcategory_id: path.match(/^\/labels\/categories\/(\d+)$/)?.[1],
    digitalprepcategory_id: path.match(/^\/digital-prep\/categories\/(\d+)$/)?.[1],
    labelitem_id: path.match(/^\/labels\/items\/(\d+)$/)?.[1],
    digitalprepitem_id: path.match(/^\/digital-prep\/items\/(\d+)$/)?.[1],
    locationdetails_id: path.match(/^\/location-list\/(\d+)$/)?.[1],
    employeedetails_id: path.match(/^\/employees-list\/(\d+)$/)?.[1],
    userdetails_id: path.match(/^\/users\/edit\/([a-zA-Z0-9-]+)$/)?.[1],
  }
}

// ---- Click helpers --------------------------------------------------
function findClickable(start: HTMLElement | null): HTMLElement | null {
  if (!start) return null
  return (
    start.closest('button, a, [role="button"], [data-analytics], input[type="submit"], input[type="button"]') as HTMLElement | null
  )
}

function visibleText(el: Element): string | undefined {
  const raw = (el.textContent || '').trim().replace(/\s+/g, ' ')
  if (!raw) return undefined
  return raw.slice(0, 80) // cap length
}

function clickLabel(el: HTMLElement): string | undefined {
  // prefer explicit labels
  const data = el.getAttribute('data-analytics') || el.getAttribute('data-testid')
  const aria = el.getAttribute('aria-label')
  const title = el.getAttribute('title')
  const text = visibleText(el)
  return data || aria || title || text || undefined
}

function shouldSkipElement(el: HTMLElement): boolean {
  // never log sensitive input values; we only report metadata and text
  if (el.closest('input[type="password"]')) return true
  return false
}

// ---- Hook -----------------------------------------------------------
export const useAmplitudePageTracking = () => {
  const location = useLocation()

  // Page timing
  const entryTimeRef = useRef<number | null>(null)
  const currentPageRef = useRef<PageCtx | null>(null)

  // Single consolidated page event on route change + tab close
  useEffect(() => {
    const now = Date.now()
    const currPath = location.pathname
    const currSearch = location.search

    // Emit for the page we're leaving
    if (entryTimeRef.current && currentPageRef.current) {
      const exitTs = now
      const entryTs = entryTimeRef.current
      const durationMs = exitTs - entryTs
      const page = currentPageRef.current
      const eventName = usePageNameAsEventName ? page.page_name : 'Page Activity'

      trackSafely(eventName, {
        entry_ts: entryTs,
        exit_ts: exitTs,
        duration_ms: durationMs,
        duration_seconds: Math.round(durationMs / 1000),
        page_name: page.page_name,
        path: page.path,
        feature_group: page.feature_group,
        ...(page.product ? { product: page.product } : {}),
        report_id: page.report_id,
        location_id: page.location_id,
        date: page.date,
        sensor_id: page.sensor_id,
        tasklist_id: page.tasklist_id,
        labelcategory_id: page.labelcategory_id,
        digitalprepcategory_id: page.digitalprepcategory_id,
        labelitem_id: page.labelitem_id,
        digitalprepitem_id: page.digitalprepitem_id,
        locationdetails_id: page.locationdetails_id,
        employeedetails_id: page.employeedetails_id,
        userdetails_id: page.userdetails_id,
      })
    }

    // Start tracking the current page
    entryTimeRef.current = now
    currentPageRef.current = buildPageCtx(currPath, currSearch)

    const handleBeforeUnload = () => {
      if (entryTimeRef.current && currentPageRef.current) {
        const exitTs = Date.now()
        const entryTs = entryTimeRef.current
        const durationMs = exitTs - entryTs
        const page = currentPageRef.current
        const eventName = usePageNameAsEventName ? page.page_name : 'Page Activity'

        trackSafely(eventName, {
          entry_ts: entryTs,
          exit_ts: exitTs,
          duration_ms: durationMs,
          duration_seconds: Math.round(durationMs / 1000),
          page_name: page.page_name,
          path: page.path,
          feature_group: page.feature_group,
          ...(page.product ? { product: page.product } : {}),
          report_id: page.report_id,
          location_id: page.location_id,
          date: page.date,
          sensor_id: page.sensor_id,
          tasklist_id: page.tasklist_id,
          labelcategory_id: page.labelcategory_id,
          digitalprepcategory_id: page.digitalprepcategory_id,
          labelitem_id: page.labelitem_id,
          digitalprepitem_id: page.digitalprepitem_id,
          locationdetails_id: page.locationdetails_id,
          employeedetails_id: page.employeedetails_id,
          userdetails_id: page.userdetails_id,
        })
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [location.pathname, location.search])

  // Delegated click tracking with page + product context
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (Math.random() > CLICK_SAMPLE_RATE) return

      const target = ev.target as HTMLElement | null
      const clickable = findClickable(target)
      if (!clickable || shouldSkipElement(clickable)) return

      // Current page context
      const page = currentPageRef.current
      const pageProps = page
        ? {
            page_name: page.page_name,
            path: page.path,
            feature_group: page.feature_group,
            ...(page.product ? { product: page.product } : {}),
          }
        : {}

      const tag = clickable.tagName.toLowerCase()
      const role = clickable.getAttribute('role') || undefined
      const id = clickable.id || undefined
      const name = clickable.getAttribute('name') || undefined
      const href =
        (clickable as HTMLAnchorElement).href
          ? (clickable as HTMLAnchorElement).href.slice(0, 200)
          : undefined
      const label = clickLabel(clickable)

      trackSafely('UI Click', {
        ...pageProps,
        tag,
        role,
        id,
        name,
        href,
        label, // best-effort name for the action
        // raw text in case no better label (short, trimmed)
        ...(label ? {} : { text: visibleText(clickable) }),
      })
    }

    // capture phase so we catch clicks before React stops propagation
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true } as any)
  }, [])
}
