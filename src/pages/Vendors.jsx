import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useFetch } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import { Empty, FilterSelect, FormError, PageHeader, SearchBox } from '../components/ui.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ vendor_code: '', vendor_name: '', business_name: '', telephone: '', location_area: '', latitude: null, longitude: null, registration_date: today(), status: 'Active' });

export default function Vendors() {
  const { isAdmin } = useAuth(); const toast = useToast();
  const { data: vendors, reload } = useFetch('/vendors');
  const [q, setQ] = useState(''); const [status, setStatus] = useState('');
  const [view, setView] = useState(null); const [edit, setEdit] = useState(null); const [form, setForm] = useState(blank()); const [error, setError] = useState('');

  const rows = useMemo(() => vendors.filter((v) => Object.values(v).join(' ').toLowerCase().includes(q.toLowerCase()) && (!status || v.status === status)), [vendors, q, status]);
  const open = (v) => { setError(''); setEdit(v || {}); setForm(v ? { ...v, business_name: v.business_name || '' } : blank()); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try { await api(edit.id ? `/vendors/${edit.id}` : '/vendors', { method: edit.id ? 'PUT' : 'POST', body: form }); toast(edit.id ? 'Vendor updated' : 'Vendor registered'); setEdit(null); reload(); }
    catch (err) { setError(err.message); }
  };
  const remove = async (v) => {
    if (!window.confirm(`Delete ${v.vendor_name}?`)) return;
    try { await api(`/vendors/${v.id}`, { method: 'DELETE' }); toast('Vendor deleted'); reload(); } catch (err) { toast(err.message, 'err'); }
  };

  return (
    <>
      <PageHeader title="Street vendors" subtitle="Vendors who buy boxes of fruit in Maseru">
        <button className="btn primary" onClick={() => open()}>Register vendor</button>
      </PageHeader>
      <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search vendors" />
        <FilterSelect value={status} onChange={setStatus} label="All statuses" options={['Active', 'Inactive']} /></div>
      <div className="table-wrap"><table>
        <thead><tr><th>Vendor ID</th><th>Name</th><th>Business</th><th>Telephone</th><th>Area / map</th><th>Registered</th><th>Status</th>{isAdmin && <th />}</tr></thead>
        <tbody>{rows.map((v) => (<tr key={v.id}><td>{v.vendor_code}</td><td><strong>{v.vendor_name}</strong></td><td>{v.business_name}</td><td>{v.telephone}</td><td>{v.location_area} <button className="link" onClick={() => setView(v)}>View map</button></td><td>{v.registration_date}</td>
          <td><span className={`badge ${v.status === 'Active' ? 's-completed' : 's-cancelled'}`}>{v.status}</span></td>
          {isAdmin && <td className="row-actions"><button onClick={() => open(v)}>Edit</button><button className="danger" onClick={() => remove(v)}>Delete</button></td>}</tr>))}</tbody>
      </table>{!rows.length && <Empty>No vendors match your search.</Empty>}</div>

      <Modal wide open={!!view} onClose={() => setView(null)} title={view ? `${view.vendor_name} · ${view.location_area}` : ''}>
        {view && (() => {
          const q = view.latitude != null ? `${view.latitude},${view.longitude}` : encodeURIComponent(`${view.location_area}, Maseru, Lesotho`);
          return (<div className="supplier-view">
            {view.latitude == null && <p className="muted">No exact pin saved for this vendor, so the map shows the area name. Edit the vendor to choose a spot.</p>}
            <iframe title={`Map of ${view.vendor_name}`} className="map" loading="lazy" src={`https://www.google.com/maps?q=${q}&output=embed`} />
            <a className="btn" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${q}`}>Open in Google Maps</a>
          </div>);
        })()}
      </Modal>
      <Modal wide open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit vendor' : 'Register vendor'}>
        <form onSubmit={save} className="form">
          <label>Vendor ID<input required pattern="[A-Za-z0-9\-]{3,20}" title="3-20 letters or digits, e.g. VND004" value={form.vendor_code} onChange={set('vendor_code')} placeholder="VND004" /></label>
          <label>Vendor name<input required value={form.vendor_name} onChange={set('vendor_name')} /></label>
          <label>Business name<input value={form.business_name} onChange={set('business_name')} /></label>
          <label>Telephone<input required pattern="[+]?[0-9 ()\-]{7,20}" title="Digits, spaces, + ( ) -" value={form.telephone} onChange={set('telephone')} /></label>
          <label>Location / area in Maseru<input required value={form.location_area} onChange={set('location_area')} /></label>
          <div className="field-group"><span className="field-label">Vendor location on the map</span>
            <LocationPicker value={form} areaHint={form.location_area} onChange={(c) => setForm((f) => ({ ...f, ...c }))} /></div>
          <label>Registration date<input type="date" required value={form.registration_date} onChange={set('registration_date')} /></label>
          {edit?.id && <label>Status<select value={form.status} onChange={set('status')}><option>Active</option><option>Inactive</option></select></label>}
          <FormError message={error} /><button className="btn primary">Save vendor</button>
        </form>
      </Modal>
    </>
  );
}
