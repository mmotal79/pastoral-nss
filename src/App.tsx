import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Catalog from './pages/Catalog';
import Clients from './pages/Clients';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import Orders from './pages/Orders';
import Login from './pages/Login';
import Users from './pages/Users';
import Settings from './pages/Settings';
import SalesCommissions from './pages/SalesCommissions';
import { AppProvider, useAppContext } from './context/AppContext';

function ProtectedRoutes() {
  const { currentUser, authLoading } = useAppContext();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Verificando acceso...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="clients" element={<Clients />} />
        <Route path="sales" element={<Sales />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="orders" element={<Orders />} />
        {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
          <Route path="sales-commissions" element={<SalesCommissions />} />
        )}
        {currentUser.role === 'admin' && (
          <>
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
          </>
        )}
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
