'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FIELD } from '@/components/ui/primitives'

export interface AddressFields {
  address: string
  city: string
  state: string
  zip: string
}

interface Props {
  defaultValue?: string
  onAddressSelect: (fields: AddressFields) => void
  placeholder?: string
  error?: string
}

/**
 * Google Places lookup is an optional convenience, not a dependency.
 * The key is inlined at build time; when it is absent the script is
 * never requested — loading it with `key=undefined` is what produced
 * InvalidKeyMapError in the console and left the field spinning
 * forever. Without a key (or when the script fails to load) this
 * degrades to a plain address input that still submits correctly.
 */
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

/** Lets a form tell the user whether suggestions are actually available. */
export const ADDRESS_AUTOCOMPLETE_ENABLED = Boolean(API_KEY)

type Status = 'unavailable' | 'loading' | 'ready' | 'failed'

export default function AddressAutocomplete({
  defaultValue = '',
  onAddressSelect,
  placeholder = '123 Main St',
  error,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>(API_KEY ? 'loading' : 'unavailable')
  const [value, setValue] = useState(defaultValue)

  function initAutocomplete() {
    if (!inputRef.current || !window.google?.maps?.places) {
      // The script resolved but the Places library is missing — treat it
      // as unavailable rather than leaving a permanent spinner.
      setStatus('failed')
      return
    }

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'us' },
      fields: ['address_components'],
      types: ['address'],
    })

    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place.address_components) return

      const get = (type: string) =>
        place.address_components!.find((c: any) => c.types.includes(type))

      const streetNumber = get('street_number')?.long_name ?? ''
      const route        = get('route')?.long_name ?? ''
      const city         = get('locality')?.long_name
                        ?? get('sublocality_level_1')?.long_name
                        ?? get('administrative_area_level_3')?.long_name
                        ?? ''
      const state = get('administrative_area_level_1')?.short_name ?? ''
      const zip   = get('postal_code')?.long_name ?? ''
      const addr  = [streetNumber, route].filter(Boolean).join(' ')

      setValue(addr)
      onAddressSelect({ address: addr, city, state, zip })
    })

    setStatus('ready')
  }

  // If Google Maps already loaded (e.g. navigating back to page), init immediately
  useEffect(() => {
    if (!API_KEY) return
    if (window.google?.maps?.places) initAutocomplete()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {API_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`}
          strategy="lazyOnload"
          onLoad={initAutocomplete}
          onError={() => setStatus('failed')}
        />
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          className={cn(
            FIELD,
            'w-full',
            status === 'loading' || status === 'ready' ? 'pr-9' : 'pr-2.5',
            error && 'border-crit-line focus:border-crit-fg',
          )}
        />
        {(status === 'loading' || status === 'ready') && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {status === 'loading'
              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-4" />
              : <MapPin className="h-3.5 w-3.5 text-ink-4" />}
          </div>
        )}
      </div>
    </>
  )
}
