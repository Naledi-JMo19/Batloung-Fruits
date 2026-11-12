const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event('auth:logout'));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const money = (n) => `M${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const FRUIT_COLORS = { Apples: '#B83A3A', Bananas: '#E3C93B', Oranges: '#E5791C', Mangoes: '#7BA83A', Grapes: '#6A2C5F' };
export const PROVINCES = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'];
export const FRUITS = ['Apples', 'Bananas', 'Oranges', 'Mangoes', 'Grapes'];
export const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready for Collection/Delivery', 'Completed', 'Cancelled'];
