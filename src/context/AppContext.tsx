import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
export interface Client {
  _id?: string;
  id?: string;
  name: string;
  documentId: string;
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

interface AppContextType {
  clients: Client[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  orders: Order[];
  loading: boolean;
  refreshData: () => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<void>;
  addClient: (client: Partial<Client>) => Promise<void>;
  addSale: (sale: Partial<Sale>) => Promise<void>;
  addExpense: (expense: Partial<Expense>) => Promise<void>;
  addOrder: (order: Partial<Order>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsRes, productsRes, salesRes, expensesRes, ordersRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/products'),
        fetch('/api/sales'),
        fetch('/api/expenses'),
        fetch('/api/orders')
      ]);

      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.map((d: any) => ({ ...d, id: d._id })));
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.map((d: any) => ({ ...d, id: d._id })));
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

  useEffect(() => {
    fetchData();
  }, []);

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
      }
    } catch (error) {
      console.error('Error adding product:', error);
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
      }
    } catch (error) {
      console.error('Error adding client:', error);
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
      }
    } catch (error) {
      console.error('Error adding sale:', error);
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
      }
    } catch (error) {
      console.error('Error adding expense:', error);
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
      }
    } catch (error) {
      console.error('Error adding order:', error);
    }
  };

  return (
    <AppContext.Provider value={{ 
      clients, products, sales, expenses, orders, loading, 
      refreshData: fetchData, addProduct, addClient, addSale,
      addExpense, addOrder
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
