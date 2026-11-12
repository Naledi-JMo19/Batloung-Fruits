import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/orders', label: 'Orders' },
  { to: '/vendors', label: 'Street vendors' },
  { to: '/stock', label: 'Stock' },
  { to: '/fruits', label: 'Fruits' },
  { to: '/box-sizes', label: 'Box sizes & prices' },
  { to: '/suppliers', label: 'Suppliers', admin: true },
  { to: '/reports', label: 'Reports', admin: true },
];

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="crate" aria-hidden="true" />Batloung<br />Fruits</div>
        <nav>{LINKS.filter((l) => !l.admin || isAdmin).map((l) => <NavLink key={l.to} to={l.to} end={l.end}>{l.label}</NavLink>)}</nav>
        <div className="who"><strong>{user.username}</strong><span>{user.role}</span><button onClick={logout}>Log out</button></div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
