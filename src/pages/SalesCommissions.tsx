import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Calendar,
  Filter,
  Download,
  ChevronRight,
  User as UserIcon,
  Search,
  Scissors
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const parseDisplayDate = (dateString: string) => {
  if (!dateString) return new Date();
  const d = new Date(dateString);
  if (dateString.includes('T00:00:00.000Z') || dateString.includes('T00:00:00.000+00:00')) {
    return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  }
  return d;
};

const SalesCommissions: React.FC = () => {
  const { sales, users, commissions, updateCommission, processCommissionsCut, regularizeCommissions, isAdmin, currentUser, exchangeRate } = useAppContext();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'pagada'>('all');

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  const filteredCommissions = useMemo(() => {
    return commissions.filter(c => {
      // If seller, only see own commissions
      if (currentUser?.role === 'seller' && c.sellerId !== currentUser._id) return false;

      const matchesMonth = c.month === selectedMonth && c.year === selectedYear;
      // Also include pending commissions from previous months
      const isPendingFromPast = c.status === 'pendiente' && (c.year < selectedYear || (c.year === selectedYear && c.month < selectedMonth));
      
      if (!matchesMonth && !isPendingFromPast) return false;

      const seller = users.find(u => u._id === c.sellerId);
      const matchesSearch = seller?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [commissions, selectedMonth, selectedYear, searchTerm, statusFilter, users, currentUser]);

  const summary = useMemo(() => {
    const totalCommissions = Math.round(filteredCommissions.reduce((sum, c) => sum + c.amount, 0) * 100) / 100;
    const paidCommissions = Math.round(filteredCommissions.filter(c => c.status === 'pagada').reduce((sum, c) => sum + c.amount, 0) * 100) / 100;
    const pendingCommissions = Math.round(filteredCommissions.filter(c => c.status === 'pendiente').reduce((sum, c) => sum + c.amount, 0) * 100) / 100;
    
    // Total sales for the selected month (only for matching month, not past pending)
    const monthSales = sales.filter(s => {
      const date = parseDisplayDate(s.date);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
    const totalSalesAmount = Math.round(monthSales.reduce((sum, s) => sum + s.totalUSD, 0) * 100) / 100;

    return {
      totalSalesAmount,
      totalCommissions,
      paidCommissions,
      pendingCommissions,
      salesCount: monthSales.length
    };
  }, [filteredCommissions, sales, selectedMonth, selectedYear]);

  const handleProcessCut = async () => {
    if (window.confirm(`¿Está seguro de procesar el corte de comisiones para ${months[selectedMonth]} ${selectedYear}?`)) {
      await processCommissionsCut(selectedMonth, selectedYear);
    }
  };

  const handleToggleStatus = async (commission: any) => {
    const newStatus = commission.status === 'pendiente' ? 'pagada' : 'pendiente';
    const confirmMsg = newStatus === 'pagada' 
      ? '¿Marcar como pagada? Esto generará un registro en el módulo de Gastos.' 
      : '¿Marcar como pendiente?';
    
    if (window.confirm(confirmMsg)) {
      await updateCommission(commission._id, { status: newStatus });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Comisiones de Ventas</h1>
            {(isAdmin || isManager) && (
              <button
                onClick={() => regularizeCommissions(selectedMonth, selectedYear)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Regularizar Comisiones
              </button>
            )}
          </div>
          <p className="text-gray-500">Gestión de pagos y liquidaciones para vendedores</p>
          {exchangeRate && (
            <div className="flex flex-col text-sm text-indigo-600 font-semibold mt-1">
              <div className="flex items-center space-x-2">
                <span>Tasa BCV: {exchangeRate.promedio.toFixed(2)} Bs/$</span>
                <span className="text-gray-400 text-xs font-normal">Actualización BCV: {new Date(exchangeRate.fechaActualizacion).toLocaleString('es-VE', { timeZone: 'America/Caracas' })}</span>
              </div>
              <div className="text-[10px] text-gray-400 font-normal">
                Sincronizado: {new Date(exchangeRate.lastChecked).toLocaleString('es-VE', { timeZone: 'America/Caracas' })}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium"
            >
              {months.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium ml-2"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {(isAdmin || isManager) && (
            <button
              onClick={handleProcessCut}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Scissors className="w-4 h-4" />
              <span>Procesar Corte</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              {summary.salesCount} ventas
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Ventas del Mes</p>
          <h3 className="text-2xl font-bold text-gray-900">${summary.totalSalesAmount.toFixed(2)}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Total Comisiones</p>
          <h3 className="text-2xl font-bold text-gray-900">${summary.totalCommissions.toFixed(2)}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Pagado</p>
          <h3 className="text-2xl font-bold text-green-600">${summary.paidCommissions.toFixed(2)}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Pendiente</p>
          <h3 className="text-2xl font-bold text-amber-600">${summary.pendingCommissions.toFixed(2)}</h3>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-bottom border-gray-200 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2">
              <Filter className="w-4 h-4 text-gray-400 mr-2" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent border-none focus:ring-0 text-sm font-medium"
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="pagada">Pagadas</option>
              </select>
            </div>
            
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendedor</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Venta</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha Venta</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Comisión</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mes/Año</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estatus</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCommissions.length > 0 ? (
                filteredCommissions.map((commission) => {
                  const seller = users.find(u => u._id === commission.sellerId);
                  const sale = sales.find(s => s._id === commission.saleId);
                  const isPastPending = commission.month !== selectedMonth || commission.year !== selectedYear;

                  return (
                    <tr key={commission._id} className={`hover:bg-gray-50 transition-colors ${isPastPending ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                            <UserIcon className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{seller?.name || 'Vendedor Desconocido'}</div>
                            <div className="text-xs text-gray-500">{seller?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${sale?.totalUSD.toFixed(2) || '0.00'}</div>
                        <div className="text-xs text-gray-500">Ref: {sale?._id?.substring(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale ? format(parseDisplayDate(sale.date), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">${commission.amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">{seller?.commissionPercentage}% de la venta</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{months[commission.month]} {commission.year}</div>
                        {isPastPending && (
                          <span className="text-[10px] font-bold text-amber-600 uppercase">Arrastre</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          commission.status === 'pagada' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {commission.status === 'pagada' ? 'Pagada' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {(isAdmin || (isManager && seller?.role !== 'admin')) && (
                          <button
                            onClick={() => handleToggleStatus(commission)}
                            className={`p-2 rounded-lg transition-colors ${
                              commission.status === 'pagada'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={commission.status === 'pagada' ? 'Marcar como pendiente' : 'Marcar como pagada'}
                          >
                            {commission.status === 'pagada' ? <Clock className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    No se encontraron comisiones para este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesCommissions;
