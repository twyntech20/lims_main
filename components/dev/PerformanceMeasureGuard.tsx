import { PERFORMANCE_MEASURE_GUARD_SOURCE } from '@/lib/dev/performance-measure-guard'

/**
 * Installs the performance.measure guard before hydration.
 * Renders nothing in production, where the instrumentation it protects
 * against does not exist.
 */
export default function PerformanceMeasureGuard() {
  if (process.env.NODE_ENV === 'production') return null
  return (
    <script
      id="fqlabs-performance-measure-guard"
      dangerouslySetInnerHTML={{ __html: PERFORMANCE_MEASURE_GUARD_SOURCE }}
    />
  )
}
