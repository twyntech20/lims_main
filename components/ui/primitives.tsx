import Link from 'next/link'
import { cn } from '@/lib/utils'

/* ============================================================
   FQLabs UI primitives
   Presentation only — no data access, no workflow logic. Every
   screen composes these so spacing, radius, ink and borders are
   defined in exactly one place.
   ============================================================ */

// ── Page scaffolding ────────────────────────────────────────

/** Standard page gutter and max width. */
export function Page({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('mx-auto w-full px-4 py-5 sm:px-6 lg:px-8', wide ? 'max-w-[1600px]' : 'max-w-7xl')}>
      {children}
    </div>
  )
}

/**
 * Page title block. `meta` carries the operational one-liner
 * ("18 items requiring attention"), `actions` the contextual buttons.
 */
export function PageHeader({
  title, meta, actions, breadcrumb,
}: {
  title: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
}) {
  return (
    <header className="mb-5">
      {breadcrumb && <div className="mb-2 text-xs text-ink-3">{breadcrumb}</div>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-ink">{title}</h1>
          {meta && <p className="mt-1 text-[13px] text-ink-3">{meta}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
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
