import { useAppContext } from '../context/AppContext';
import { Image as ImageIcon, ShoppingBag } from 'lucide-react';

export default function Catalog() {
  const { products } = useAppContext();

  // Solo mostrar productos con stock mayor a 0
  const availableProducts = products.filter(p => p.stock > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {availableProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-square w-full bg-gray-50 relative">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ImageIcon className="w-16 h-16" />
                </div>
              )}
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold text-gray-700 shadow-sm">
                Stock: {product.stock}
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{product.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-indigo-600">${product.priceUSD?.toFixed(2) || '0.00'}</span>
                <button className="flex items-center justify-center p-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                  <ShoppingBag className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {availableProducts.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            No hay productos disponibles en el catálogo en este momento.
          </div>
        )}
      </div>
    </div>
  );
}
