import { useState } from 'react';
import { useFetch } from '../hooks.js';
import { money } from '../api.js';
import { Empty, PageHeader } from '../components/ui.jsx';

const REPORTS = [
  ['stock', 'Available stock'], ['sales-by-fruit', 'Sales by fruit'], ['sales-by-box-size', 'Sales by box size'], ['sales-by-vendor', 'Sales by street vendor'],
  ['purchases-by-province', 'Purchases by province'], ['pending-orders', 'Pending orders'], ['completed-orders', 'Completed orders'], ['sales-by-date', 'Total sales by date'],
];
const isMoney = (k) => /value|cost|amount|price/.test(k);
const label = (k) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export default function Reports() {
  const [name, setName] = useState('stock');
  const { data: rows, loading, error } = useFetch(`/reports/${name}`);
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  const numericTotals = cols.filter((c) => isMoney(c) || /^(boxes|orders|purchases)/.test(c)).filter((c) => !/price/.test(c));

  return (
    <>
      <PageHeader title="Reports" subtitle="Sales figures count completed orders only"><button className="btn" onClick={() => window.print()}>Print report</button></PageHeader>
      <div className="tabs wrap">{REPORTS.map(([k, v]) => <button key={k} className={name === k ? 'on' : ''} onClick={() => setName(k)}>{v}</button>)}</div>
      {error && <div className="form-error">{error}</div>}
      <div className="table-wrap"><table>
        <thead><tr>{cols.map((c) => <th key={c}>{label(c)}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{isMoney(c) ? money(r[c]) : r[c]}</td>)}</tr>)}</tbody>
        {rows.length > 1 && numericTotals.length > 0 && <tfoot><tr>{cols.map((c, i) => <td key={c}>{i === 0 ? 'Total' : numericTotals.includes(c) ? (isMoney(c) ? money(rows.reduce((s, r) => s + Number(r[c]), 0)) : rows.reduce((s, r) => s + Number(r[c]), 0)) : ''}</td>)}</tr></tfoot>}
      </table>{!loading && !rows.length && <Empty>Nothing to report yet for this view.</Empty>}</div>
    </>
  );
}
