import React, { useState, useMemo } from 'react';
import { useAppContext, Order } from '../context/AppContext';
import { 
  Plus, 
  ArrowRight, 
  Edit2, 
  Trash2, 
  Search, 
  Calendar, 
  Package, 
  User as UserIcon,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import Modal from '../components/Modal';
import { format, parseISO } from 'date-fns';

export default function Orders() {
  const { orders, clients, products, addOrder, updateOrder, deleteOrder, addSale, currentUser } = useAppContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    clientId: '',
    items: [] as { productId: string; quantity: number; priceUSD: number; name: string }[],
    itemDescription: '',
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

  const filteredOrders = useMemo(() => {
    return (orders || []).filter(o => {
      const client = clients.find(c => c._id === (typeof o.clientId === 'string' ? o.clientId : o.clientId?._id));
      const clientName = client?.name.toLowerCase() || '';
      const desc = o.itemDescription?.toLowerCase() || '';
      return clientName.includes(searchTerm.toLowerCase()) || desc.includes(searchTerm.toLowerCase());
    });
  }, [orders, clients, searchTerm]);

  const filteredClients = (clients || []).filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    c.phone.includes(clientSearch)
  );

  const filteredProducts = (products || []).filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      alert('Por favor, seleccione un cliente');
      return;
    }
    const orderData = {
      clientId: formData.clientId,
      items: formData.items,
      itemDescription: formData.itemDescription,
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
    
    closeModal();
  };

  const closeModal = () => {
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
      clientId: typeof order.clientId === 'string' ? order.clientId : (order.clientId?._id || ''),
      items: order.items || [],
      color: order.color || '',
      design: order.design || '',
      materials: order.materials || '',
      orderDate: format(parseISO(order.orderDate as string), 'yyyy-MM-dd'),
      deliveryDate: format(parseISO(order.deliveryDate as string), 'yyyy-MM-dd'),
      estimatedCostUSD: order.estimatedCostUSD.toString(),
      status: order.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este encargo?')) {
      await deleteOrder(id);
    }
  };

  const handleTransferToSale = async (order: Order) => {
    if (!order._id) return;
    
    if (window.confirm('¿Estás seguro de transferir este encargo a ventas?')) {
      await addSale({
        clientId: typeof order.clientId === 'string' ? order.clientId : (order.clientId?._id || ''),
        date: new Date().toISOString(),
        items: (order.items || []).map(i => ({ productId: i.productId, quantity: i.quantity, priceUSD: i.priceUSD, name: i.name })),
        totalUSD: order.estimatedCostUSD,
        status: 'pending',
        payments: [],
        sellerId: currentUser?._id
      });
      
      await updateOrder(order._id, { status: 'transferred_to_sale' });
    }
  };

  const getClientName = (clientId: any) => {
    const id = typeof clientId === 'string' ? clientId : (clientId?._id || clientId?.id);
    return (clients || []).find(c => c._id === id || c.id === id)?.name || 'Desconocido';
  };

  const statusConfig = {
    'pending': { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    'in_progress': { label: 'En Progreso', color: 'bg-blue-100 text-blue-800', icon: Package },
    'completed': { label: 'Completado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    'transferred_to_sale': { label: 'Transferido', color: 'bg-gray-100 text-gray-800', icon: ArrowRight },
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Encargos Especiales</h1>
          <p className="text-gray-500">Gestión de pedidos personalizados y trabajos a medida</p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Encargo</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción / Detalles</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha Entrega</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Costo Est.</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estatus</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const config = statusConfig[order.status as keyof typeof statusConfig];
                  const StatusIcon = config.icon;
                  
                  return (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                            <UserIcon className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="text-sm font-medium text-gray-900">{getClientName(order.clientId)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">
                          {order.items?.length > 0 
                            ? order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
                            : 'Sin artículos'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {order.color && <span className="mr-2">Color: {order.color}</span>}
                          {order.design && <span className="mr-2">Diseño: {order.design}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {format(parseISO(order.deliveryDate as string), 'dd/MM/yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">${order.estimatedCostUSD.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {order.status !== 'transferred_to_sale' && (
                            <button
                              onClick={() => handleTransferToSale(order)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Transferir a Venta"
                            >
                              <ArrowRight className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(order)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(order._id!)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No se encontraron encargos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingOrder ? 'Editar Encargo' : 'Nuevo Encargo'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {clientSearch && filteredClients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredClients.map(client => (
                    <button
                      key={client._id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, clientId: client._id! });
                        setClientSearch(client.name);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      {client.name} ({client.phone})
                    </button>
                  ))}
                </div>
              )}
            </div>
            {formData.clientId && (
              <p className="mt-1 text-xs text-indigo-600 font-medium">
                Seleccionado: {clients.find(c => c._id === formData.clientId)?.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del Encargo</label>
            <textarea
              required
              value={formData.itemDescription}
              onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              rows={3}
              placeholder="Ej: 50 Camisetas con logo bordado..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej: Azul Marino"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diseño / Logo</label>
              <input
                type="text"
                value={formData.design}
                onChange={(e) => setFormData({ ...formData, design: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej: Logo Pecho Izquierdo"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Materiales Sugeridos</label>
            <input
              type="text"
              value={formData.materials}
              onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ej: Algodón 100%, Hilo Poliéster"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pedido</label>
              <input
                type="date"
                required
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Entrega</label>
              <input
                type="date"
                required
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo Estimado (USD)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.estimatedCostUSD}
                onChange={(e) => setFormData({ ...formData, estimatedCostUSD: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estatus</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="pending">Pendiente</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completado</option>
                <option value="transferred_to_sale">Transferido a Ventas</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {editingOrder ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
