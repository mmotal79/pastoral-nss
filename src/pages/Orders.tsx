import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, ArrowRight } from 'lucide-react';
import Modal from '../components/Modal';
import { format } from 'date-fns';

export default function Orders() {
  const { orders, clients, addOrder } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    itemDescription: '',
    color: '',
    design: '',
    materials: '',
    orderDate: format(new Date(), 'yyyy-MM-dd'),
    deliveryDate: format(new Date(), 'yyyy-MM-dd'),
    estimatedCostUSD: '',
    status: 'pending' as 'pending' | 'in-progress' | 'completed' | 'transferred'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addOrder({
      clientId: formData.clientId,
      itemDescription: formData.itemDescription,
      color: formData.color,
      design: formData.design,
      materials: formData.materials,
      orderDate: new Date(formData.orderDate).toISOString(),
      deliveryDate: new Date(formData.deliveryDate).toISOString(),
      estimatedCostUSD: Number(formData.estimatedCostUSD),
      status: formData.status
    });
    setIsModalOpen(false);
    setFormData({
      clientId: '', itemDescription: '', color: '', design: '', materials: '',
      orderDate: format(new Date(), 'yyyy-MM-dd'), deliveryDate: format(new Date(), 'yyyy-MM-dd'),
      estimatedCostUSD: '', status: 'pending'
    });
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Desconocido';
  };

  const statusColors = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'transferred': 'bg-gray-100 text-gray-800',
  };

  const statusLabels = {
    'pending': 'Pendiente',
    'in-progress': 'En Progreso',
    'completed': 'Completado',
    'transferred': 'Transferido a Ventas',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Encargos Especiales</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Encargo
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Encargo">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cliente</label>
            <select required value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
              <option value="">Seleccione un cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Artículo / Descripción</label>
            <input type="text" required value={formData.itemDescription} onChange={e => setFormData({...formData, itemDescription: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Color</label>
              <input type="text" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Diseño</label>
              <input type="text" value={formData.design} onChange={e => setFormData({...formData, design: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Materiales</label>
            <input type="text" value={formData.materials} onChange={e => setFormData({...formData, materials: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha de Encargo</label>
              <input type="date" required value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha de Entrega</label>
              <input type="date" required value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Costo Estimado (USD)</label>
              <input type="number" step="0.01" required value={formData.estimatedCostUSD} onChange={e => setFormData({...formData, estimatedCostUSD: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                <option value="pending">Pendiente</option>
                <option value="in-progress">En Progreso</option>
                <option value="completed">Completado</option>
              </select>
            </div>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artículo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getClientName(order.clientId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.itemDescription}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="text-xs">
                    <span className="font-semibold">Color:</span> {order.color}<br/>
                    <span className="font-semibold">Diseño:</span> {order.design}<br/>
                    <span className="font-semibold">Material:</span> {order.materials}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="text-xs">
                    <span className="font-semibold">Encargo:</span> {order.orderDate}<br/>
                    <span className="font-semibold">Entrega:</span> {order.deliveryDate}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.estimatedCostUSD?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.status !== 'transferred' && (
                    <button className="text-indigo-600 hover:text-indigo-900 flex items-center text-xs">
                      Transferir a Ventas
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
