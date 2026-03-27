import React, { useState, useRef } from 'react';
import { useAppContext, Product } from '../context/AppContext';
import { Plus, Image as ImageIcon, Edit2, PlusCircle, MinusCircle, Upload, Share2, X } from 'lucide-react';
import Modal from '../components/Modal';
import { compressImage } from '../utils/imageUtils';

export default function Inventory() {
  const { products, addProduct, updateProduct, settings, isSeller } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedProductImage, setSelectedProductImage] = useState<Product | null>(null);

  const handleShareToSocial = async (product: Product) => {
    const corporatePhone = settings?.corporatePhone?.replace(/\D/g, '') || '';
    const socialText = product.socialDescription || product.description || `¡Mira nuestro nuevo producto: ${product.name}!`;
    
    // 1. Prepare the base WhatsApp link
    const waMessage = `Hola, quisiera información sobre ${product.name}`;
    const waLink = `https://wa.me/${corporatePhone}?text=${encodeURIComponent(waMessage)}`;
    
    try {
      // 2. Mandatory Shortening with Bitly
      let finalLink = waLink;
      
      // Show a temporary feedback or just wait for the promise
      console.log('Iniciando acortamiento de URL...');
      
      try {
        const shortenRes = await fetch('/api/utils/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ longUrl: waLink })
        });
        
        if (shortenRes.ok) {
          const data = await shortenRes.json();
          // Verify if it's actually a shortened link
          if (data.link && (data.link.includes('bit.ly') || data.link.includes('bitly'))) {
            finalLink = data.link;
            console.log('URL acortada con éxito:', finalLink);
          } else if (data.warning) {
            console.warn('Advertencia de Bitly:', data.warning);
          }
        } else {
          console.error('Error en la respuesta del servidor de acortamiento');
        }
      } catch (err) {
        console.error('Error crítico al contactar el servicio de Bitly:', err);
      }

      const fullTextWithLink = `${socialText}\n\n🛒 Cómpralo aquí: ${finalLink}`;
      
      // 3. Copy to clipboard (Always, for Instagram/Manual paste)
      try {
        await navigator.clipboard.writeText(fullTextWithLink);
      } catch (err) {
        console.error('Error al copiar al portapapeles:', err);
      }

      // 4. Prepare Share Data
      const shareData: any = {
        title: product.name,
        text: socialText, // Base text
      };

      // 5. Handle Image/File
      let isFileShared = false;
      if (product.imageUrl && product.imageUrl.startsWith('data:image')) {
        try {
          const response = await fetch(product.imageUrl);
          const blob = await response.blob();
          const file = new File([blob], `${product.name.replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            shareData.files = [file];
            // When sharing files, we MUST include the link in the text
            shareData.text = fullTextWithLink;
            isFileShared = true;
          }
        } catch (err) {
          console.error('Error preparando imagen:', err);
        }
      }

      // 6. If no file, use URL field for Action Button (Facebook)
      if (!isFileShared) {
        shareData.url = finalLink;
      }

      // 7. Execute Share
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        if (isFileShared) {
          setTimeout(() => {
            alert('¡Publicidad lista! Si la aplicación no cargó el texto, ya está en tu portapapeles con el link de Bitly. Solo dale a "Pegar".');
          }, 500);
        }
      } else {
        alert('¡Listo! El texto publicitario y el enlace corto de Bitly han sido copiados al portapapeles.\n\nYa puedes pegarlos en Facebook o Instagram.');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Error al compartir:', error);
      alert('Se copió el texto al portapapeles. Asegúrate de tener configurado el BITLY_TOKEN en los ajustes.');
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
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
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
      setFormData({ name: '', description: '', costUSD: '', priceUSD: '', stock: '', imageUrl: '', socialDescription: '' });
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setIsSubmitting(false);
    }
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
        {!isSeller && (
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
        )}
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
            {!isSeller && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Costo (USD)</label>
                <input type="number" step="0.01" required value={formData.costUSD} onChange={e => setFormData({...formData, costUSD: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
            )}
            <div className={isSeller ? "col-span-2" : ""}>
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
            <button type="submit" disabled={isUploading || isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción RRSS</th>
              {!isSeller && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo (USD)</th>}
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
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="h-10 w-10 rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                      onClick={() => setSelectedProductImage(product)}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{product.description}</td>
                <td className="px-6 py-4 text-sm">
                  {product.socialDescription ? (
                    <div className="flex items-center text-green-600">
                      <span className="mr-1">✅</span>
                      <span className="truncate max-w-[150px]" title={product.socialDescription}>{product.socialDescription}</span>
                    </div>
                  ) : (
                    <span className="text-red-400 italic">❌ Sin descripción</span>
                  )}
                </td>
                {!isSeller && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.costUSD?.toFixed(2) || '0.00'}</td>}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.priceUSD?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">{product.stock}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center space-x-2">
                  {!isSeller && (
                    <>
                      <button onClick={() => openEditModal(product)} className="text-blue-600 hover:text-blue-900" title="Editar Artículo">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleStockChange(product, 1)} className="text-green-600 hover:text-green-900" title="Aumentar Stock">
                        <PlusCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleStockChange(product, -1)} className="text-red-600 hover:text-red-900" title="Disminuir Stock">
                        <MinusCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button onClick={() => handleShareToSocial(product)} className="text-indigo-600 hover:text-indigo-900" title="Compartir en Redes Sociales">
                    <Share2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Imagen Ampliada */}
      {selectedProductImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[60] flex flex-col items-center justify-between p-6 sm:p-12"
          onClick={() => setSelectedProductImage(null)}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setSelectedProductImage(null)}
          autoFocus
        >
          <button 
            onClick={() => setSelectedProductImage(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full z-[70]"
          >
            <X className="w-8 h-8" />
          </button>
          
          <div 
            className="flex-1 w-full flex items-center justify-center min-h-0"
            onClick={e => e.stopPropagation()}
          >
            <img 
              src={selectedProductImage.imageUrl} 
              alt={selectedProductImage.name} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
          
          <div 
            className="mt-8 w-full max-w-lg bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 text-center text-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 tracking-tight">{selectedProductImage.name}</h2>
            <div className="grid grid-cols-2 gap-4 divide-x divide-white/10">
              <div className="flex flex-col items-center">
                <p className="text-white/50 text-xs uppercase font-bold tracking-widest mb-1">Precio</p>
                <p className="text-2xl font-light text-indigo-400">${selectedProductImage.priceUSD.toFixed(2)}</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-white/50 text-xs uppercase font-bold tracking-widest mb-1">Disponibilidad</p>
                <p className="text-2xl font-light text-green-400">{selectedProductImage.stock} <span className="text-sm">unid.</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
