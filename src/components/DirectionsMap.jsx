import { useState } from 'react';

// Where Batloung Fruits is based. Change it in .env (VITE_ORIGIN_ADDRESS) to the real street address for a more exact route.
const ORIGIN = import.meta.env.VITE_ORIGIN_ADDRESS || 'Maseru, Lesotho';

export default function DirectionsMap({ supplier }) {
  const [mode, setMode] = useState('route'); // 'route' = from us to supplier, 'place' = supplier only
  const destination = `${supplier.physical_address}, ${supplier.province}, South Africa`;
  const dest = encodeURIComponent(destination);
  const from = encodeURIComponent(ORIGIN);

  const embed = mode === 'route'
    ? `https://www.google.com/maps?saddr=${from}&daddr=${dest}&output=embed`
    : `https://www.google.com/maps?q=${dest}&output=embed`;
  const openLink = (origin) => `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ''}&destination=${dest}&travelmode=driving`;

  return (
    <div className="route">
      <div className="tabs">
        <button type="button" className={mode === 'route' ? 'on' : ''} onClick={() => setMode('route')}>Route from us</button>
        <button type="button" className={mode === 'place' ? 'on' : ''} onClick={() => setMode('place')}>Supplier location</button>
      </div>
      {mode === 'route' && <p className="route-info"><b>From:</b> {ORIGIN}<br /><b>To:</b> {destination}</p>}
      <iframe key={mode} title={`Map for ${supplier.supplier_name}`} className="map" loading="lazy"
        referrerPolicy="no-referrer-when-downgrade" src={embed} />
      <div className="route-actions">
        <a className="btn primary" target="_blank" rel="noreferrer" href={openLink(from)}>Open route in Google Maps</a>
        <a className="btn" target="_blank" rel="noreferrer" href={openLink('')}>Directions from my location</a>
      </div>
    </div>
  );
}
