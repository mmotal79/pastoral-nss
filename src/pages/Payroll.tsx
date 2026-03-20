import React, { useState, useMemo } from 'react';
import { useAppContext, Payroll as PayrollType, User } from '../context/AppContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Trash2,
  Check,
  X,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  History,
  User as UserIcon,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, addDays, isSunday, isAfter, startOfDay, getYear, getMonth, getWeek, lastDayOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Payroll() {
  const { 
    payrolls, 
    users, 
    isAdmin, 
    isManager, 
    addPayroll, 
    updatePayroll, 
    deletePayroll, 
    addPayrollPayment, 
    deletePayrollPayment, 
    validatePayrollPayment, 
    revertPayrollPayment,
    exchangeRate
  } = useAppContext();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollType | null>(null);
  const [expandedPayrollId, setExpandedPayrollId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Form states
  const [formData, setFormData] = useState({
    userId: '',
    type: 'diario' as 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'anual',
    concept: '',
    amountUSD: 0,
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [paymentData, setPaymentData] = useState({
    amountUSD: 0,
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [isRegularizing, setIsRegularizing] = useState(false);

  const filteredPayrolls = useMemo(() => {
    return payrolls.filter(p => {
      const matchesSearch = p.concept.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUser = filterUser === 'all' || p.userId === filterUser;
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchesType = filterType === 'all' || p.type === filterType;
      return matchesSearch && matchesUser && matchesStatus && matchesType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payrolls, searchTerm, filterUser, filterStatus, filterType]);

  const activeUsers = useMemo(() => users.filter(u => u.role !== 'admin' || isAdmin), [users, isAdmin]);

  const handleAddPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPayroll(formData);
    setIsAddModalOpen(false);
    setFormData({
      userId: '',
      type: 'diario',
      concept: '',
      amountUSD: 0,
      date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const handleRegularize = async () => {
    setIsRegularizing(true);
    const now = new Date();
    const currentYear = getYear(now);
    const currentMonth = getMonth(now);
    
    try {
      // Iterate over all users
      for (const user of users) {
        if (!user.periodicSalary || user.periodicSalary <= 0) continue;
        
        const frequency = user.salaryFrequency || 'mensual';
        const salary = user.periodicSalary;
        
        if (frequency === 'diario') {
          // Current week (Mon-Sat)
          const start = startOfWeek(now, { weekStartsOn: 1 });
          const end = endOfWeek(now, { weekStartsOn: 1 });
          let current = start;
          while (current <= end) {
            if (!isSunday(current)) {
              const dateStr = format(current, 'yyyy-MM-dd');
              const dayName = format(current, 'EEEE', { locale: es });
              const concept = `Sueldo Diario - ${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dateStr}`;
              
              const exists = payrolls.find(p => p.userId === user._id && p.date === dateStr && p.type === 'diario');
              if (!exists) {
                await addPayroll({
                  userId: user._id!,
                  type: 'diario',
                  concept,
                  amountUSD: salary,
                  date: dateStr,
                  status: 'pendiente'
                });
              }
            }
            current = addDays(current, 1);
          }
        } else if (frequency === 'semanal') {
          const weekStart = startOfWeek(now, { weekStartsOn: 1 });
          const dateStr = format(weekStart, 'yyyy-MM-dd');
          const concept = `Sueldo Semanal - Semana ${getWeek(weekStart)} ${getYear(weekStart)}`;
          
          const exists = payrolls.find(p => {
            const pDate = parseISO(p.date);
            return p.userId === user._id && p.type === 'semanal' && getWeek(pDate) === getWeek(weekStart) && getYear(pDate) === getYear(weekStart);
          });
          
          if (!exists) {
            await addPayroll({
              userId: user._id!,
              type: 'semanal',
              concept,
              amountUSD: salary,
              date: dateStr,
              status: 'pendiente'
            });
          }
        } else if (frequency === 'quincenal') {
          // 1st Quincena (15th)
          const date15 = format(new Date(currentYear, currentMonth, 15), 'yyyy-MM-dd');
          const concept15 = `Sueldo Quincenal - 1ra Quincena ${format(now, 'MMMM', { locale: es })} ${currentYear}`;
          
          const exists15 = payrolls.find(p => p.userId === user._id && p.date === date15 && p.type === 'quincenal');
          if (!exists15) {
            await addPayroll({
              userId: user._id!,
              type: 'quincenal',
              concept: concept15,
              amountUSD: salary,
              date: date15,
              status: 'pendiente'
            });
          }
          
          // 2nd Quincena (30th or last day)
          const lastDay = lastDayOfMonth(now);
          const day30 = Math.min(30, lastDay.getDate());
          const date30 = format(new Date(currentYear, currentMonth, day30), 'yyyy-MM-dd');
          const concept30 = `Sueldo Quincenal - 2da Quincena ${format(now, 'MMMM', { locale: es })} ${currentYear}`;
          
          const exists30 = payrolls.find(p => p.userId === user._id && p.date === date30 && p.type === 'quincenal');
          if (!exists30) {
            await addPayroll({
              userId: user._id!,
              type: 'quincenal',
              concept: concept30,
              amountUSD: salary,
              date: date30,
              status: 'pendiente'
            });
          }
        } else if (frequency === 'mensual') {
          const lastDay = lastDayOfMonth(now);
          const dateStr = format(lastDay, 'yyyy-MM-dd');
          const concept = `Sueldo Mensual - ${format(now, 'MMMM', { locale: es })} ${currentYear}`;
          
          const exists = payrolls.find(p => {
            const pDate = parseISO(p.date);
            return p.userId === user._id && p.type === 'mensual' && getMonth(pDate) === currentMonth && getYear(pDate) === currentYear;
          });
          
          if (!exists) {
            await addPayroll({
              userId: user._id!,
              type: 'mensual',
              concept,
              amountUSD: salary,
              date: dateStr,
              status: 'pendiente'
            });
          }
        } else if (frequency === 'anual') {
          const dateStr = format(new Date(currentYear, 11, 31), 'yyyy-MM-dd');
          const concept = `Sueldo Anual - ${currentYear}`;
          
          const exists = payrolls.find(p => {
            const pDate = parseISO(p.date);
            return p.userId === user._id && p.type === 'anual' && getYear(pDate) === currentYear;
          });
          
          if (!exists) {
            await addPayroll({
              userId: user._id!,
              type: 'anual',
              concept,
              amountUSD: salary,
              date: dateStr,
              status: 'pendiente'
            });
          }
        }
      }
      // Success - no modal as requested
    } catch (error) {
      console.error('Error in regularization:', error);
    } finally {
      setIsRegularizing(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayroll?._id) return;
    await addPayrollPayment(selectedPayroll._id, paymentData);
    setIsPaymentModalOpen(false);
    setSelectedPayroll(null);
    setPaymentData({ amountUSD: 0, date: format(new Date(), 'yyyy-MM-dd') });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pagado':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1" /> Pagado</span>;
      case 'parcial':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full flex items-center w-fit"><Clock className="w-3 h-3 mr-1" /> Parcial</span>;
      case 'pendiente':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full flex items-center w-fit"><AlertCircle className="w-3 h-3 mr-1" /> Pendiente</span>;
      case 'anulado':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full flex items-center w-fit"><X className="w-3 h-3 mr-1" /> Anulado</span>;
      default:
        return null;
    }
  };

  const calculatePending = (payroll: PayrollType) => {
    const paid = payroll.payments
      .filter(p => p.status !== 'anulado')
      .reduce((sum, p) => sum + p.amountUSD, 0);
    return Math.max(0, payroll.amountUSD - paid);
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-gray-900">Acceso Restringido</h2>
        <p>No tienes permisos para ver este módulo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nómina y Salarios</h1>
          <p className="text-gray-500 text-sm">Gestión de sueldos diarios y semanales</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRegularize()}
            disabled={isRegularizing}
            className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium border border-indigo-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRegularizing ? 'animate-spin' : ''}`} />
            {isRegularizing ? 'Procesando...' : 'Regularizar'}
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Registro
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por concepto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
          />
        </div>
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
        >
          <option value="all">Todos los usuarios</option>
          {activeUsers.map(u => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
        >
          <option value="all">Frecuencia: Todas</option>
          <option value="diario">Diario</option>
          <option value="semanal">Semanal</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
        >
          <option value="all">Estado: Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="parcial">Parcial</option>
          <option value="pagado">Pagado</option>
          <option value="anulado">Anulado</option>
        </select>
      </div>

      {/* Payroll List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha / Tipo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Monto (USD)</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Pendiente</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayrolls.length > 0 ? (
                filteredPayrolls.map((p) => {
                  const user = users.find(u => u._id === p.userId);
                  const pending = calculatePending(p);
                  const isExpanded = expandedPayrollId === p._id;

                  return (
                    <React.Fragment key={p._id}>
                      <tr className={`hover:bg-gray-50 transition-colors ${p.status === 'anulado' ? 'opacity-60 bg-gray-50' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mr-3">
                              {user?.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-900">{format(parseISO(p.date), 'dd/MM/yyyy')}</span>
                            <span className={`text-[10px] font-bold uppercase ${p.type === 'diario' ? 'text-blue-600' : 'text-purple-600'}`}>
                              {p.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`text-sm text-gray-900 ${p.status === 'anulado' ? 'line-through' : ''}`}>{p.concept}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-bold text-gray-900">${p.amountUSD.toFixed(2)}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={`text-sm font-bold ${pending > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${pending.toFixed(2)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(p.status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setExpandedPayrollId(isExpanded ? null : p._id!)}
                              className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                              title="Ver historial de pagos"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {p.status !== 'pagado' && p.status !== 'anulado' && (
                              <button
                                onClick={() => {
                                  setSelectedPayroll(p);
                                  setPaymentData({ amountUSD: pending, date: format(new Date(), 'yyyy-MM-dd') });
                                  setIsPaymentModalOpen(true);
                                }}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Registrar pago"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            {isAdmin && p.status !== 'anulado' && (
                              <button
                                onClick={() => {
                                  if (confirm('¿Estás seguro de anular este registro de nómina?')) {
                                    deletePayroll(p._id!);
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Anular registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <h4 className="text-xs font-bold text-gray-700 uppercase">Historial de Pagos</h4>
                                <span className="text-xs text-gray-500">{p.payments.length} transacciones</span>
                              </div>
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-gray-100">
                                    <th className="px-4 py-2 font-semibold text-gray-500">Fecha</th>
                                    <th className="px-4 py-2 font-semibold text-gray-500">Monto</th>
                                    <th className="px-4 py-2 font-semibold text-gray-500">Registrado por</th>
                                    <th className="px-4 py-2 font-semibold text-gray-500">Estado</th>
                                    <th className="px-4 py-2 font-semibold text-gray-500 text-right">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {p.payments.length > 0 ? (
                                    p.payments.map((pay) => {
                                      const creator = users.find(u => u._id === pay.createdBy);
                                      return (
                                        <tr key={pay._id} className={pay.status === 'anulado' ? 'opacity-50' : ''}>
                                          <td className="px-4 py-2">{format(parseISO(pay.date), 'dd/MM/yyyy')}</td>
                                          <td className="px-4 py-2 font-bold">${pay.amountUSD.toFixed(2)}</td>
                                          <td className="px-4 py-2">{creator?.name || 'Sistema'}</td>
                                          <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                              pay.status === 'pagado' ? 'bg-green-100 text-green-700' :
                                              pay.status === 'por verificar' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-red-100 text-red-700'
                                            }`}>
                                              {pay.status}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                            <div className="flex items-center justify-end space-x-1">
                                              {pay.status === 'por verificar' && isAdmin && (
                                                <button
                                                  onClick={() => validatePayrollPayment(p._id!, pay._id!)}
                                                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                  title="Validar pago"
                                                >
                                                  <Check className="w-3 h-3" />
                                                </button>
                                              )}
                                              {pay.status === 'pagado' && isAdmin && (
                                                <button
                                                  onClick={() => revertPayrollPayment(p._id!, pay._id!)}
                                                  className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                                  title="Revertir a verificación"
                                                >
                                                  <History className="w-3 h-3" />
                                                </button>
                                              )}
                                              {pay.status !== 'anulado' && (isAdmin || pay.status === 'por verificar') && (
                                                <button
                                                  onClick={() => {
                                                    if (confirm('¿Estás seguro de anular este pago?')) {
                                                      deletePayrollPayment(p._id!, pay._id!);
                                                    }
                                                  }}
                                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                  title="Anular pago"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan={5} className="px-4 py-4 text-center text-gray-400 italic">No hay pagos registrados</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <AlertCircle className="w-12 h-12 text-gray-200 mb-4" />
                      <p className="text-lg font-medium">No se encontraron registros</p>
                      <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payroll Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Nuevo Registro de Nómina</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddPayroll} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <select
                  required
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Seleccione un usuario</option>
                  {activeUsers.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'diario' | 'semanal' })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sueldo Diario - Lunes 20/03/2026"
                  value={formData.concept}
                  onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={formData.amountUSD}
                    onChange={(e) => setFormData({ ...formData, amountUSD: parseFloat(e.target.value) })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-green-600 text-white">
              <h3 className="text-lg font-bold text-white">Registrar Pago de Nómina</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-green-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <p className="text-xs text-green-800 font-medium mb-1">Concepto:</p>
                <p className="text-sm text-green-900 font-bold">{selectedPayroll.concept}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs text-green-700">Total: ${selectedPayroll.amountUSD.toFixed(2)}</span>
                  <span className="text-xs font-bold text-red-600">Pendiente: ${calculatePending(selectedPayroll).toFixed(2)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto a Pagar (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    max={calculatePending(selectedPayroll)}
                    value={paymentData.amountUSD}
                    onChange={(e) => setPaymentData({ ...paymentData, amountUSD: parseFloat(e.target.value) })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago</label>
                <input
                  type="date"
                  required
                  value={paymentData.date}
                  onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
