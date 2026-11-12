import { useMemo, useState } from 'react';
import { api, FRUITS } from '../api.js';
import { useFetch } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import { Empty, FilterSelect, FormError, FruitChip, PageHeader, SearchBox } from '../components/ui.jsx';

const blank = { name: 'Apples', description: '', is_active: true };

export default function Fruits() {
  const { isAdmin } = useAuth(); const toast = useToast();
  const { data: fruits, loading, error: loadError, reload } = useFetch('/fruits');
  const [q, setQ] = useState(''); const [state, setState] = useState('');
  const [edit, setEdit] = useState(null); const [form, setForm] = useState(blank); const [error, setError] = useState('');

  const rows = useMemo(() => fruits.filter((f) =>
    (f.name + ' ' + (f.description || '')).toLowerCase().includes(q.toLowerCase()) &&
    (!state || (state === 'active') === !!f.is_active)), [fruits, q, state]);

  const availableNames = FRUITS.filter((name) => !fruits.some((f) => f.name === name && f.is_active));
  const open = (f) => {
    setError(''); setEdit(f || {});
    const first = availableNames[0];
    const existing = fruits.find((fruit) => fruit.name === first);
    setForm(f ? { name: f.name, description: f.description || '', is_active: !!f.is_active }
      : { name: first || '', description: existing?.description || '', is_active: true });
  };
  const chooseName = (name) => {
    const existing = fruits.find((f) => f.name === name);
    setForm({ name, description: existing?.description || '', is_active: true });
  };
  const save = async (e) => {
    e.preventDefault();
    try {
      await api(edit.id ? `/fruits/${edit.id}` : '/fruits', { method: edit.id ? 'PUT' : 'POST', body: form });
      toast(edit.id ? 'Fruit updated' : 'Fruit added or reactivated'); setEdit(null); reload();
    } catch (err) { setError(err.message); }
  };
  const toggle = async (f) => {
    try { await api(`/fruits/${f.id}`, { method: 'PUT', body: { name: f.name, description: f.description, is_active: !f.is_active } }); toast(f.is_active ? `${f.name} deactivated` : `${f.name} activated`); reload(); }
    catch (err) { toast(err.message, 'err'); }
  };
  const remove = async (f) => {
    if (!window.confirm(`Delete ${f.name}?`)) return;
    try { await api(`/fruits/${f.id}`, { method: 'DELETE' }); toast('Fruit deleted'); reload(); } catch (err) { toast(err.message, 'err'); }
  };

  return (
    <>
      <PageHeader title="Fruits" subtitle="Batloung Fruits sells these five fruits">
        {isAdmin && <button className="btn primary" disabled={loading || !!loadError || !availableNames.length} onClick={() => open()}>Add / reactivate fruit</button>}
      </PageHeader>
      <FormError message={loadError} />
      <p className="muted">The catalogue contains the five assignment fruits. Add a missing fruit or reactivate an inactive one. When all five are active, the catalogue is complete.</p>
      <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search fruits" />
        <FilterSelect value={state} onChange={setState} label="All statuses" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></div>
      <div className="table-wrap"><table>
        <thead><tr><th>Fruit</th><th>Description</th><th>Status</th>{isAdmin && <th />}</tr></thead>
        <tbody>{rows.map((f) => (
          <tr key={f.id}><td><FruitChip name={f.name} /></td><td>{f.description}</td>
            <td><span className={`badge ${f.is_active ? 's-completed' : 's-cancelled'}`}>{f.is_active ? 'Active' : 'Inactive'}</span></td>
            {isAdmin && <td className="row-actions"><button onClick={() => open(f)}>Edit</button><button onClick={() => toggle(f)}>{f.is_active ? 'Deactivate' : 'Activate'}</button><button className="danger" onClick={() => remove(f)}>Delete</button></td>}
          </tr>))}</tbody>
      </table>{!rows.length && <Empty>No fruits match your search.</Empty>}</div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit fruit' : 'Add / reactivate fruit'}>
        <form onSubmit={save} className="form">
          <label>Fruit<select required disabled={!!edit?.id} value={form.name} onChange={(e) => chooseName(e.target.value)}>{(edit?.id ? [form.name] : availableNames).map((f) => <option key={f}>{f}</option>)}</select></label>
          <label>Description<input value={form.description} maxLength={255} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="check"><input type="checkbox" disabled={!edit?.id} checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Active (can be sold)</label>
          <FormError message={error} /><button className="btn primary">Save fruit</button>
        </form>
      </Modal>
    </>
  );
}
