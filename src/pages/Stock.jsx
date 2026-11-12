import { useMemo, useState } from 'react';
import { api, money } from '../api.js';
import { useFetch } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import DirectionsMap from '../components/DirectionsMap.jsx';
import { Empty, FilterSelect, FormError, FruitChip, PageHeader, SearchBox } from '../components/ui.jsx';

const today = () => new Date().toISOString().slice(0, 10);

export default function Stock() {
  const { isAdmin } = useAuth(); const toast = useToast();
  const { data: stock, reload } = useFetch('/stock');
  const { data: suppliers } = useFetch(isAdmin ? '/suppliers' : null);
  const { data: history, reload: reloadHistory } = useFetch(isAdmin ? '/stock/purchases' : null);
  const [tab, setTab] = useState('levels');
  const [q, setQ] = useState(''); const [fruit, setFruit] = useState(''); const [size, setSize] = useState('');
  const [route, setRoute] = useState(null); const [receive, setReceive] = useState(false); const [adjust, setAdjust] = useState(null); const [error, setError] = useState('');
  const [form, setForm] = useState({ supplier_id: '', fruit_id: '', box_size_id: '', quantity_boxes: '', unit_cost: '', purchase_date: today() });

  const rows = useMemo(() => stock.filter((s) => s.fruit_name.toLowerCase().includes(q.toLowerCase()) && (!fruit || s.fruit_name === fruit) && (!size || s.size_name === size)), [stock, q, fruit, size]);
  const fruits = [...new Map(stock.map((s) => [s.fruit_id, s])).values()].filter((s) => s.is_active);
  const sizes = [...new Map(stock.map((s) => [s.box_size_id, s])).values()];
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submitReceive = async (e) => {
    e.preventDefault();
    const product = stock.find((s) => s.fruit_id === +form.fruit_id && s.box_size_id === +form.box_size_id);
    try {
      await api('/stock', { method: 'POST', body: { ...form, product_id: product?.product_id } });
      toast('Stock received'); setReceive(false); reload(); reloadHistory();
    } catch (err) { setError(err.message); }
  };
  const submitAdjust = async (e) => {
    e.preventDefault();
    try { await api(`/stock/${adjust.id}`, { method: 'PUT', body: { quantity: adjust.quantity } }); toast('Stock level updated'); setAdjust(null); reload(); }
    catch (err) { setError(err.message); }
  };

  return (
    <>
      <PageHeader title="Stock" subtitle="Boxes available to sell, per fruit and box size">
        {isAdmin && <button className="btn primary" onClick={() => { setError(''); setReceive(true); }}>Receive stock</button>}
      </PageHeader>
      {isAdmin && <div className="tabs"><button className={tab === 'levels' ? 'on' : ''} onClick={() => setTab('levels')}>Stock levels</button><button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>Purchase history</button></div>}

      {tab === 'levels' && (<>
        <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search fruit" />
          <FilterSelect value={fruit} onChange={setFruit} label="All fruits" options={fruits.map((f) => f.fruit_name)} />
          <FilterSelect value={size} onChange={setSize} label="All box sizes" options={sizes.map((s) => s.size_name)} /></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Fruit</th><th>Box size</th><th>Price per box</th><th>Boxes available</th>{isAdmin && <th />}</tr></thead>
          <tbody>{rows.map((s) => (<tr key={s.id}><td><FruitChip name={s.fruit_name} /></td><td>{s.size_name}</td><td>{money(s.selling_price)}</td>
            <td><strong className={s.quantity === 0 ? 'zero' : ''}>{s.quantity}</strong></td>
            {isAdmin && <td className="row-actions"><button onClick={() => { setError(''); setAdjust({ ...s }); }}>Adjust</button></td>}</tr>))}</tbody>
        </table>{!rows.length && <Empty>No stock rows match.</Empty>}</div></>)}

      {tab === 'history' && (
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Supplier</th><th>Province</th><th>Fruit</th><th>Box</th><th>Boxes</th><th>Cost per box</th><th>Total</th></tr></thead>
          <tbody>{history.map((p) => (<tr key={p.id}><td>{p.purchase_date}</td><td>{p.supplier_name}</td><td>{p.province}</td><td><FruitChip name={p.fruit_name} /></td><td>{p.size_name}</td><td>{p.quantity_boxes}</td><td>{money(p.unit_cost)}</td><td>{money(p.total_cost)}</td></tr>))}</tbody>
        </table>{!history.length && <Empty>No purchases recorded yet. Use “Receive stock” when a delivery arrives.</Empty>}</div>)}

      <Modal open={receive} onClose={() => setReceive(false)} title="Receive stock from a supplier">
        <form onSubmit={submitReceive} className="form">
          <label>Supplier<select required value={form.supplier_id} onChange={set('supplier_id')}><option value="">Choose supplier</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplier_name} — {s.province}</option>)}</select></label>
          {form.supplier_id && <button type="button" className="link" onClick={() => setRoute(suppliers.find((s) => s.id === +form.supplier_id))}>View location and route to this supplier</button>}
          <label>Fruit<select required value={form.fruit_id} onChange={set('fruit_id')}><option value="">Choose fruit</option>{fruits.map((f) => <option key={f.fruit_id} value={f.fruit_id}>{f.fruit_name}</option>)}</select></label>
          <label>Box size<select required value={form.box_size_id} onChange={set('box_size_id')}><option value="">Choose box size</option>{sizes.map((s) => <option key={s.box_size_id} value={s.box_size_id}>{s.size_name}</option>)}</select></label>
          <label>Boxes received<input type="number" min="1" step="1" required value={form.quantity_boxes} onChange={set('quantity_boxes')} /></label>
          <label>Cost per box (M)<input type="number" min="0.01" step="0.01" required value={form.unit_cost} onChange={set('unit_cost')} /></label>
          <label>Purchase date<input type="date" required value={form.purchase_date} onChange={set('purchase_date')} /></label>
          <FormError message={error} /><button className="btn primary">Add to stock</button>
        </form>
      </Modal>
      <Modal wide open={!!route} onClose={() => setRoute(null)} title={route ? `Route to ${route.supplier_name}` : ''}>
        {route && <DirectionsMap supplier={route} />}
      </Modal>
      <Modal open={!!adjust} onClose={() => setAdjust(null)} title={`Adjust ${adjust?.fruit_name} · ${adjust?.size_name}`}>
        <form onSubmit={submitAdjust} className="form">
          <label>Boxes available<input type="number" min="0" step="1" required value={adjust?.quantity ?? ''} onChange={(e) => setAdjust({ ...adjust, quantity: e.target.value })} /></label>
          <FormError message={error} /><button className="btn primary">Save stock level</button>
        </form>
      </Modal>
    </>
  );
}
