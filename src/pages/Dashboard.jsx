import { useFetch } from '../hooks.js';
import { FRUIT_COLORS, money } from '../api.js';
import { BarChart, PageHeader } from '../components/ui.jsx';

export default function Dashboard() {
  const { data: d, loading, error } = useFetch('/dashboard', null);
  if (error) return <div className="form-error">{error}</div>;
  if (loading || !d) return <p className="muted">Loading dashboard…</p>;

  const tiles = [
    ['Total fruits', d.totalFruits], ['Total suppliers', d.totalSuppliers], ['Registered vendors', d.totalVendors],
    ['Available stock', `${d.availableStock} boxes`], ['Total orders', d.totalOrders], ['Pending orders', d.pendingOrders], ['Completed orders', d.completedOrders],
  ];
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Where the business stands today" />
      <section className="hero-stat">
        <span>Sales value (completed orders)</span>
        <strong>{money(d.salesValue)}</strong>
      </section>
      <section className="tiles">{tiles.map(([k, v]) => <div className="tile" key={k}><span>{k}</span><strong>{v}</strong></div>)}</section>
      <section className="grid-2">
        <div className="panel"><h3>Sales by fruit</h3>
          <BarChart format={money} data={d.salesByFruit.map((r) => ({ label: r.fruit, value: r.sales_value, color: FRUIT_COLORS[r.fruit] }))} /></div>
        <div className="panel"><h3>Boxes in stock by fruit</h3>
          <BarChart data={d.stockByFruit.map((r) => ({ label: r.fruit, value: r.boxes, color: FRUIT_COLORS[r.fruit] }))} /></div>
        <div className="panel"><h3>Orders by status</h3>
          {d.ordersByStatus.length ? <BarChart data={d.ordersByStatus.map((r) => ({ label: r.status, value: r.count, color: '#2E6B3E' }))} /> : <p className="muted">No orders yet.</p>}</div>
      </section>
    </>
  );
}
