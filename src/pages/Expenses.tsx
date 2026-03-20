import React, { useState } from 'react';
import { useAppContext, Expense } from '../context/AppContext';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import Modal from '../components/Modal';
import { format } from 'date-fns';

const formatDisplayDate = (dateString: string, formatStr: string, options?: any) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (dateString.includes('T00:00:00.000Z') || dateString.includes('T00:00:00.000+00:00')) {
    const utcDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return format(utcDate, formatStr, options);
  }
  return format(d, formatStr, options);
};

const getLocalDatetime = (dateString: string) => {
  if (!dateString) return new Date().toISOString();
  const now = new Date();
  const [year, month, day] = dateString.split('-');
  const d = new Date(Number(year), Number(month) - 1, Number(day), now.getHours(), now.getMinutes(), now.getSeconds());
  return d.toISOString();
};

export default function Expenses() {
  const { expenses, addExpense, updateExpense, exchangeRate, isAdmin } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showAnulled, setShowAnulled] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amountUSD: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'materials'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const expenseData = {
        description: formData.description,
        amountUSD: Number(formData.amountUSD),
        date: getLocalDatetime(formData.date),
        category: formData.category
      };

      if (editingExpense && editingExpense._id) {
        await updateExpense(editingExpense._id, expenseData);
      } else {
        await addExpense(expenseData);
      }
      
      setIsModalOpen(false);
      setEditingExpense(null);
      setFormData({ description: '', amountUSD: '', date: format(new Date(), 'yyyy-MM-dd'), category: 'materials' });
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnular = async (expense: Expense) => {
    if (!window.confirm('¿Está seguro de anular este gasto? Esta acción no se puede deshacer.')) return;
    try {
      await updateExpense(expense._id!, { status: 'anulado' });
    } catch (error) {
      console.error('Error anular gasto:', error);
    }
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amountUSD: expense.amountUSD.toString(),
      date: formatDisplayDate(expense.date, 'yyyy-MM-dd'),
      category: expense.category
    });
    setIsModalOpen(true);
  };

  const categoryLabels: Record<string, string> = {
    'materials': 'Materiales',
    'equipment': 'Equipos',
    'services': 'Pago de servicios a Proveedor',
    'payroll': 'Nómina',
    'supplies': 'Insumos',
    'other': 'Otros'
  };

  const filteredExpenses = expenses.filter(e => showAnulled || e.status !== 'anulado');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900">Gastos e Insumos</h1>
          {exchangeRate && (
            <div className="flex items-center space-x-2 text-sm text-indigo-600 font-semibold">
              <span>Tasa BCV: {exchangeRate.promedio.toFixed(2)} Bs/$</span>
              <span className="text-gray-400 text-xs font-normal">Actualizado: {new Date(exchangeRate.fechaActualizacion).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center text-sm text-gray-600 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showAnulled} 
              onChange={(e) => setShowAnulled(e.target.checked)}
              className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Mostrar anulados
          </label>
          <button 
            onClick={() => {
              setEditingExpense(null);
              setFormData({ description: '', amountUSD: '', date: format(new Date(), 'yyyy-MM-dd'), category: 'materials' });
              setIsModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Registrar Gasto
          </button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? "Editar Gasto" : "Registrar Gasto"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <input type="text" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Monto (USD)</label>
            <input type="number" step="0.01" required value={formData.amountUSD} onChange={e => setFormData({...formData, amountUSD: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha</label>
            <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Categoría</label>
            <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
              <option value="materials">Materiales</option>
              <option value="equipment">Equipos</option>
              <option value="supplies">Insumos</option>
              <option value="services">Pago de servicios a Proveedor</option>
              <option value="payroll">Nómina</option>
              <option value="other">Otros</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end space-x-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Guardar</button>
          </div>
        </form>
      </Modal>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estatus</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.map((expense) => (
              <tr key={expense.id} className={expense.status === 'anulado' ? 'bg-gray-50 opacity-60' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDisplayDate(expense.date, 'dd/MM/yyyy')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {expense.description}
                  {expense.status === 'anulado' && <span className="ml-2 text-[10px] font-bold text-red-600 uppercase">Anulado</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{categoryLabels[expense.category] || expense.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${expense.amountUSD?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    expense.status === 'anulado' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {expense.status === 'anulado' ? 'Anulado' : 'Activo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-3">
                    {expense.status !== 'anulado' && (
                      <button onClick={() => openEditModal(expense)} className="text-blue-600 hover:text-blue-900" title="Editar Gasto">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && expense.status !== 'anulado' && (
                      <button onClick={() => handleAnular(expense)} className="text-red-600 hover:text-red-900" title="Anular Gasto">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
