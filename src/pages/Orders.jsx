import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, STATUSES } from '../api.js';
import { useFetch } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import { Badge, Empty, FilterSelect, FormError, FruitChip, PageHeader, SearchBox } from '../components/ui.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const FLOW = STATUSES.slice(0, 5);
// Mirrors the server rules: one step forward, cancel any time before the end, Sales cannot complete.
const nextStatuses = (current, isAdmin) => {
  if (['Completed', 'Cancelled'].includes(current)) return [];
  return [FLOW[FLOW.indexOf(current) + 1], 'Cancelled'].filter((s) => s && (isAdmin || s !== 'Completed'));
};

export default function Orders() {
  const { isAdmin } = useAuth(); const toast = useToast();
  const { data: orders, reload } = useFetch('/orders');
  const { data: vendors } = useFetch('/vendors');
  const { data: stock, reload: reloadStock } = useFetch('/stock');
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [vendorF, setVendorF] = useState(''); const [sizeF, setSizeF] = useState('');
  const [create, setCreate] = useState(false); const [error, setError] = useState('');
  const [order, setOrder] = useState({ vendor_id: '', order_date: today() }); const [lines, setLines] = useState([{ product_id: '', quantity: 1 }]);
  const [detail, setDetail] = useState(null); const [newStatus, setNewStatus] = useState('');

  const sellable = stock.filter((s) => s.is_active);
  const sizes = [...new Set(stock.map((s) => s.size_name))];
  const productOf = (id) => sellable.find((s) => s.product_id === +id);
  const total = lines.reduce((sum, l) => sum + (productOf(l.product_id)?.selling_price || 0) * (+l.quantity || 0), 0);

  const rows = useMemo(() => orders.filter((o) =>
    `#${o.id} ${o.vendor_name} ${o.business_name || ''} ${o.fruits || ''}`.toLowerCase().includes(q.toLowerCase()) &&
    (!status || o.status === status) && (!vendorF || o.vendor_id === +vendorF) && (!sizeF || (o.box_sizes || '').split(',').includes(sizeF))), [orders, q, status, vendorF, sizeF]);

  const setLine = (i, k, v) => setLines(lines.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const submit = async (e) => {
    e.preventDefault();
    for (const l of lines) { const p = productOf(l.product_id); if (p && +l.quantity > p.quantity) return setError(`Only ${p.quantity} boxes of ${p.fruit_name} (${p.size_name}) are in stock.`); }
    try {
      await api('/orders', { method: 'POST', body: { ...order, items: lines.map((l) => ({ product_id: +l.product_id, quantity: +l.quantity })) } });
      toast('Order placed'); setCreate(false); setLines([{ product_id: '', quantity: 1 }]); reload(); reloadStock();
    } catch (err) { setError(err.message); }
  };

  const openDetail = async (o) => {
    setError('');
    try { const full = await api(`/orders/${o.id}`); setDetail(full); setNewStatus(''); }
    catch (err) { toast(err.message, 'err'); }
  };
  const changeStatus = async () => {
    try { await api(`/orders/${detail.id}`, { method: 'PUT', body: { status: newStatus } }); toast(`Order #${detail.id} is now ${newStatus}`); setDetail(null); reload(); reloadStock(); }
    catch (err) { setError(err.message); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete order #${detail.id}?`)) return;
    try { await api(`/orders/${detail.id}`, { method: 'DELETE' }); toast('Order deleted'); setDetail(null); reload(); } catch (err) { setError(err.message); }
  };

  return (
    <>
      <PageHeader title="Orders" subtitle="Orders placed by street vendors">
        <button className="btn primary" onClick={() => { setError(''); setCreate(true); }}>New order</button>
      </PageHeader>
      <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search order, vendor or fruit" />
        <FilterSelect value={status} onChange={setStatus} label="All statuses" options={STATUSES} />
        <FilterSelect value={vendorF} onChange={setVendorF} label="All vendors" options={vendors.map((v) => ({ value: v.id, label: v.vendor_name }))} />
        <FilterSelect value={sizeF} onChange={setSizeF} label="All box sizes" options={sizes} /></div>
      <div className="table-wrap"><table className="clickable">
        <thead><tr><th>Order</th><th>Vendor</th><th>Date</th><th>Fruits</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>{rows.map((o) => (<tr key={o.id} tabIndex={0} onClick={() => openDetail(o)} onKeyDown={(e) => e.key === 'Enter' && openDetail(o)}>
          <td>#{o.id}</td><td><strong>{o.vendor_name}</strong></td><td>{o.order_date}</td><td>{o.fruits}</td><td>{money(o.total_amount)}</td><td><Badge status={o.status} /></td></tr>))}</tbody>
      </table>{!rows.length && <Empty>No orders match. Create one with “New order”.</Empty>}</div>

      <Modal wide open={create} onClose={() => setCreate(false)} title="New order">
        <form onSubmit={submit} className="form">
          <div className="two"><label>Street vendor<select required value={order.vendor_id} onChange={(e) => setOrder({ ...order, vendor_id: e.target.value })}>
            <option value="">Choose vendor</option>{vendors.filter((v) => v.status === 'Active').map((v) => <option key={v.id} value={v.id}>{v.vendor_name} ({v.vendor_code})</option>)}</select></label>
            <label>Order date<input type="date" required value={order.order_date} onChange={(e) => setOrder({ ...order, order_date: e.target.value })} /></label></div>
          {!sellable.some((s) => s.quantity > 0) && (
            <div className="form-error">No fruit is in stock yet, so nothing can be ordered.{' '}
              {isAdmin ? <>Go to <Link to="/stock">Stock</Link> and use “Receive stock” first.</> : 'Ask an administrator to receive stock first.'}</div>)}
          <div className="lines">{lines.map((l, i) => { const p = productOf(l.product_id); return (
            <div className="line" key={i}>
              <select required value={l.product_id} onChange={(e) => setLine(i, 'product_id', e.target.value)} aria-label="Fruit and box size">
                <option value="">Fruit + box size</option>{sellable.map((s) => <option key={s.product_id} value={s.product_id} disabled={s.quantity === 0}>{s.fruit_name} · {s.size_name} — {money(s.selling_price)} ({s.quantity > 0 ? `${s.quantity} in stock` : 'out of stock'})</option>)}</select>
              <input type="number" min="1" step="1" max={p?.quantity || undefined} required value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} aria-label="Boxes" />
              <span className="sub">{p ? money(p.selling_price * (+l.quantity || 0)) : '—'}</span>
              {lines.length > 1 && <button type="button" className="icon-btn" onClick={() => setLines(lines.filter((_, idx) => idx !== i))} aria-label="Remove line">×</button>}
            </div>); })}</div>
          <button type="button" className="link" onClick={() => setLines([...lines, { product_id: '', quantity: 1 }])}>Add another fruit</button>
          <div className="total">Order total <strong>{money(total)}</strong></div>
          <FormError message={error} /><button className="btn primary">Place order</button>
        </form>
      </Modal>

      <Modal wide open={!!detail} onClose={() => setDetail(null)} title={detail ? `Order #${detail.id}` : ''}>
        {detail && (<div className="form">
          <div className="detail-head"><div><strong>{detail.vendor_name}</strong><br /><span className="muted">{detail.business_name} · {detail.order_date}</span></div><Badge status={detail.status} /></div>
          <div className="table-wrap"><table><thead><tr><th>Fruit</th><th>Box</th><th>Boxes</th><th>Unit price</th><th>Subtotal</th></tr></thead>
            <tbody>{detail.items.map((i) => <tr key={i.id}><td><FruitChip name={i.fruit_name} /></td><td>{i.size_name}</td><td>{i.quantity}</td><td>{money(i.unit_price)}</td><td>{money(i.subtotal)}</td></tr>)}</tbody></table></div>
          <div className="total">Total <strong>{money(detail.total_amount)}</strong></div>
          {nextStatuses(detail.status, isAdmin).length > 0 && (
            <div className="line status-line"><select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} aria-label="New status"><option value="">Change status to…</option>
              {nextStatuses(detail.status, isAdmin).map((s) => <option key={s}>{s}</option>)}</select>
              <button className="btn primary" disabled={!newStatus} onClick={changeStatus}>Update status</button></div>)}
          {!isAdmin && detail.status !== 'Completed' && detail.status !== 'Cancelled' && <p className="muted">Only an administrator can mark an order as Completed.</p>}
          <FormError message={error} />
          {isAdmin && ['Pending', 'Cancelled'].includes(detail.status) && <button className="btn danger-outline" onClick={remove}>Delete order</button>}
        </div>)}
      </Modal>
    </>
  );
}
