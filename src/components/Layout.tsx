import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Users, ShoppingCart, Receipt, ClipboardList, Menu, Store, ShieldAlert, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, logout, settings } = useAppContext();

  const companyName = settings?.companyName || 'Pastoral de Pequeñas Comunidades NSS';

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/inventory', icon: Package, label: 'Inventario' },
    { to: '/catalog', icon: Store, label: 'Catálogo' },
    { to: '/clients', icon: Users, label: 'Clientes' },
    { to: '/sales', icon: ShoppingCart, label: 'Ventas y Cobros' },
    { to: '/expenses', icon: Receipt, label: 'Gastos' },
    { to: '/orders', icon: ClipboardList, label: 'Encargos' },
  ];

  if (currentUser?.role === 'admin') {
    navItems.push({ to: '/users', icon: ShieldAlert, label: 'Usuarios' });
    navItems.push({ to: '/settings', icon: SettingsIcon, label: 'Configuración' });
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-center h-16 border-b border-gray-200 px-4 flex-shrink-0 space-x-2">
          {settings?.logoUrl && (
            <img src={settings.logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
          )}
          <h1 className="text-lg font-bold text-indigo-600 text-center leading-tight line-clamp-2">{companyName}</h1>
        </div>
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="mb-4 px-4">
            <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.name}</p>
            <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
            <p className="text-xs text-indigo-600 font-semibold uppercase mt-1">{currentUser?.role}</p>
          </div>
          <button 
            onClick={logout}
            className="flex w-full items-center px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-500 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2 truncate">
            {settings?.logoUrl && (
              <img src={settings.logoUrl} alt="Logo" className="h-6 w-6 object-contain" />
            )}
            <span className="text-sm font-semibold text-gray-900 truncate">{companyName}</span>
          </div>
          <div className="w-6" /> {/* Spacer */}
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
