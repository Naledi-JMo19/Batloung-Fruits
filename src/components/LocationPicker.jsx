import { useEffect, useRef, useState } from 'react';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MASERU = { lat: -29.3167, lng: 27.4833 };

// Loads the Google Maps JavaScript API once, on demand (no extra npm package needed).
let loader;
function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&v=weekly`;
      s.async = true;
      s.onload = () => resolve(window.google.maps);
      s.onerror = () => { loader = null; reject(new Error('load failed')); };
      document.head.appendChild(s);
    });
  }
  return loader;
}

// Click the map (or drag the pin) to choose where the vendor trades. onChange({latitude, longitude}).
export default function LocationPicker({ value, onChange, areaHint }) {
  const box = useRef(null);
  const api = useRef(null);
  const onChangeRef = useRef(onChange);
  const [status, setStatus] = useState(KEY ? 'loading' : 'nokey');
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState('');
  const has = value?.latitude != null && value?.longitude != null;

  useEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    if (!KEY) return undefined;
    let cancelled = false;
    window.gm_authFailure = () => setStatus('badkey'); // Google calls this if the key is rejected
    loadGoogleMaps().then((maps) => {
      if (cancelled || !box.current) return;
      const start = has ? { lat: +value.latitude, lng: +value.longitude } : MASERU;
      const map = new maps.Map(box.current, { center: start, zoom: has ? 16 : 13, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
      const marker = new maps.Marker({ map, position: start, draggable: true, visible: has });
      const set = (latLng) => {
        marker.setPosition(latLng); marker.setVisible(true);
        onChangeRef.current({ latitude: +latLng.lat().toFixed(7), longitude: +latLng.lng().toFixed(7) });
      };
      map.addListener('click', (e) => set(e.latLng));
      marker.addListener('dragend', (e) => set(e.latLng));
      api.current = { maps, map, marker, set };
      setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = () => {
    const g = api.current;
    if (!g || !query.trim()) return;
    new g.maps.Geocoder().geocode({ address: `${query}, Maseru, Lesotho` }, (res, st) => {
      if (st === 'OK' && res[0]) { setMsg(''); g.map.setCenter(res[0].geometry.location); g.map.setZoom(16); g.set(res[0].geometry.location); }
      else setMsg('Place not found. (Search also needs the Geocoding API enabled for your key; you can still click the map.)');
    });
  };
  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { const ll = new api.current.maps.LatLng(pos.coords.latitude, pos.coords.longitude); api.current.map.setCenter(ll); api.current.map.setZoom(17); api.current.set(ll); },
      () => setMsg('Could not get your location. Allow location access, or click the map instead.'),
    );
  };
  const clear = () => { api.current?.marker.setVisible(false); onChange({ latitude: null, longitude: null }); };

  if (status === 'nokey') {
    const q = encodeURIComponent(`${areaHint || 'Maseru'}, Maseru, Lesotho`);
    return (
      <div className="picker">
        <p className="picker-note">Add a Google Maps API key to choose the exact spot by clicking the map (see README). Preview of the typed area:</p>
        <iframe title="Area preview" className="map small" loading="lazy" src={`https://www.google.com/maps?q=${q}&output=embed`} />
      </div>
    );
  }
  return (
    <div className="picker">
      {status === 'ready' && (
        <div className="picker-bar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} placeholder="Search an area, e.g. Ha Thamae" aria-label="Search location" />
          <button type="button" className="btn" onClick={search}>Search</button>
          <button type="button" className="btn" onClick={useMyLocation}>My location</button>
        </div>)}
      {status === 'loading' && <p className="muted">Loading map…</p>}
      {(status === 'error' || status === 'badkey') && <div className="form-error">The map could not load. {status === 'badkey' ? 'Google rejected the API key: check it and that “Maps JavaScript API” is enabled.' : 'Check your internet connection.'}</div>}
      <div ref={box} className={`map small ${status === 'ready' ? '' : 'hidden'}`} />
      {status === 'ready' && (
        <p className="picker-note">{has ? <>Selected: {Number(value.latitude).toFixed(5)}, {Number(value.longitude).toFixed(5)} · drag the pin to adjust · <button type="button" className="link" onClick={clear}>Clear</button></> : 'Click the map to place the vendor’s pin.'}</p>)}
      {msg && <p className="picker-note warn">{msg}</p>}
    </div>
  );
}
