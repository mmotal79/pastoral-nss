import { useAppContext } from '../context/AppContext';
import { Plus, ArrowRight } from 'lucide-react';

export default function Orders() {
  const { orders, clients } = useAppContext();

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
        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Encargo
        </button>
      </div>

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
