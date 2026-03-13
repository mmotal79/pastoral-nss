import React, { useState } from 'react';
import { useAppContext, Order } from '../context/AppContext';
import { Plus, ArrowRight, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';
import { format } from 'date-fns';

export default function Orders() {
  const { orders, clients, products, addOrder, updateOrder, addSale } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    clientId: '',
    items: [] as { productId: string; quantity: number; priceUSD: number; name: string }[],
    color: '',
    design: '',
    materials: '',
    orderDate: format(new Date(), 'yyyy-MM-dd'),
    deliveryDate: format(new Date(), 'yyyy-MM-dd'),
    estimatedCostUSD: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'transferred_to_sale'
  });

  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const filteredClients = (clients || []).filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
  const filteredProducts = (products || []).filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      alert('Por favor, seleccione un cliente');
      return;
    }
    const orderData = {
      clientId: formData.clientId,
      items: formData.items,
      color: formData.color,
      design: formData.design,
      materials: formData.materials,
      orderDate: new Date(formData.orderDate).toISOString(),
      deliveryDate: new Date(formData.deliveryDate).toISOString(),
      estimatedCostUSD: Number(formData.estimatedCostUSD),
      status: formData.status
    };

    if (editingOrder && editingOrder._id) {
      await updateOrder(editingOrder._id, orderData);
    } else {
      await addOrder(orderData);
    }
    
    setIsModalOpen(false);
    setEditingOrder(null);
    setFormData({
      clientId: '', items: [], color: '', design: '', materials: '',
      orderDate: format(new Date(), 'yyyy-MM-dd'), deliveryDate: format(new Date(), 'yyyy-MM-dd'),
      estimatedCostUSD: '', status: 'pending'
    });
    setClientSearch('');
    setProductSearch('');
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      clientId: typeof order.clientId === 'string' ? order.clientId : order.clientId.id || '',
      items: order.items || [],
      color: order.color,
      design: order.design,
      materials: order.materials,
      orderDate: format(new Date(order.orderDate), 'yyyy-MM-dd'),
      deliveryDate: format(new Date(order.deliveryDate), 'yyyy-MM-dd'),
      estimatedCostUSD: order.estimatedCostUSD.toString(),
      status: order.status
    });
    setIsModalOpen(true);
  };

  const handleTransferToSale = async (order: Order) => {
    if (!order._id) return;
    
    if (confirm('¿Estás seguro de transferir este encargo a ventas?')) {
      await addSale({
        clientId: typeof order.clientId === 'string' ? order.clientId : order.clientId.id || '',
        date: new Date().toISOString(),
        items: (order.items || []).map(i => ({ productId: i.productId, quantity: i.quantity, priceUSD: i.priceUSD, name: i.name })),
        totalUSD: order.estimatedCostUSD,
        status: 'pending',
        payments: []
      });
      
      await updateOrder(order._id, { status: 'transferred_to_sale' });
    }
  };

  const getClientName = (clientId: any) => {
    const id = typeof clientId === 'string' ? clientId : clientId.id;
    return (clients || []).find(c => c.id === id)?.name || 'Desconocido';
  };

  const statusColors = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'in_progress': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'transferred_to_sale': 'bg-gray-100 text-gray-800',
  };

  const statusLabels = {
    'pending': 'Pendiente',
    'in_progress': 'En Progreso',
    'completed': 'Completado',
    'transferred_to_sale': 'Transferido a Ventas',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Encargos Especiales</h1>
        <button 
          onClick={() => {
            setEditingOrder(null);
            setFormData({
              clientId: '', itemDescription: '', color: '', design: '', materials: '',
              orderDate: format(new Date(), 'yyyy-MM-dd'), deliveryDate: format(new Date(), 'yyyy-MM-dd'),
              estimatedCostUSD: '', status: 'pending'
            });
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Encargo
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingOrder ? "Editar Encargo" : "Nuevo Encargo"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cliente</label>
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={clientSearch} 
              onChange={e => setClientSearch(e.target.value)} 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
            <select required value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
              <option value="">Seleccione un cliente</option>
              {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Productos</label>
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              value={productSearch} 
              onChange={e => setProductSearch(e.target.value)} 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
            <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
              {filteredProducts.map(p => (
                <button 
                  key={p.id} 
                  type="button"
                  onClick={() => setFormData({...formData, items: [...formData.items, { productId: p.id!, quantity: 1, priceUSD: p.priceUSD, name: p.name }]})}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  {p.name} - ${p.priceUSD}
                </button>
              ))}
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left text-xs text-gray-500">Producto</th>
                    <th className="px-2 py-1 text-left text-xs text-gray-500">Cant</th>
                    <th className="px-2 py-1 text-left text-xs text-gray-500">Precio</th>
                    <th className="px-2 py-1 text-left text-xs text-gray-500">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-2 py-1 text-sm">{item.name}</td>
                      <td className="px-2 py-1 text-sm">
                        <input type="number" value={item.quantity} onChange={e => {
                          const newItems = [...formData.items];
                          newItems[index].quantity = Number(e.target.value);
                          setFormData({...formData, items: newItems});
                        }} className="w-12 border rounded p-1" />
                      </td>
                      <td className="px-2 py-1 text-sm">${item.priceUSD}</td>
                      <td className="px-2 py-1 text-sm">
                        <button type="button" onClick={() => setFormData({...formData, items: formData.items.filter((_, i) => i !== index)})} className="text-red-600">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completado</option>
                <option value="transferred_to_sale">Transferido a Ventas</option>
              </select>
            </div>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(orders || []).map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getClientName(order.clientId)}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {(order.items || []).map((item, index) => (
                    <div key={index}>{item.name} (x{item.quantity})</div>
                  ))}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="text-xs">
                    <span className="font-semibold">Color:</span> {order.color}<br/>
                    <span className="font-semibold">Diseño:</span> {order.design}<br/>
                    <span className="font-semibold">Material:</span> {order.materials}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="text-xs">
                    <span className="font-semibold">Encargo:</span> {format(new Date(order.orderDate), 'dd/MM/yyyy')}<br/>
                    <span className="font-semibold">Entrega:</span> {format(new Date(order.deliveryDate), 'dd/MM/yyyy')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.estimatedCostUSD?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center space-x-3">
                  <button onClick={() => openEditModal(order)} className="text-blue-600 hover:text-blue-900" title="Editar Encargo">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {order.status !== 'transferred_to_sale' && (
                    <button onClick={() => handleTransferToSale(order)} className="text-indigo-600 hover:text-indigo-900 flex items-center text-xs" title="Transferir a Ventas">
                      <ArrowRight className="w-4 h-4" />
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
