// src/analytics/product-analytics.ts
import amplitude from '../amplitude'

export type Product = ''

export function trackProductEvent(product: Product, action: string, feature?: string, props?: Record<string, unknown>) {
  amplitude.track('Product Used', {
    product, // 👈 required: lets you slice DAU/WAU by product
    action, // e.g., 'create', 'start', 'complete', 'view', 'export'
    ...(feature ? { feature } : {}),
    ...(props ? props : {}),
  })
}

export function trackOnboardingStep(product: Product, stepName: string, stepIndex: number, props?: Record<string, unknown>) {
  amplitude.track('Onboarding Step Completed', {
    product,
    step_name: stepName,
    step_index: stepIndex,
    ...(props ?? {}),
  })
}
