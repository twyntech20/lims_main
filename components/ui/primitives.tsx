import Link from 'next/link'
import { cn } from '@/lib/utils'

/* ============================================================
   FQLabs UI primitives
   Presentation only — no data access, no workflow logic. Every
   screen composes these so spacing, radius, ink and borders are
   defined in exactly one place.
   ============================================================ */

// ── Page scaffolding ────────────────────────────────────────

/**
 * The single page container. Content is centred and width-limited on
 * purpose: a screen showing three records should not stretch its table
 * across 2,000 pixels just because the pixels exist.
 *
 *   narrow   forms and single-record editing
 *   standard lists, detail pages — the default
 *   wide     dense data grids that genuinely need the columns
 *
 * Gutters follow the spacing scale: 16 / 20 / 24px.
 */
export function Page({
  children, wide = false, narrow = false,
}: {
  children: React.ReactNode
  wide?: boolean
  narrow?: boolean
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6',
        narrow ? 'max-w-[880px]' : wide ? 'max-w-[1440px]' : 'max-w-[1200px]',
      )}
    >
      {children}
    </div>
  )
}

/**
 * Page title block, shared by every admin screen so the hierarchy never
 * shifts between pages.
 *
 *   description  what the page is for — static, one short sentence
 *   meta         what is on it right now — live counts
 *   secondary    Export / Import / Refresh, visually recessive
 *   actions      the one primary action, top right
 */
export function PageHeader({
  title, description, meta, actions, secondary, breadcrumb, icon: Icon,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  secondary?: React.ReactNode
  breadcrumb?: React.ReactNode
  icon?: React.ElementType
}) {
  return (
    <header className="mb-4">
      {breadcrumb && <div className="mb-2 text-[12px] text-ink-3">{breadcrumb}</div>}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface shadow-xs">
              <Icon className="h-4 w-4 text-ink-3" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
            {(description || meta) && (
              <p className="mt-1 text-[13px] text-ink-3">
                {description}
                {description && meta && <span className="mx-1.5 text-ink-4">·</span>}
                {meta}
              </p>
            )}
          </div>
        </div>
        {(actions || secondary) && (
          <div className="flex flex-wrap items-center gap-2">
            {secondary}
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}

/** A titled section within a page. */
export function Section({
  title, description, actions, children, className,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('mb-6', className)}>
      {(title || actions) && (
        <div className="mb-2.5 flex items-end justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">{title}</h2>
            )}
            {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

/** The neutral container everything sits on. Flat by default. */
export function Panel({
  children, className, padded = false,
}: {
  children: React.ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <div className={cn('rounded-lg border border-line bg-surface shadow-xs', padded && 'p-4', className)}>
      {children}
    </div>
  )
}

// ── Buttons ─────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-55 whitespace-nowrap'

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 shadow-xs',
  secondary: 'border border-line-strong bg-surface text-ink-2 hover:bg-surface-muted hover:text-ink shadow-xs',
  ghost:     'text-ink-3 hover:bg-surface-sunken hover:text-ink',
  danger:    'border border-crit-line bg-crit-bg text-crit-fg hover:bg-crit-line/40',
}

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[12px]',
  md: 'h-8.5 px-3 text-[13px]',
}

export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string) {
  return cn(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], className)
}

/** Anchor styled as a button — for navigation, not submission. */
export function ButtonLink({
  href, variant = 'secondary', size = 'md', className, children, ...rest
}: {
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'className' | 'children'>) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  )
}

/** Compact square action for table rows — icon only, always labelled. */
export function IconButton({
  href, label, icon: Icon, tone = 'neutral', onClick, disabled, type = 'button',
}: {
  href?: string
  label: string
  icon: React.ElementType
  tone?: 'neutral' | 'crit'
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const cls = cn(
    'inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    tone === 'crit'
      ? 'text-ink-4 hover:border-crit-line hover:bg-crit-bg hover:text-crit-fg'
      : 'text-ink-4 hover:border-line hover:bg-surface-sunken hover:text-ink',
  )
  return href ? (
    <Link href={href} title={label} aria-label={label} className={cls}>
      <Icon className="h-3.5 w-3.5" />
    </Link>
  ) : (
    <button type={type} title={label} aria-label={label} onClick={onClick} disabled={disabled} className={cls}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}

// ── Badges ──────────────────────────────────────────────────

export type Tone = 'neutral' | 'info' | 'ok' | 'warn' | 'crit' | 'review' | 'brand' | 'solid'

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-2 border-line',
  info:    'bg-info-bg text-info-fg border-info-line',
  ok:      'bg-ok-bg text-ok-fg border-ok-line',
  warn:    'bg-warn-bg text-warn-fg border-warn-line',
  crit:    'bg-crit-bg text-crit-fg border-crit-line',
  review:  'bg-review-bg text-review-fg border-review-line',
  brand:   'bg-brand-50 text-brand-700 border-brand-200',
  solid:   'bg-ink text-white border-ink',
}

/**
 * Status pill. Colour is never the only signal — the label always
 * carries the meaning, and `dot` adds a non-colour shape cue.
 */
export function Badge({
  tone = 'neutral', children, dot = false, className, title,
}: {
  tone?: Tone
  children: React.ReactNode
  dot?: boolean
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
        'text-[11px] font-medium leading-4 whitespace-nowrap',
        TONE[tone], className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}

/** Monospace identifier — order numbers, sample IDs, test codes. */
export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('font-mono text-[12px] tracking-tight', className)}>{children}</span>
}

// ── Table shell ─────────────────────────────────────────────

/**
 * Scroll container for a data table. Horizontal scrolling only kicks
 * in when the viewport genuinely cannot fit the columns, and the
 * header stays pinned while the body scrolls.
 */
export function TableWrap({
  children, className, maxHeight,
}: {
  children: React.ReactNode
  className?: string
  maxHeight?: string
}) {
  return (
    <div
      className={cn('overflow-x-auto overscroll-x-contain rounded-lg border border-line bg-surface shadow-xs', className)}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      {children}
    </div>
  )
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <table className={cn('fq-sticky-head w-full border-collapse text-[13px]', className)}>{children}</table>
}

export function Th({
  children, className, align = 'left', width,
}: {
  children?: React.ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
  width?: string
}) {
  return (
    <th
      style={width ? { width } : undefined}
      className={cn(
        'border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-3',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children, className, align = 'left', colSpan,
}: {
  children?: React.ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'border-b border-line px-3 py-2 align-middle text-ink-2',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      {children}
    </td>
  )
}

/** `flag` tints the whole row — used for work that has been returned. */
export function Tr({
  children, className, flag,
}: {
  children: React.ReactNode
  className?: string
  flag?: 'crit' | 'warn'
}) {
  return (
    <tr
      className={cn(
        'fq-row-hover transition-colors',
        flag === 'crit' && 'bg-crit-bg/45',
        flag === 'warn' && 'bg-warn-bg/45',
        className,
      )}
    >
      {children}
    </tr>
  )
}

// ── Empty state ─────────────────────────────────────────────

export function EmptyState({
  icon: Icon, title, description, action, compact = false,
}: {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-6 py-10' : 'px-6 py-16')}>
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-muted">
          <Icon className="h-5 w-5 text-ink-4" />
        </div>
      )}
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-ink-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Filter toolbar ──────────────────────────────────────────

/** One row of controls above a table. Wraps rather than overflows. */
export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 shadow-xs',
        className,
      )}
    >
      {children}
    </div>
  )
}

export const FIELD =
  'h-8 rounded-md border border-line-strong bg-surface px-2.5 text-[13px] text-ink ' +
  'transition-colors hover:border-ink-4 focus:border-brand-600 focus:outline-none'

export function Select({
  name, defaultValue, children, className, 'aria-label': ariaLabel,
}: {
  name: string
  defaultValue?: string
  children: React.ReactNode
  className?: string
  'aria-label'?: string
}) {
  return (
    <select name={name} defaultValue={defaultValue} aria-label={ariaLabel} className={cn(FIELD, 'pr-7', className)}>
      {children}
    </select>
  )
}

export function SearchField({
  name = 'q', defaultValue, placeholder = 'Search…', className,
}: {
  name?: string
  defaultValue?: string
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type="search"
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={cn(FIELD, 'min-w-[200px] flex-1 sm:max-w-xs', className)}
    />
  )
}

// ── Tab strip (links, so filtering stays server-side) ───────

export function Tabs({
  items, className,
}: {
  items: { key: string; label: string; href: string; count?: number; active: boolean; tone?: Tone }[]
  className?: string
}) {
  return (
    <nav className={cn('-mb-px flex flex-wrap items-center gap-x-1 border-b border-line', className)}>
      {items.map(t => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.active ? 'page' : undefined}
          className={cn(
            'group inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-[13px] font-medium transition-colors',
            t.active
              ? 'border-brand-600 text-ink'
              : 'border-transparent text-ink-3 hover:border-line-strong hover:text-ink',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={cn(
                'rounded px-1.5 py-px text-[11px] tabular',
                t.active ? 'bg-brand-50 text-brand-700' : 'bg-surface-sunken text-ink-3',
              )}
            >
              {t.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}

// ── Filter bar ──────────────────────────────────────────────

/**
 * The one filter row used by every list page: a GET form wrapping the
 * shared Toolbar, with Apply, Clear and a live result count supplied
 * once instead of re-implemented per screen. Filtering stays
 * server-side — no client JavaScript is involved.
 */
export function FilterBar({
  children, action, hidden, clearHref, active = false, count, unit = 'shown', applyLabel = 'Apply',
}: {
  children: React.ReactNode
  /** Form target; defaults to the current page. */
  action?: string
  /** Params to carry through the submit (e.g. the active tab). */
  hidden?: Record<string, string | undefined>
  /** Where "Clear" points once filters are set. */
  clearHref?: string
  active?: boolean
  count?: number
  unit?: string
  applyLabel?: string
}) {
  return (
    <form action={action}>
      {Object.entries(hidden ?? {}).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <Toolbar>
        {children}
        <button type="submit" className={buttonClass('secondary', 'sm')}>
          <FilterIcon /> {applyLabel}
        </button>
        {active && clearHref && (
          <Link
            href={clearHref}
            className="px-1.5 text-[12px] text-ink-3 underline-offset-2 transition-colors hover:text-ink hover:underline"
          >
            Clear
          </Link>
        )}
        {count !== undefined && (
          <span className="ml-auto shrink-0 text-[12px] tabular text-ink-3">
            {count} {unit}
          </span>
        )}
      </Toolbar>
    </form>
  )
}

/** Inline funnel glyph — avoids a lucide import inside the primitives module. */
function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

// ── Pagination ──────────────────────────────────────────────

export function Pagination({
  page, totalPages, hrefFor, total, unit = 'records',
}: {
  page: number
  totalPages: number
  hrefFor: (page: number) => string
  total: number
  unit?: string
}) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 shadow-xs">
      <p className="text-[12px] tabular text-ink-3">
        Page {page} of {totalPages} · {total.toLocaleString()} {unit}
      </p>
      <div className="flex items-center gap-1.5">
        {page > 1
          ? <Link href={hrefFor(page - 1)} className={buttonClass('secondary', 'sm')}>Previous</Link>
          : <span className={cn(buttonClass('secondary', 'sm'), 'pointer-events-none opacity-45')}>Previous</span>}
        {page < totalPages
          ? <Link href={hrefFor(page + 1)} className={buttonClass('secondary', 'sm')}>Next</Link>
          : <span className={cn(buttonClass('secondary', 'sm'), 'pointer-events-none opacity-45')}>Next</span>}
      </div>
    </div>
  )
}

// ── Card grid ───────────────────────────────────────────────

/**
 * Responsive card grid. List pages fall back to cards when they hold
 * only a handful of records — a three-row table stranded at the top of
 * a tall screen reads as a broken page, where cards do not.
 */
export function CardGrid({
  children, columns = 3, className,
}: {
  children: React.ReactNode
  columns?: 2 | 3
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-3',
        columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Threshold at which a list is shown as cards rather than a table. */
export const CARD_VIEW_MAX = 3

// ── Table helpers ───────────────────────────────────────────

/** Empty row inside an existing table, so the header stays in place. */
export function TableEmpty({
  colSpan, title, description, action,
}: {
  colSpan: number
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center">
        <p className="text-[13px] font-medium text-ink">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-ink-3">{description}</p>}
        {action && <div className="mt-3 flex justify-center">{action}</div>}
      </td>
    </tr>
  )
}

/** Two-line table cell: a primary value with muted supporting text. */
export function Stacked({
  primary, secondary, className,
}: {
  primary: React.ReactNode
  secondary?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="truncate text-[13px] text-ink">{primary}</div>
      {secondary && <div className="truncate text-[11.5px] text-ink-3">{secondary}</div>}
    </div>
  )
}
