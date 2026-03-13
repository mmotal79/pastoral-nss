import React, { useState, useRef } from 'react';
import { useAppContext, Product } from '../context/AppContext';
import { Plus, Image as ImageIcon, Edit2, PlusCircle, MinusCircle, Upload, Share2 } from 'lucide-react';
import Modal from '../components/Modal';
import { compressImage } from '../utils/imageUtils';

export default function Inventory() {
  const { products, addProduct, updateProduct, settings } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleShareToSocial = async (product: Product) => {
    const corporatePhone = settings?.corporatePhone?.replace(/\D/g, '') || '';
    const socialText = product.socialDescription || product.description || `¡Mira nuestro nuevo producto: ${product.name}!`;
    
    // Create the WhatsApp link
    let waMessage = `Hola, quisiera información sobre ${product.name}`;
    const waLink = `https://wa.me/${corporatePhone}?text=${encodeURIComponent(waMessage)}`;
    
    const fullText = `${socialText}\n\n🛒 Cómpralo aquí: ${waLink}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: fullText,
          url: waLink
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(fullText);
        alert('¡Texto copiado al portapapeles! Ahora puedes pegarlo en Instagram o Facebook.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(fullText);
      alert('¡Texto copiado al portapapeles!');
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    costUSD: '',
    priceUSD: '',
    stock: '',
    imageUrl: '',
    socialDescription: ''
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const base64Image = await compressImage(file, 800, 800, 0.7);
      setFormData(prev => ({ ...prev, imageUrl: base64Image }));
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Error al procesar la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      name: formData.name,
      description: formData.description,
      costUSD: Number(formData.costUSD),
      priceUSD: Number(formData.priceUSD),
      stock: Number(formData.stock),
      imageUrl: formData.imageUrl,
      socialDescription: formData.socialDescription
    };

    if (editingProduct && editingProduct._id) {
      await updateProduct(editingProduct._id, productData);
    } else {
      await addProduct(productData);
    }
    
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ name: '', description: '', costUSD: '', priceUSD: '', stock: '', imageUrl: '' });
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      costUSD: product.costUSD.toString(),
      priceUSD: product.priceUSD.toString(),
      stock: product.stock.toString(),
      imageUrl: product.imageUrl || '',
      socialDescription: product.socialDescription || ''
    });
    setIsModalOpen(true);
  };

  const handleStockChange = async (product: Product, change: number) => {
    if (!product._id) return;
    const newStock = Math.max(0, product.stock + change);
    await updateProduct(product._id, { stock: newStock });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: '', description: '', costUSD: '', priceUSD: '', stock: '', imageUrl: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Artículo
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Editar Artículo" : "Nuevo Artículo"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción para Redes Sociales (Instagram/Facebook)</label>
            <textarea 
              value={formData.socialDescription} 
              onChange={e => setFormData({...formData, socialDescription: e.target.value})} 
              placeholder="Escribe aquí lo que se compartirá en redes..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-indigo-50" 
            />
            <p className="mt-1 text-xs text-indigo-600 font-medium">Este campo es exclusivo para generar el texto de tus publicaciones.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Costo (USD)</label>
              <input type="number" step="0.01" required value={formData.costUSD} onChange={e => setFormData({...formData, costUSD: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Precio (USD)</label>
              <input type="number" step="0.01" required value={formData.priceUSD} onChange={e => setFormData({...formData, priceUSD: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Stock Inicial</label>
            <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Imagen del Producto</label>
            <div className="flex items-center space-x-4">
              {formData.imageUrl ? (
                <div className="relative">
                  <img src={formData.imageUrl} alt="Preview" className="h-20 w-20 object-cover rounded-md border" />
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, imageUrl: ''})}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 bg-gray-100 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Procesando...' : 'Cargar Imagen'}
                </button>
                <p className="mt-1 text-xs text-gray-500">O ingresa una URL directamente:</p>
                <input type="url" placeholder="https://..." value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
            </div>
          </div>
          <div className="pt-4 flex justify-end space-x-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isUploading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">Guardar</button>
          </div>
        </form>
      </Modal>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imagen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo (USD)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio (USD)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{product.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.costUSD?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.priceUSD?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">{product.stock}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center space-x-2">
                  <button onClick={() => openEditModal(product)} className="text-blue-600 hover:text-blue-900" title="Editar Artículo">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleStockChange(product, 1)} className="text-green-600 hover:text-green-900" title="Aumentar Stock">
                    <PlusCircle className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleStockChange(product, -1)} className="text-red-600 hover:text-red-900" title="Disminuir Stock">
                    <MinusCircle className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleShareToSocial(product)} className="text-indigo-600 hover:text-indigo-900" title="Compartir en Redes Sociales">
                    <Share2 className="w-4 h-4" />
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
