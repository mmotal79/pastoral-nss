import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Clock, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, startOfDay, endOfDay } from 'date-fns';

const parseDisplayDate = (dateString: string) => {
  if (!dateString) return new Date();
  const d = new Date(dateString);
  if (dateString.includes('T00:00:00.000Z') || dateString.includes('T00:00:00.000+00:00')) {
    return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  }
  return d;
};

export default function Dashboard() {
  const { sales, expenses, exchangeRate } = useAppContext();
  
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      if (sale.status === 'anulado') return false;
      let match = true;
      const saleDate = parseDisplayDate(sale.date);
      if (dateFrom) {
        if (saleDate < startOfDay(parseISO(dateFrom))) match = false;
      }
      if (dateTo) {
        if (saleDate > endOfDay(parseISO(dateTo))) match = false;
      }
      return match;
    });
  }, [sales, dateFrom, dateTo]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (exp.status === 'anulado') return false;
      let match = true;
      const expDate = parseDisplayDate(exp.date);
      if (dateFrom) {
        if (expDate < startOfDay(parseISO(dateFrom))) match = false;
      }
      if (dateTo) {
        if (expDate > endOfDay(parseISO(dateTo))) match = false;
      }
      return match;
    });
  }, [expenses, dateFrom, dateTo]);

  const totalSales = filteredSales.reduce((acc, sale) => acc + sale.totalUSD, 0);
  const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + (exp.amountUSD || 0), 0);
  
  // Calculate Accounts Receivable (Cuentas por cobrar)
  const accountsReceivable = filteredSales.reduce((acc, sale) => {
    const paid = sale.payments.reduce((sum, p) => sum + p.amountUSD, 0);
    const pending = sale.totalUSD - paid;
    return acc + (pending > 0 ? pending : 0);
  }, 0);

  const netProfit = totalSales - totalExpenses - accountsReceivable;

  const chartData = [
    { name: 'Ventas', amount: totalSales },
    { name: 'Gastos', amount: totalExpenses },
    { name: 'Por Cobrar', amount: accountsReceivable },
    { name: 'Ganancia Neta', amount: netProfit },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Gerencial</h1>
        <div className="flex flex-col items-end gap-2">
          {exchangeRate && (
            <div className="text-right">
              <div className="text-sm font-bold text-indigo-600">Tasa BCV: {exchangeRate.promedio.toFixed(2)} Bs/$</div>
              <div className="text-xs text-gray-500">Actualizado: {new Date(exchangeRate.fechaActualizacion).toLocaleDateString()}</div>
            </div>
          )}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filtrar por Fecha
          </button>
        </div>
      </div>

      {isFilterOpen && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Limpiar
            </button>
            <button
              onClick={() => {
                setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                setDateTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Mes Actual
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ventas Totales</dt>
                  <dd className="text-lg font-medium text-gray-900">${totalSales.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Gastos Totales</dt>
                  <dd className="text-lg font-medium text-gray-900">${totalExpenses.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Cuentas por Cobrar</dt>
                  <dd className="text-lg font-medium text-gray-900">${accountsReceivable.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ganancia Neta</dt>
                  <dd className="text-lg font-medium text-gray-900">${netProfit.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Análisis de Ganancias y Pérdidas</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
