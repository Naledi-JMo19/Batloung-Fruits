import { useMemo, useState } from 'react';
import { api, PROVINCES } from '../api.js';
import { useFetch } from '../hooks.js';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import DirectionsMap from '../components/DirectionsMap.jsx';
import { Empty, FilterSelect, FormError, PageHeader, SearchBox } from '../components/ui.jsx';

const blank = { supplier_name: '', province: 'Gauteng', contact_person: '', telephone: '', email: '', physical_address: '' };

export default function Suppliers() {
  const toast = useToast();
  const { data: suppliers, reload } = useFetch('/suppliers');
  const [q, setQ] = useState(''); const [province, setProvince] = useState('');
  const [edit, setEdit] = useState(null); const [form, setForm] = useState(blank); const [error, setError] = useState('');
  const [view, setView] = useState(null); // supplier shown in the details + map modal

  const rows = useMemo(() => suppliers.filter((s) =>
    Object.values(s).join(' ').toLowerCase().includes(q.toLowerCase()) && (!province || s.province === province)), [suppliers, q, province]);

  const open = (s) => { setError(''); setEdit(s || {}); setForm(s ? { ...s } : blank); };
  const save = async (e) => {
    e.preventDefault();
    try { await api(edit.id ? `/suppliers/${edit.id}` : '/suppliers', { method: edit.id ? 'PUT' : 'POST', body: form }); toast(edit.id ? 'Supplier updated' : 'Supplier added'); setEdit(null); reload(); }
    catch (err) { setError(err.message); }
  };
  const remove = async (s) => {
    if (!window.confirm(`Delete ${s.supplier_name}?`)) return;
    try { await api(`/suppliers/${s.id}`, { method: 'DELETE' }); toast('Supplier deleted'); reload(); } catch (err) { toast(err.message, 'err'); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Suppliers" subtitle="Select a supplier to see its details and location on the map">
        <button className="btn primary" onClick={() => open()}>Add supplier</button>
      </PageHeader>
      <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search suppliers" />
        <FilterSelect value={province} onChange={setProvince} label="All provinces" options={PROVINCES} /></div>
      <div className="table-wrap"><table className="clickable">
        <thead><tr><th>Supplier</th><th>Province</th><th>Contact</th><th>Email</th><th /></tr></thead>
        <tbody>{rows.map((s) => (
          <tr key={s.id} tabIndex={0} onClick={() => setView(s)} onKeyDown={(e) => e.key === 'Enter' && setView(s)}>
            <td><strong>{s.supplier_name}</strong></td><td>{s.province}</td><td>{s.contact_person}<br /><span className="muted">{s.telephone}</span></td><td>{s.email}</td>
            <td className="row-actions" onClick={(e) => e.stopPropagation()}><button onClick={() => open(s)}>Edit</button><button className="danger" onClick={() => remove(s)}>Delete</button></td>
          </tr>))}</tbody>
      </table>{!rows.length && <Empty>No suppliers match. Try another search or province.</Empty>}</div>

      <Modal wide open={!!view} onClose={() => setView(null)} title={view?.supplier_name || ''}>
        {view && (
          <div className="supplier-view">
            <dl>
              <dt>Province</dt><dd>{view.province}</dd>
              <dt>Contact person</dt><dd>{view.contact_person}</dd>
              <dt>Telephone</dt><dd><a href={`tel:${view.telephone}`}>{view.telephone}</a></dd>
              <dt>Email</dt><dd><a href={`mailto:${view.email}`}>{view.email}</a></dd>
              <dt>Physical address</dt><dd>{view.physical_address}</dd>
            </dl>
            <DirectionsMap supplier={view} />
          </div>)}
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit supplier' : 'Add supplier'}>
        <form onSubmit={save} className="form">
          <label>Supplier name<input required value={form.supplier_name} onChange={set('supplier_name')} /></label>
          <label>Province<select value={form.province} onChange={set('province')}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label>Contact person<input required value={form.contact_person} onChange={set('contact_person')} /></label>
          <label>Telephone<input required pattern="[+]?[0-9 ()\-]{7,20}" title="Digits, spaces, + ( ) -  (7-20 characters)" value={form.telephone} onChange={set('telephone')} /></label>
          <label>Email<input type="email" required value={form.email} onChange={set('email')} /></label>
          <label>Physical address<input required value={form.physical_address} onChange={set('physical_address')} placeholder="Street, town, postal code" /></label>
          <FormError message={error} /><button className="btn primary">Save supplier</button>
        </form>
      </Modal>
    </>
  );
}
