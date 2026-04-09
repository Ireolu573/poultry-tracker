/**
 * Performance Monitoring Utility
 * Tracks and logs key performance metrics
 */

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
}

const metrics: PerformanceMetric[] = []

/**
 * Track a custom performance metric
 */
export function trackMetric(name: string, value: number, unit = 'ms') {
  const metric: PerformanceMetric = {
    name,
    value,
    unit,
    timestamp: Date.now(),
  }
  metrics.push(metric)

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`📊 ${name}: ${value}${unit}`)
  }

  // Send to Vercel Speed Insights if available
  if (window.gtag) {
    window.gtag('event', 'performance_metric', {
      metric_name: name,
      value: value,
      unit: unit,
    })
  }
}

/**
 * Track API response time
 */
export function trackApiCall(endpoint: string, duration: number) {
  trackMetric(`API: ${endpoint}`, duration)
}

/**
 * Track component render time
 */
export function trackComponentRender(componentName: string, duration: number) {
  trackMetric(`Component: ${componentName}`, duration)
}

/**
 * Get all metrics collected
 */
export function getMetrics(): PerformanceMetric[] {
  return [...metrics]
}

/**
 * Clear all collected metrics
 */
export function clearMetrics(): void {
  metrics.length = 0
}

/**
 * Report metrics to analytics
 */
export async function reportMetrics(endpoint: string) {
  if (metrics.length === 0) return

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics }),
    })
    clearMetrics()
  } catch (error) {
    console.error('Failed to report metrics:', error)
  }
}

/**
 * Monitor Web Vitals
 */
export function monitorWebVitals() {
  // Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ('startTime' in entry) {
            trackMetric('LCP', Math.round(entry.startTime))
          }
        }
      })
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (e) {
      console.debug('LCP monitoring not supported')
    }

    // Cumulative Layout Shift
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ('value' in entry && !entry.hadRecentInput) {
            trackMetric('CLS', Math.round(entry.value * 1000) / 1000)
          }
        }
      })
      observer.observe({ entryTypes: ['layout-shift'] })
    } catch (e) {
      console.debug('CLS monitoring not supported')
    }
  }
}
