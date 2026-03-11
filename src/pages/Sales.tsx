import React, { useState, useRef, useMemo } from 'react';
import { useAppContext, Sale, Client } from '../context/AppContext';
import { Plus, MessageCircle, Receipt, DollarSign, Download, X, Search, Filter } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import Modal from '../components/Modal';

export default function Sales() {
  const { sales, clients, products, addSale, updateSale } = useAppContext();
  const [selectedTicket, setSelectedTicket] = useState<Sale | null>(null);
  const [paymentModalSale, setPaymentModalSale] = useState<Sale | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  // New Sale Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  
  const [tempItems, setTempItems] = useState<{productId: string, name: string, quantity: number, priceUSD: number}[]>([]);
  const [currentItem, setCurrentItem] = useState({
    productId: '',
    quantity: '1',
    priceUSD: ''
  });

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setCurrentItem({
      ...currentItem,
      productId,
      priceUSD: product ? product.priceUSD.toString() : ''
    });
  };

  const handleAddItem = () => {
    const product = products.find(p => p.id === currentItem.productId);
    if (!product || !currentItem.quantity || !currentItem.priceUSD) return;
    
    setTempItems([...tempItems, {
      productId: product.id!,
      name: product.name,
      quantity: Number(currentItem.quantity),
      priceUSD: Number(currentItem.priceUSD)
    }]);
    
    setCurrentItem({ productId: '', quantity: '1', priceUSD: '' });
  };

  const handleRemoveItem = (index: number) => {
    setTempItems(tempItems.filter((_, i) => i !== index));
  };

  const calculateTotalUSD = () => {
    return tempItems.reduce((acc, item) => acc + (item.quantity * item.priceUSD), 0);
  };

  const handleNewSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalItems = [...tempItems];
    
    // Si el usuario seleccionó un producto pero olvidó darle al botón "+", lo añadimos automáticamente
    if (currentItem.productId && currentItem.quantity && currentItem.priceUSD) {
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
      alert('Debe agregar al menos un artículo a la venta.');
      return;
    }
    
    const totalUSD = finalItems.reduce((acc, item) => acc + (item.quantity * item.priceUSD), 0);

    await addSale({
      clientId: formData.clientId,
      date: new Date(formData.date).toISOString(),
      items: finalItems.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        priceUSD: item.priceUSD
      })),
      totalUSD: totalUSD,
      status: 'pending',
      payments: []
    });
    setIsModalOpen(false);
    setFormData({ clientId: '', date: format(new Date(), 'yyyy-MM-dd') });
    setTempItems([]);
    setCurrentItem({ productId: '', quantity: '1', priceUSD: '' });
  };

  // Filters state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  // Payment modal state
  const [paymentMethod, setPaymentMethod] = useState('cash_usd');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [bankSender, setBankSender] = useState('');
  const [bankReceiver, setBankReceiver] = useState('');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [phoneSender, setPhoneSender] = useState('');
  const [overpaymentAction, setOverpaymentAction] = useState('change'); // 'change' or 'credit'

  const handlePaymentSubmit = async () => {
    if (!paymentModalSale || !paymentModalSale._id) return;

    const amountUSD = Number(paymentAmount);
    if (isNaN(amountUSD) || amountUSD <= 0) {
      alert('Ingrese un monto válido');
      return;
    }

    const debt = paymentModalSale.totalUSD - calculatePaid(paymentModalSale);
    let changeUSD = 0;
    let savedCreditUSD = 0;

    if (amountUSD > debt) {
      if (overpaymentAction === 'change') {
        changeUSD = amountUSD - debt;
      } else {
        savedCreditUSD = amountUSD - debt;
      }
    }

    const newPayment: any = {
      date: new Date(paymentDate).toISOString(),
      amountUSD: Math.min(amountUSD, debt), // Only record up to the debt amount as paid for this sale
      amountVED: paymentMethod === 'cash_ved' || paymentMethod === 'mobile_payment' || paymentMethod === 'transfer' ? amountUSD * Number(exchangeRate) : 0,
      exchangeRate: Number(exchangeRate) || 1,
      method: paymentMethod,
      changeUSD,
      savedCreditUSD
    };

    if (paymentMethod === 'mobile_payment' || paymentMethod === 'transfer') {
      newPayment.bankSender = bankSender;
      newPayment.bankReceiver = bankReceiver;
      newPayment.reference = reference;
      if (paymentMethod === 'mobile_payment') {
        newPayment.phoneSender = phoneSender;
      }
    }

    const updatedPayments = [...paymentModalSale.payments, newPayment];
    const newPaidTotal = updatedPayments.reduce((acc, p) => acc + p.amountUSD, 0);
    const newStatus = newPaidTotal >= paymentModalSale.totalUSD ? 'paid' : 'pending';

    await updateSale(paymentModalSale._id, {
      payments: updatedPayments,
      status: newStatus
    });

    setPaymentModalSale(null);
    // Reset payment form
    setPaymentAmount('');
    setExchangeRate('');
    setBankSender('');
    setBankReceiver('');
    setReference('');
    setPhoneSender('');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const getClient = (clientId: string | Client) => {
    if (!clientId) return undefined;
    if (typeof clientId === 'object') {
      const id = clientId._id || clientId.id;
      return clients.find(c => c.id === id || c._id === id) || clientId;
    }
    return clients.find(c => c.id === clientId || c._id === clientId);
  };

  const calculatePaid = (sale: Sale) => {
    return sale.payments.reduce((acc, p) => acc + p.amountUSD, 0);
  };

  const handleWhatsAppReminder = (sale: Sale) => {
    const client = getClient(sale.clientId);
    if (!client?.phone) {
      alert('El cliente no tiene número de teléfono registrado.');
      return;
    }
    const debt = sale.totalUSD - calculatePaid(sale);
    const paymentLink = "https://tu-enlace-de-pago.com"; // Reemplazar con el enlace real
    const message = `Hola ${client.name}, te recordamos amablemente que tienes un saldo pendiente de $${debt.toFixed(2)} por tus compras en Pastoral de Pequeñas Comunidades NSS. Puedes realizar tu pago a través del siguiente enlace: ${paymentLink} ¡Gracias!`;
    const whatsappUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDownloadTicket = async () => {
    if (ticketRef.current && selectedTicket) {
      try {
        const canvas = await html2canvas(ticketRef.current);
        const imgData = canvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.href = imgData;
        const ticketId = selectedTicket.id || selectedTicket._id || 'ticket';
        link.download = `Factura_${ticketId}_${format(new Date(), 'yyyyMMdd')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error generating image:', error);
        alert('Hubo un error al generar la imagen del ticket.');
      }
    }
  };

  const handleSendWhatsAppTicket = (sale: Sale) => {
    const client = getClient(sale.clientId);
    if (!client?.phone) {
      alert('El cliente no tiene número de teléfono registrado.');
      return;
    }
    
    const currentTicketId = selectedTicket?.id || selectedTicket?._id;
    const saleId = sale.id || sale._id;
    
    // Si el ticket no está seleccionado (abierto en el modal), lo seleccionamos para que se renderice
    if (currentTicketId !== saleId) {
      setSelectedTicket(sale);
    }
    
    // Abrimos la ventana de WhatsApp antes del await para evitar el bloqueador de popups
    const newWindow = window.open('', '_blank');
    
    // Esperamos a que el modal se renderice para poder capturar el canvas
    setTimeout(async () => {
      if (ticketRef.current) {
        try {
          const canvas = await html2canvas(ticketRef.current);
          const imgData = canvas.toDataURL('image/png');
          
          const link = document.createElement('a');
          link.href = imgData;
          const ticketId = sale.id || sale._id || 'ticket';
          link.download = `Factura_${ticketId}_${format(new Date(), 'yyyyMMdd')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (error) {
          console.error('Error generating image:', error);
          alert('Hubo un error al generar la imagen del ticket.');
        }
      } else {
        alert('No se pudo encontrar el ticket para generar la imagen.');
      }
      
      const message = `Hola ${client.name}, adjunto el recibo de tu pago/compra en Pastoral de Pequeñas Comunidades NSS. (Por favor, adjunta la imagen que se acaba de descargar en este chat).`;
      const whatsappUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      if (newWindow) {
        newWindow.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl; // Fallback si el popup fue bloqueado
      }
    }, 300);
  };

  const getPaymentMethodLabel = (method: string) => {
    switch(method) {
      case 'cash_usd': return 'Efectivo (USD)';
      case 'cash_ved': return 'Efectivo (Bs)';
      case 'transfer': return 'Transferencia';
      case 'mobile_payment': return 'Pago Móvil';
      default: return method;
    }
  };

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      let match = true;
      if (dateFrom) {
        if (new Date(sale.date) < startOfDay(parseISO(dateFrom))) match = false;
      }
      if (dateTo) {
        if (new Date(sale.date) > endOfDay(parseISO(dateTo))) match = false;
      }
      if (filterClient && sale.clientId !== filterClient) match = false;
      if (filterStatus && sale.status !== filterStatus) match = false;
      if (filterProduct) {
        const hasProduct = sale.items.some(item => item.name.toLowerCase().includes(filterProduct.toLowerCase()));
        if (!hasProduct) match = false;
      }
      return match;
    });
  }, [sales, dateFrom, dateTo, filterClient, filterStatus, filterProduct]);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Ventas y Cuentas por Cobrar</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Venta
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Venta">
        <form onSubmit={handleNewSaleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Cliente</label>
              <select required value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                <option value="">Seleccione un cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Agregar Artículo</h3>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <label className="block text-xs font-medium text-gray-700">Producto</label>
                <select value={currentItem.productId} onChange={e => handleProductChange(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="">Seleccione...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-700">Cant.</label>
                <input type="number" min="1" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-700">Precio ($)</label>
                <input type="number" step="0.01" value={currentItem.priceUSD} onChange={e => setCurrentItem({...currentItem, priceUSD: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div className="col-span-1 pb-1">
                <button type="button" onClick={handleAddItem} disabled={!currentItem.productId} className="p-2 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 disabled:opacity-50">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {tempItems.length > 0 && (
            <div className="mt-4 border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Cant.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Precio</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tempItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 text-right">${item.priceUSD.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">${(item.quantity * item.priceUSD).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">
                        <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-gray-900">Total:</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-indigo-600">${calculateTotalUSD().toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-2 border-t border-gray-200 mt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={(tempItems.length === 0 && !currentItem.productId) || !formData.clientId} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">Procesar Venta</button>
          </div>
        </form>
      </Modal>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div className="flex items-center text-gray-700 font-medium mb-2">
          <Filter className="w-5 h-5 mr-2" />
          Filtros de Búsqueda
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cliente</label>
            <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border">
              <option value="">Todos los clientes</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Estado</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border">
              <option value="">Todos</option>
              <option value="paid">Pagados</option>
              <option value="pending">Cuentas por Cobrar</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Producto (Nombre)</label>
            <div className="relative">
              <input type="text" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} placeholder="Buscar..." className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border pl-8" />
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (USD)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagado (USD)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deuda (USD)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSales.map((sale) => {
              const paid = calculatePaid(sale);
              const debt = sale.totalUSD - paid;
              const client = getClient(sale.clientId);
              
              return (
                <tr key={sale.id || sale._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTicket(sale)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(sale.date), 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {client?.name || 'Desconocido'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">${sale.totalUSD.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">${paid.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">${debt.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sale.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {sale.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center space-x-3" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => setSelectedTicket(sale)}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center"
                      title="Ver Ticket / Factura"
                    >
                      <Receipt className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleSendWhatsAppTicket(sale)}
                      className="text-green-600 hover:text-green-900 flex items-center bg-green-50 hover:bg-green-100 px-2 py-1 rounded-md border border-green-200 transition-colors"
                      title="Enviar Ticket por WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">Enviar Ticket</span>
                    </button>
                    {sale.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => setPaymentModalSale(sale)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                          title="Abonar Pago"
                        >
                          <DollarSign className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleWhatsAppReminder(sale)}
                          className="text-green-700 hover:text-green-900 flex items-center bg-green-50 hover:bg-green-100 px-2 py-1 rounded-md border border-green-200 transition-colors"
                          title="Recordar pago por WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          <span className="text-xs font-medium">Recordar Pago</span>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No se encontraron ventas con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Registrar Pago */}
      {paymentModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Registrar Abono</h2>
              <button onClick={() => setPaymentModalSale(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
                Deuda actual: <strong>${(paymentModalSale.totalUSD - calculatePaid(paymentModalSale)).toFixed(2)}</strong>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                >
                  <option value="cash_usd">Efectivo (USD)</option>
                  <option value="cash_ved">Efectivo (Bs)</option>
                  <option value="mobile_payment">Pago Móvil (Bs)</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monto Recibido</label>
                  <input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Ej. 20" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tasa de Cambio (Bs/USD)</label>
                  <input type="number" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} placeholder="Ej. 36.5" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
              </div>

              {/* Dynamic Fields for Mobile Payment / Transfer */}
              {(paymentMethod === 'mobile_payment' || paymentMethod === 'transfer') && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Banco Emisor</label>
                    <input type="text" value={bankSender} onChange={e => setBankSender(e.target.value)} placeholder="Ej. Banesco" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Banco Receptor</label>
                    <input type="text" value={bankReceiver} onChange={e => setBankReceiver(e.target.value)} placeholder="Ej. Mercantil" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Referencia</label>
                    <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="Últimos 4-6 dígitos" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Fecha de Pago</label>
                    <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  </div>
                  {paymentMethod === 'mobile_payment' && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700">Teléfono Emisor (Opcional)</label>
                      <input type="text" value={phoneSender} onChange={e => setPhoneSender(e.target.value)} placeholder="0414-1234567" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Si el monto supera la deuda:</p>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center text-sm">
                    <input type="radio" name="overpayment" checked={overpaymentAction === 'change'} onChange={() => setOverpaymentAction('change')} className="mr-2" />
                    Entregar Vuelto
                  </label>
                  <label className="flex items-center text-sm">
                    <input type="radio" name="overpayment" checked={overpaymentAction === 'credit'} onChange={() => setOverpaymentAction('credit')} className="mr-2" />
                    Guardar a Favor
                  </label>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t flex justify-end space-x-3">
              <button 
                onClick={() => setPaymentModalSale(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handlePaymentSubmit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Procesar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ticket / Factura */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Contenedor del Ticket para html2canvas */}
            <div className="overflow-y-auto">
              <div className="p-6 font-mono text-sm bg-white" ref={ticketRef}>
                <div className="text-center mb-6">
                <h2 className="text-xl font-bold">PASTORAL DE PEQUEÑAS COMUNIDADES NSS</h2>
                <p className="text-gray-500">Ticket de Venta #{(selectedTicket.id || selectedTicket._id || '').padStart(5, '0')}</p>
                <p className="text-gray-500">{format(new Date(selectedTicket.date), 'dd/MM/yyyy HH:mm')}</p>
              </div>
              
              <div className="mb-4 border-b border-dashed border-gray-300 pb-4">
                <p><strong>Cliente:</strong> {getClient(selectedTicket.clientId)?.name}</p>
                <p><strong>Teléfono:</strong> {getClient(selectedTicket.clientId)?.phone}</p>
              </div>

              <div className="mb-4 border-b border-dashed border-gray-300 pb-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-left">
                      <th>Cant</th>
                      <th>Artículo</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTicket.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.quantity}</td>
                        <td>{item.name}</td>
                        <td className="text-right">${(item.quantity * (item.priceUSD || item.price || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-4 border-b border-dashed border-gray-300 pb-4 text-right">
                <p className="text-lg font-bold">TOTAL: ${selectedTicket.totalUSD.toFixed(2)}</p>
              </div>

              <div className="mb-4">
                <h3 className="font-bold mb-2">Historial de Pagos (Abonos):</h3>
                {selectedTicket.payments.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedTicket.payments.map(p => (
                      <li key={p.id} className="text-xs bg-gray-50 p-2 rounded">
                        <div className="flex justify-between">
                          <span>{format(new Date(p.date), 'dd/MM/yy')}</span>
                          <span className="font-bold text-green-600">+${p.amountUSD.toFixed(2)}</span>
                        </div>
                        <div className="text-gray-500 flex justify-between mt-1">
                          <span>{getPaymentMethodLabel(p.method)} {p.bank ? `(${p.bank})` : ''}</span>
                          {p.amountVED > 0 && <span>Bs. {p.amountVED.toFixed(2)} (Tasa: {p.exchangeRate})</span>}
                        </div>
                        {(p.changeUSD || p.savedCreditUSD) ? (
                          <div className="text-blue-600 mt-1">
                            {p.changeUSD ? `Vuelto: $${p.changeUSD.toFixed(2)}` : ''}
                            {p.savedCreditUSD ? `Abono a favor: $${p.savedCreditUSD.toFixed(2)}` : ''}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No hay pagos registrados.</p>
                )}
              </div>

              <div className="text-right text-lg">
                <p>Pagado: <span className="text-green-600">${calculatePaid(selectedTicket).toFixed(2)}</span></p>
                <p className="font-bold">DEUDA: <span className="text-red-600">${Math.max(0, selectedTicket.totalUSD - calculatePaid(selectedTicket)).toFixed(2)}</span></p>
              </div>
              
              <div className="mt-8 text-center text-gray-500 text-xs">
                <p>¡Gracias por su compra!</p>
              </div>
            </div>
            </div>
            
            <div className="bg-gray-50 p-4 border-t flex flex-col space-y-2">
              <div className="flex justify-between items-center space-x-2">
                <button 
                  onClick={handleDownloadTicket}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PNG
                </button>
                <button 
                  onClick={() => handleSendWhatsAppTicket(selectedTicket!)}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar por WA
                </button>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
