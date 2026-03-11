import React, { useState } from 'react';
import { useAppContext, Expense } from '../context/AppContext';
import { Plus, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';
import { format } from 'date-fns';

export default function Expenses() {
  const { expenses, addExpense, updateExpense } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amountUSD: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'materials'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const expenseData = {
      description: formData.description,
      amountUSD: Number(formData.amountUSD),
      date: new Date(formData.date).toISOString(),
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
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amountUSD: expense.amountUSD.toString(),
      date: format(new Date(expense.date), 'yyyy-MM-dd'),
      category: expense.category
    });
    setIsModalOpen(true);
  };

  const categoryLabels: Record<string, string> = {
    'materials': 'Materiales',
    'equipment': 'Equipos',
    'services': 'Servicios',
    'other': 'Otros'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gastos e Insumos</h1>
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
              <option value="services">Servicios</option>
              <option value="other">Otros</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end space-x-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Guardar</button>
          </div>
        </form>
      </Modal>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(expense.date), 'dd/MM/yyyy')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{expense.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{categoryLabels[expense.category] || expense.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${expense.amountUSD?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button onClick={() => openEditModal(expense)} className="text-blue-600 hover:text-blue-900" title="Editar Gasto">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
