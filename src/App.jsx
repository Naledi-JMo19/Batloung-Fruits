import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Fruits from './pages/Fruits.jsx';
import BoxSizes from './pages/BoxSizes.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Vendors from './pages/Vendors.jsx';
import Stock from './pages/Stock.jsx';
import Orders from './pages/Orders.jsx';
import Reports from './pages/Reports.jsx';

function Protected({ children, adminOnly }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="stock" element={<Stock />} />
        <Route path="fruits" element={<Fruits />} />
        <Route path="box-sizes" element={<BoxSizes />} />
        <Route path="suppliers" element={<Protected adminOnly><Suppliers /></Protected>} />
        <Route path="reports" element={<Protected adminOnly><Reports /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
