'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { MapPin, Loader2 } from 'lucide-react'

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

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!

export default function AddressAutocomplete({
  defaultValue = '',
  onAddressSelect,
  placeholder = '123 Main St',
  error,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [value, setValue] = useState(defaultValue)

  function initAutocomplete() {
    if (!inputRef.current || !window.google?.maps?.places) return

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

    setReady(true)
  }

  // If Google Maps already loaded (e.g. navigating back to page), init immediately
  useEffect(() => {
    if (window.google?.maps?.places) {
      initAutocomplete()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const borderCls = error ? 'border-red-400 focus:ring-red-400' : 'border-slate-200'

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`}
        strategy="lazyOnload"
        onLoad={initAutocomplete}
      />
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full bg-slate-50 border ${borderCls} rounded-xl px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {!ready
            ? <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
            : <MapPin className="w-4 h-4 text-slate-400" />
          }
        </div>
      </div>
    </>
  )
}
