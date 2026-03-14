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
  const { orders, clients, products, addOrder, updateOrder, deleteOrder, addSale, addProduct, refreshData, currentUser } = useAppContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    clientId: '',
    items: [] as { productId: string; quantity: number; priceUSD: number; name: string }[],
    itemDescription: '',
    orderDate: format(new Date(), 'yyyy-MM-dd'),
    deliveryDate: format(new Date(), 'yyyy-MM-dd'),
    estimatedCostUSD: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'transferred_to_sale'
  });

  const [tempItems, setTempItems] = useState<{productId?: string; quantity: number; priceUSD: number; name: string; description?: string}[]>([]);
  const [currentItem, setCurrentItem] = useState({
    productId: '',
    name: '',
    description: '',
    quantity: '1',
    priceUSD: '',
    isNew: false
  });

  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const filteredOrders = useMemo(() => {
    return (orders || []).filter(o => {
      const client = clients.find(c => c._id === (typeof o.clientId === 'string' ? o.clientId : o.clientId?._id));
      const clientName = client?.name.toLowerCase() || '';
      const itemsDesc = (o.items || []).map(i => i.name).join(' ').toLowerCase();
      return clientName.includes(searchTerm.toLowerCase()) || itemsDesc.includes(searchTerm.toLowerCase());
    });
  }, [orders, clients, searchTerm]);

  const filteredClients = (clients || []).filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    c.phone.includes(clientSearch)
  );

  const filteredProducts = (products || []).filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const stats = useMemo(() => {
    const allOrders = orders || [];
    const total = allOrders.length;
    const totalAmount = allOrders.reduce((acc, o) => acc + o.estimatedCostUSD, 0);
    
    const pending = allOrders.filter(o => o.status === 'pending');
    const inProgress = allOrders.filter(o => o.status === 'in_progress');
    const completed = allOrders.filter(o => o.status === 'completed');
    
    return {
      total,
      totalAmount,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((acc, o) => acc + o.estimatedCostUSD, 0),
      inProgressCount: inProgress.length,
      inProgressAmount: inProgress.reduce((acc, o) => acc + o.estimatedCostUSD, 0),
      completedCount: completed.length,
      completedAmount: completed.reduce((acc, o) => acc + o.estimatedCostUSD, 0),
    };
  }, [orders]);

  const handleAddItem = () => {
    if (currentItem.isNew) {
      if (!currentItem.name || !currentItem.quantity || !currentItem.priceUSD) return;
      setTempItems([...tempItems, {
        name: currentItem.name,
        description: currentItem.description,
        quantity: Number(currentItem.quantity),
        priceUSD: Number(currentItem.priceUSD)
      }]);
    } else {
      const product = products.find(p => p.id === currentItem.productId);
      if (!product || !currentItem.quantity || !currentItem.priceUSD) return;
      setTempItems([...tempItems, {
        productId: product.id!,
        name: product.name,
        quantity: Number(currentItem.quantity),
        priceUSD: Number(currentItem.priceUSD)
      }]);
    }
    
    setCurrentItem({ productId: '', name: '', description: '', quantity: '1', priceUSD: '', isNew: false });
  };

  const handleRemoveItem = (index: number) => {
    setTempItems(tempItems.filter((_, i) => i !== index));
  };

  const calculateTotalUSD = () => {
    return tempItems.reduce((acc, item) => acc + (item.quantity * item.priceUSD), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      alert('Por favor, seleccione un cliente');
      return;
    }

    let finalItems = [...tempItems];
    if (currentItem.isNew && currentItem.name && currentItem.quantity && currentItem.priceUSD) {
      finalItems.push({
        name: currentItem.name,
        description: currentItem.description,
        quantity: Number(currentItem.quantity),
        priceUSD: Number(currentItem.priceUSD)
      });
    } else if (!currentItem.isNew && currentItem.productId && currentItem.quantity && currentItem.priceUSD) {
      const product = products.find(p => p.id === currentItem.productId);
      if (product) {
        finalItems.push({
          productId: product.id!,
          name: product.name,
          quantity: Number(currentItem.quantity),
          priceUSD: Number(currentItem.priceUSD)
        });
      }
    }

    if (finalItems.length === 0) {
      alert('Debe agregar al menos un artículo al encargo.');
      return;
    }

    const orderData = {
      clientId: formData.clientId,
      items: finalItems as any,
      orderDate: new Date(formData.orderDate).toISOString(),
      deliveryDate: new Date(formData.deliveryDate).toISOString(),
      estimatedCostUSD: calculateTotalUSD(),
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
      clientId: '', items: [],
      orderDate: format(new Date(), 'yyyy-MM-dd'), deliveryDate: format(new Date(), 'yyyy-MM-dd'),
      estimatedCostUSD: '', status: 'pending', itemDescription: ''
    });
    setTempItems([]);
    setCurrentItem({ productId: '', name: '', description: '', quantity: '1', priceUSD: '', isNew: false });
    setClientSearch('');
    setProductSearch('');
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      clientId: typeof order.clientId === 'string' ? order.clientId : (order.clientId?._id || ''),
      items: order.items || [],
      orderDate: format(parseISO(order.orderDate as string), 'yyyy-MM-dd'),
      deliveryDate: format(parseISO(order.deliveryDate as string), 'yyyy-MM-dd'),
      estimatedCostUSD: order.estimatedCostUSD.toString(),
      status: order.status,
      itemDescription: ''
    });
    setTempItems(order.items || []);
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
      // Process items: if an item is "new" (no productId), create it in inventory first
      const processedItems = [];
      for (const item of (order.items || [])) {
        if (!item.productId) {
          // Create new product
          try {
            const res = await fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: item.name,
                description: `Producto creado desde encargo.`,
                priceUSD: item.priceUSD,
                costUSD: 0, // Pending
                stock: 0 // Will be added when produced
              })
            });
            if (res.ok) {
              const newProd = await res.json();
              processedItems.push({
                productId: newProd._id,
                quantity: item.quantity,
                priceUSD: item.priceUSD,
                name: item.name
              });
            } else {
              processedItems.push({ ...item, productId: undefined });
            }
          } catch (error) {
            console.error('Error creating product from order:', error);
            processedItems.push({ ...item, productId: undefined });
          }
        } else {
          processedItems.push(item);
        }
      }

      await addSale({
        clientId: typeof order.clientId === 'string' ? order.clientId : (order.clientId?._id || ''),
        date: new Date().toISOString(),
        items: processedItems.map(i => ({ productId: i.productId!, quantity: i.quantity, priceUSD: i.priceUSD, name: i.name })),
        totalUSD: order.estimatedCostUSD,
        status: 'pending',
        payments: [],
        sellerId: currentUser?._id
      });
      
      await updateOrder(order._id, { status: 'transferred_to_sale' });
      // Refresh products to see new ones
      await refreshData();
      window.location.reload(); // Simple way to refresh all data
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Package className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase">Total Encargos</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Pedidos totales</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-indigo-600">${stats.totalAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-400">Valor total</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase">Pendientes</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingCount}</p>
              <p className="text-sm text-gray-500">Por iniciar</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-yellow-600">${stats.pendingAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-400">En espera</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase">En Progreso</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgressCount}</p>
              <p className="text-sm text-gray-500">En producción</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-600">${stats.inProgressAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-400">En curso</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase">Completados</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completedCount}</p>
              <p className="text-sm text-gray-500">Listos/Entregados</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">${stats.completedAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-400">Venta realizada</p>
            </div>
          </div>
        </div>
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
          <div className="grid grid-cols-2 gap-4">
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

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Artículos del Encargo</h3>
              <button
                type="button"
                onClick={() => setCurrentItem({ ...currentItem, isNew: !currentItem.isNew })}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {currentItem.isNew ? 'Seleccionar del Catálogo' : 'Crear Artículo Nuevo'}
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg space-y-3">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-5">
                  <label className="block text-xs font-medium text-gray-700">Producto</label>
                  {currentItem.isNew ? (
                    <input
                      type="text"
                      placeholder="Nombre del nuevo artículo"
                      value={currentItem.name}
                      onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border"
                    />
                  ) : (
                    <select
                      value={currentItem.productId}
                      onChange={(e) => {
                        const p = products.find(prod => prod.id === e.target.value);
                        setCurrentItem({
                          ...currentItem,
                          productId: e.target.value,
                          priceUSD: p ? p.priceUSD.toString() : ''
                        });
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border"
                    >
                      <option value="">Seleccione...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-xs font-medium text-gray-700">Cant.</label>
                  <input
                    type="number"
                    min="1"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-xs font-medium text-gray-700">Precio ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentItem.priceUSD}
                    onChange={(e) => setCurrentItem({ ...currentItem, priceUSD: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border"
                  />
                </div>
                <div className="col-span-12 sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {currentItem.isNew && (
                <div>
                  <label className="block text-xs font-medium text-gray-700">Descripción / Características</label>
                  <textarea
                    value={currentItem.description}
                    onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border"
                    rows={2}
                    placeholder="Detalles específicos del nuevo producto..."
                  />
                </div>
              )}
            </div>

            {tempItems.length > 0 && (
              <div className="mt-3 border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Artículo</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Cant.</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Precio</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tempItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-xs text-gray-900">
                          {item.name}
                          {!item.productId && <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded">Nuevo</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 text-right">${item.priceUSD.toFixed(2)}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 text-right font-medium">${(item.quantity * item.priceUSD).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-2 text-right">
              <span className="text-sm font-bold text-gray-900">Total Estimado: </span>
              <span className="text-lg font-bold text-indigo-600">${calculateTotalUSD().toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pedido</label>
              <input
                type="date"
                required
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Entrega</label>
              <input
                type="date"
                required
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {editingOrder ? 'Actualizar Encargo' : 'Guardar Encargo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
