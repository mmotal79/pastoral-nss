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
  commissionPercentage?: number;
  periodicSalary?: number;
  salaryFrequency?: 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'anual';
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
  status?: 'activo' | 'anulado';
}

export interface Sale {
  _id?: string;
  id?: string;
  clientId: string | Client;
  items: { productId: string; quantity: number; priceUSD: number; name: string }[];
  totalUSD: number;
  date: string;
  status: 'paid' | 'pending' | 'partial' | 'anulado';
  sellerId?: string;
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
  items: { productId: string; quantity: number; priceUSD: number; name: string }[];
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

export interface Commission {
  _id?: string;
  id?: string;
  sellerId: string;
  saleId: string;
  amount: number;
  status: 'pendiente' | 'pagada' | 'por verificar' | 'anulada';
  month: number;
  year: number;
  createdAt?: string;
}

export interface ExchangeRate {
  promedio: number;
  fechaActualizacion: string;
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  clients: Client[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  orders: Order[];
  commissions: Commission[];
  settings: Settings | null;
  exchangeRate: ExchangeRate | null;
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
  deleteClient: (id: string) => Promise<void>;
  addSale: (sale: Partial<Sale>) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addExpense: (expense: Partial<Expense>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addOrder: (order: Partial<Order>) => Promise<void>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  addCommission: (commission: Partial<Commission>) => Promise<void>;
  updateCommission: (id: string, commission: Partial<Commission>) => Promise<void>;
  addCommissionPayment: (id: string, payment: any) => Promise<void>;
  deleteCommissionPayment: (id: string, paymentId: string) => Promise<void>;
  validateCommissionPayment: (id: string, paymentId: string) => Promise<void>;
  revertCommissionPayment: (id: string, paymentId: string) => Promise<void>;
  processCommissionsCut: (month: number, year: number) => Promise<void>;
  regularizeCommissions: (month: number, year: number) => Promise<void>;
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
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isSeller = currentUser?.role === 'seller';

  // Fetch settings, products and exchange rate immediately, even if not logged in
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [settingsRes, productsRes, exchangeRateRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/products'),
          fetch('/api/exchange-rate')
        ]);
        if (settingsRes.ok) {
          setSettings(await settingsRes.json());
        }
        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.map((d: any) => ({ ...d, id: d._id })));
        }
        if (exchangeRateRes.ok) {
          setExchangeRate(await exchangeRateRes.json());
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
      const [usersRes, clientsRes, salesRes, expensesRes, ordersRes, commissionsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/clients'),
        fetch('/api/sales'),
        fetch('/api/expenses'),
        fetch('/api/orders'),
        fetch('/api/commissions')
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
      if (commissionsRes.ok) {
        const data = await commissionsRes.json();
        setCommissions(data.map((d: any) => ({ ...d, id: d._id })));
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

  const deleteClient = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setClients(prev => prev.filter(c => c._id !== id));
        alert('Cliente eliminado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al eliminar el cliente: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error deleting client:', error);
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

  const deleteSale = async (id: string) => {
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSales(prev => prev.filter(s => s._id !== id));
        alert('Venta eliminada exitosamente');
        fetchData(); // Refresh to update stock
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al eliminar la venta: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error deleting sale:', error);
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

  const deleteExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setExpenses(prev => prev.filter(e => e._id !== id));
        alert('Gasto eliminado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al eliminar el gasto: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error deleting expense:', error);
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

  const deleteOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o._id !== id));
        alert('Encargo eliminado exitosamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al eliminar el encargo: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Error deleting order:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const addCommission = async (commission: Partial<Commission>) => {
    try {
      const res = await fetch('/api/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commission)
      });
      if (res.ok) {
        const newCommission = await res.json();
        setCommissions(prev => [{ ...newCommission, id: newCommission._id }, ...prev]);
      }
    } catch (error) {
      console.error('Error adding commission:', error);
    }
  };

  const updateCommission = async (id: string, commission: Partial<Commission>) => {
    try {
      const res = await fetch(`/api/commissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commission)
      });
      if (res.ok) {
        const updated = await res.json();
        setCommissions(prev => prev.map(c => c._id === id ? { ...updated, id: updated._id } : c));
        // Note: Backend already creates the expense when status changes to 'pagada'
      }
    } catch (error) {
      console.error('Error updating commission:', error);
    }
  };

  const addCommissionPayment = async (id: string, payment: any) => {
    try {
      const res = await fetch(`/api/commissions/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payment, createdBy: currentUser?._id })
      });
      if (res.ok) {
        const updated = await res.json();
        setCommissions(prev => prev.map(c => c._id === id ? { ...updated, id: updated._id } : c));
        alert('Pago registrado correctamente.');
        fetchData(); // Refresh expenses too
      } else {
        const errorData = await res.json();
        alert(`Error al registrar pago: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error adding commission payment:', error);
      alert('Error de red al registrar pago.');
    }
  };

  const deleteCommissionPayment = async (id: string, paymentId: string) => {
    try {
      const res = await fetch(`/api/commissions/${id}/payments/${paymentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updated = await res.json();
        setCommissions(prev => prev.map(c => c._id === id ? { ...updated, id: updated._id } : c));
        alert('Pago anulado correctamente.');
        fetchData(); // Refresh expenses too
      } else {
        const errorData = await res.json();
        alert(`Error al anular pago: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting commission payment:', error);
      alert('Error de red al anular pago.');
    }
  };

  const validateCommissionPayment = async (id: string, paymentId: string) => {
    try {
      const res = await fetch(`/api/commissions/${id}/payments/${paymentId}/validate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?._id })
      });
      if (res.ok) {
        const updated = await res.json();
        setCommissions(prev => prev.map(c => c._id === id ? { ...updated, id: updated._id } : c));
        alert('Pago validado correctamente.');
      } else {
        const errorData = await res.json();
        alert(`Error al validar pago: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error validating commission payment:', error);
      alert('Error de red al validar pago.');
    }
  };

  const revertCommissionPayment = async (id: string, paymentId: string) => {
    try {
      const res = await fetch(`/api/commissions/${id}/payments/${paymentId}/revert`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?._id })
      });
      if (res.ok) {
        const updated = await res.json();
        setCommissions(prev => prev.map(c => c._id === id ? { ...updated, id: updated._id } : c));
        alert('Pago revertido a "por verificar".');
      } else {
        const errorData = await res.json();
        alert(`Error al revertir pago: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error reverting commission payment:', error);
      alert('Error de red al revertir pago.');
    }
  };

  const processCommissionsCut = async (month: number, year: number) => {
    try {
      const res = await fetch('/api/commissions/process-cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year })
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Corte procesado correctamente.');
        fetchData();
      } else {
        const errorData = await res.json();
        alert(`Error al procesar corte: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error processing commissions cut:', error);
    }
  };

  const regularizeCommissions = async (month: number, year: number) => {
    try {
      const res = await fetch('/api/commissions/regularize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year })
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchData();
      } else {
        const errorData = await res.json();
        alert(`Error al regularizar comisiones: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error regularizing commissions:', error);
    }
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, users, clients, products, sales, expenses, orders, commissions, settings, exchangeRate, loading, authLoading, isAdmin, isManager, isSeller,
      loginWithGoogle, logout, refreshData: fetchData, updateSettings, addUser, updateUser, deleteUser, sendWelcomeEmail, addProduct, updateProduct, addClient, updateClient, deleteClient, addSale, updateSale, deleteSale,
      addExpense, updateExpense, deleteExpense, addOrder, updateOrder, deleteOrder, addCommission, updateCommission, 
      addCommissionPayment, deleteCommissionPayment, validateCommissionPayment, revertCommissionPayment,
      processCommissionsCut, regularizeCommissions
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
