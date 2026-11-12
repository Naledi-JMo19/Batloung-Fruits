import { useMemo, useState } from 'react';
import { api, money } from '../api.js';
import { useFetch } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import { FilterSelect, FormError, FruitChip, PageHeader } from '../components/ui.jsx';

export default function BoxSizes() {
  const { isAdmin } = useAuth(); const toast = useToast();
  const { data: sizes, reload: reloadSizes } = useFetch('/box-sizes');
  const { data: products, reload: reloadProducts } = useFetch('/products');
  const [size, setSize] = useState(''); const [fruit, setFruit] = useState('');
  const [sizeEdit, setSizeEdit] = useState(null); const [prodEdit, setProdEdit] = useState(null); const [error, setError] = useState('');

  const rows = useMemo(() => products.filter((p) => (!size || p.size_name === size) && (!fruit || p.fruit_name === fruit)), [products, size, fruit]);
  const fruitNames = [...new Set(products.map((p) => p.fruit_name))];

  const saveSize = async (e) => {
    e.preventDefault();
    try { await api(`/box-sizes/${sizeEdit.id}`, { method: 'PUT', body: { description: sizeEdit.description } }); toast('Box size updated'); setSizeEdit(null); reloadSizes(); }
    catch (err) { setError(err.message); }
  };
  const saveProd = async (e) => {
    e.preventDefault();
    try { await api(`/products/${prodEdit.id}`, { method: 'PUT', body: { selling_price: prodEdit.selling_price, units_per_box: prodEdit.units_per_box } }); toast('Price updated'); setProdEdit(null); reloadProducts(); }
    catch (err) { setError(err.message); }
  };

  return (
    <>
      <PageHeader title="Box sizes & prices" subtitle="Each fruit is sold in three box sizes. Fruit + box size is one product." />
      <div className="cards-3">{sizes.map((s) => (
        <div className="panel" key={s.id}><h3>{s.size_name}</h3><p className="muted">{s.description}</p>
          {isAdmin && <button className="link" onClick={() => { setError(''); setSizeEdit({ ...s }); }}>Edit description</button>}</div>))}</div>
      <h2 className="section-title">Products and selling prices</h2>
      <div className="toolbar"><FilterSelect value={fruit} onChange={setFruit} label="All fruits" options={fruitNames} />
        <FilterSelect value={size} onChange={setSize} label="All box sizes" options={sizes.map((s) => s.size_name)} /></div>
      <div className="table-wrap"><table>
        <thead><tr><th>Fruit</th><th>Box size</th><th>Approx. units per box</th><th>Selling price</th>{isAdmin && <th />}</tr></thead>
        <tbody>{rows.map((p) => (<tr key={p.id}><td><FruitChip name={p.fruit_name} /></td><td>{p.size_name}</td><td>{p.units_per_box}</td><td>{money(p.selling_price)}</td>
          {isAdmin && <td className="row-actions"><button onClick={() => { setError(''); setProdEdit({ ...p }); }}>Edit price</button></td>}</tr>))}</tbody>
      </table></div>

      <Modal open={!!sizeEdit} onClose={() => setSizeEdit(null)} title={`Edit ${sizeEdit?.size_name} box`}>
        <form onSubmit={saveSize} className="form"><label>Description<textarea rows={4} required value={sizeEdit?.description || ''} onChange={(e) => setSizeEdit({ ...sizeEdit, description: e.target.value })} /></label>
          <FormError message={error} /><button className="btn primary">Save description</button></form>
      </Modal>
      <Modal open={!!prodEdit} onClose={() => setProdEdit(null)} title={`${prodEdit?.fruit_name} · ${prodEdit?.size_name}`}>
        <form onSubmit={saveProd} className="form">
          <label>Selling price per box (M)<input type="number" step="0.01" min="0.01" required value={prodEdit?.selling_price ?? ''} onChange={(e) => setProdEdit({ ...prodEdit, selling_price: e.target.value })} /></label>
          <label>Approx. units per box<input type="number" min="1" step="1" required value={prodEdit?.units_per_box ?? ''} onChange={(e) => setProdEdit({ ...prodEdit, units_per_box: e.target.value })} /></label>
          <FormError message={error} /><button className="btn primary">Save price</button></form>
      </Modal>
    </>
  );
}
