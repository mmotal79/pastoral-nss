import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';

// Types
export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: 'admin' | 'seller' | 'manager';
  isActive: boolean;
}

export interface Client {
  _id?: string;
  id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  creditUSD: number;
}

export interface Product {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  priceUSD: number;
  costUSD: number;
  stock: number;
  imageUrl?: string;
  socialDescription?: string;
}

export interface Payment {
  _id?: string;
  id?: string;
  date: string;
  amountUSD: number;
  amountVED: number;
  exchangeRate: number;
  method: 'cash_usd' | 'cash_ved' | 'transfer' | 'mobile_payment';
  bankSender?: string;
  bankReceiver?: string;
  reference?: string;
  phoneSender?: string;
  changeUSD?: number;
  savedCreditUSD?: number;
}

export interface Sale {
  _id?: string;
  id?: string;
  clientId: string | Client;
  items: { productId: string; quantity: number; priceUSD: number; name: string }[];
  totalUSD: number;
  date: string;
  status: 'paid' | 'pending';
  payments: Payment[];
}

export interface Expense {
  _id?: string;
  id?: string;
  description: string;
  amountUSD: number;
  amountVED: number;
  exchangeRate: number;
  date: string;
  category: string;
}

export interface Order {
  _id?: string;
  id?: string;
  clientId: string | Client;
  itemDescription: string;
  color: string;
  design: string;
  materials: string;
  estimatedCostUSD: number;
  orderDate: string;
  deliveryDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'transferred_to_sale';
}

export interface Settings {
  companyName: string;
  logoUrl: string;
  corporatePhone?: string;
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  clients: Client[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  orders: Order[];
  settings: Settings | null;
  loading: boolean;
  authLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSeller: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  addUser: (user: Partial<User>) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  sendWelcomeEmail: (id: string) => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  addClient: (client: Partial<Client>) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  addSale: (sale: Partial<Sale>) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  addExpense: (expense: Partial<Expense>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  addOrder: (order: Partial<Order>) => Promise<void>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isSeller = currentUser?.role === 'seller';

  // Fetch settings and products immediately, even if not logged in
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [settingsRes, productsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/products')
        ]);
        if (settingsRes.ok) {
          setSettings(await settingsRes.json());
        }
        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.map((d: any) => ({ ...d, id: d._id })));
        }
      } catch (error) {
        console.error('Error fetching public data:', error);
      }
    };
    fetchPublicData();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const res = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: firebaseUser.email, name: firebaseUser.displayName })
          });
          
          if (res.ok) {
            const userData = await res.json();
            setCurrentUser(userData);
            fetchData();
          } else {
            const errorData = await res.json();
            alert(errorData.error || 'Acceso denegado');
            await signOut(auth);
            setCurrentUser(null);
          }
        } catch (error) {
          console.error('Error verifying user:', error);
          await signOut(auth);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Error logging in:', error);
      alert(`Error al iniciar sesión: ${error.message}`);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, clientsRes, salesRes, expensesRes, ordersRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/clients'),
        fetch('/api/sales'),
        fetch('/api/expenses'),
        fetch('/api/orders')
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.map((d: any) => ({ ...d, id: d._id })));
      }
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.map((d: any) => ({ ...d, id: d._id })));
      }
      if (salesRes.ok) {
        const data = await salesRes.json();
        setSales(data.map((d: any) => ({ ...d, id: d._id })));
      }
      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setExpenses(data.map((d: any) => ({ ...d, id: d._id })));
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.map((d: any) => ({ ...d, id: d._id })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        alert('Configuración guardada exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al guardar configuración: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error updating settings:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const addUser = async (user: Partial<User>) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (res.ok) {
        const newUser = await res.json();
        setUsers(prev => [{ ...newUser, id: newUser._id }, ...prev]);
        alert('Usuario guardado exitosamente.');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al guardar el usuario: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error adding user:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const updateUser = async (id: string, user: Partial<User>) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(prev => prev.map(u => u._id === id ? { ...updatedUser, id: updatedUser._id } : u));
        alert('Usuario actualizado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al actualizar el usuario: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u._id !== id));
        alert('Usuario eliminado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al eliminar el usuario: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const sendWelcomeEmail = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}/send-welcome`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        let message = 'Correo enviado exitosamente.';
        if (data.emailStatus?.simulated) {
          message += '\n(Simulación) El correo se habría enviado, pero faltan las credenciales EMAIL_USER y EMAIL_PASS en el entorno.';
        }
        alert(message);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al enviar el correo: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error sending welcome email:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const addProduct = async (product: Partial<Product>) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      if (res.ok) {
        const newProduct = await res.json();
        setProducts(prev => [{ ...newProduct, id: newProduct._id }, ...prev]);
        alert('Producto guardado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al guardar el producto: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error adding product:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const updateProduct = async (id: string, product: Partial<Product>) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      if (res.ok) {
        const updatedProduct = await res.json();
        setProducts(prev => prev.map(p => p._id === id ? { ...updatedProduct, id: updatedProduct._id } : p));
        alert('Producto actualizado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al actualizar el producto: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const addClient = async (client: Partial<Client>) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      if (res.ok) {
        const newClient = await res.json();
        setClients(prev => [{ ...newClient, id: newClient._id }, ...prev]);
        alert('Cliente guardado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al guardar el cliente: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error adding client:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const updateClient = async (id: string, client: Partial<Client>) => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      if (res.ok) {
        const updatedClient = await res.json();
        setClients(prev => prev.map(c => c._id === id ? { ...updatedClient, id: updatedClient._id } : c));
        alert('Cliente actualizado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al actualizar el cliente: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error updating client:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const addSale = async (sale: Partial<Sale>) => {
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale)
      });
      if (res.ok) {
        const newSale = await res.json();
        setSales(prev => [{ ...newSale, id: newSale._id }, ...prev]);
        // Refresh products to get updated stock
        const productsRes = await fetch('/api/products');
        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.map((d: any) => ({ ...d, id: d._id })));
        }
        alert('Venta guardada exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al guardar la venta: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error adding sale:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const updateSale = async (id: string, sale: Partial<Sale>) => {
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale)
      });
      if (res.ok) {
        const updatedSale = await res.json();
        setSales(prev => prev.map(s => s._id === id ? { ...updatedSale, id: updatedSale._id } : s));
        alert('Venta actualizada exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al actualizar la venta: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error updating sale:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const addExpense = async (expense: Partial<Expense>) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      if (res.ok) {
        const newExpense = await res.json();
        setExpenses(prev => [{ ...newExpense, id: newExpense._id }, ...prev]);
        alert('Gasto guardado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al guardar el gasto: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error adding expense:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const updateExpense = async (id: string, expense: Partial<Expense>) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      if (res.ok) {
        const updatedExpense = await res.json();
        setExpenses(prev => prev.map(e => e._id === id ? { ...updatedExpense, id: updatedExpense._id } : e));
        alert('Gasto actualizado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al actualizar el gasto: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error updating expense:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const addOrder = async (order: Partial<Order>) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      if (res.ok) {
        const newOrder = await res.json();
        setOrders(prev => [{ ...newOrder, id: newOrder._id }, ...prev]);
        alert('Encargo guardado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al guardar el encargo: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error adding order:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const updateOrder = async (id: string, order: Partial<Order>) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders(prev => prev.map(o => o._id === id ? { ...updatedOrder, id: updatedOrder._id } : o));
        alert('Encargo actualizado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al actualizar el encargo: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, users, clients, products, sales, expenses, orders, settings, loading, authLoading, isAdmin, isManager, isSeller,
      loginWithGoogle, logout, refreshData: fetchData, updateSettings, addUser, updateUser, deleteUser, sendWelcomeEmail, addProduct, updateProduct, addClient, updateClient, addSale, updateSale,
      addExpense, updateExpense, addOrder, updateOrder
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
