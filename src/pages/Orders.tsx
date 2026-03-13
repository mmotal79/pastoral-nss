import React, { useState } from 'react';
import { useAppContext, Order } from '../context/AppContext';
import { Plus, ArrowRight, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';
import { format } from 'date-fns';

export default function Orders() {
  const { orders, clients, products, addOrder, updateOrder, addSale, currentUser } = useAppContext();
  
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
        payments: [],
        sellerId: currentUser?.id
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
      </div>
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(orders || []).map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getClientName(order.clientId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
