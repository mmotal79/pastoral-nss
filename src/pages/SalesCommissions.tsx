import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const SalesCommissions = () => {
  const { sales, users, currentUser, isAdmin, isManager } = useAppContext();
  const [commissions, setCommissions] = useState<any[]>([]);

  useEffect(() => {
    if (sales.length > 0 && users.length > 0) {
      // Logic to calculate commissions
      const calculatedCommissions = sales.map(sale => {
        const seller = users.find(u => u._id === (sale as any).sellerId);
        const commissionPercentage = seller?.commissionPercentage || 0;
        const commission = (sale.totalUSD * commissionPercentage) / 100;
        return {
          ...sale,
          sellerName: seller?.name || 'Desconocido',
          commission,
          status: 'pendiente' // Default status
        };
      });
      setCommissions(calculatedCommissions);
    }
  }, [sales, users]);

  if (!isAdmin && !isManager && !currentUser) return <div>No autorizado</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Comisiones de Ventas</h1>
      {/* Resumen superior */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">Total Ventas: $...</div>
        <div className="bg-white p-4 rounded-lg shadow">Total Comisiones: $...</div>
        <div className="bg-white p-4 rounded-lg shadow">Total Pagado: $...</div>
      </div>
      {/* Tabla detalle */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2">Vendedor</th>
              <th className="py-2">Venta</th>
              <th className="py-2">Comisión</th>
              <th className="py-2">Estatus</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c, i) => (
              <tr key={i}>
                <td className="py-2">{c.sellerName}</td>
                <td className="py-2">${c.totalUSD}</td>
                <td className="py-2">${c.commission.toFixed(2)}</td>
                <td className="py-2">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesCommissions;
