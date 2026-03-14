import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { LogIn, Image as ImageIcon, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { loginWithGoogle, authLoading, currentUser, settings, products, exchangeRate } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && !authLoading) {
      navigate('/dashboard');
    }
  }, [currentUser, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Verificando acceso...</p>
      </div>
    );
  }

  const companyName = settings?.companyName || 'Pastoral de Pequeñas Comunidades';
  const corporatePhone = settings?.corporatePhone || '';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 3);
  };
  const availableProducts = products.filter(p => p.stock > 0);

  const handleWhatsAppInquiry = async (product: any) => {
    if (!corporatePhone) {
      alert('El número de teléfono corporativo no está configurado. Por favor, contacte al administrador.');
      return;
    }
    
    // Clean the phone number (remove spaces, dashes, etc.)
    const cleanPhone = corporatePhone.replace(/\D/g, '');
    
    // Create the message
    let message = `Hola, quisiera información sobre ${product.name}`;
    
    if (product.imageUrl) {
      const longImageUrl = `${window.location.origin}/api/products/${product._id || product.id}/image.jpg`;
      
      try {
        // Try to shorten the URL
        const response = await fetch('/api/utils/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ longUrl: longImageUrl })
        });
        
        if (response.ok) {
          const data = await response.json();
          message += ` y el bitly de la imagen ${data.link}`;
        } else {
          message += ` y el enlace de la imagen ${longImageUrl}`;
        }
      } catch (error) {
        console.error('Error shortening URL:', error);
        message += ` y el enlace de la imagen ${longImageUrl}`;
      }
    }
    
    // Encode the message for the URL
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3 overflow-hidden">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 object-contain flex-shrink-0" />
              ) : (
                <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 font-bold text-sm">PPC</span>
                </div>
              )}
              <span className="font-bold text-xl text-gray-900 hidden sm:block truncate">{companyName}</span>
              <span className="font-bold text-xl text-gray-900 sm:hidden truncate">{getInitials(companyName)}</span>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {exchangeRate && (
                <div className="flex flex-col items-end text-[10px] sm:text-xs text-gray-500">
                  <span className="font-semibold text-indigo-600">Tasa BCV: {exchangeRate.promedio.toFixed(2)} Bs/$</span>
                  <span className="hidden xs:block">Act: {new Date(exchangeRate.fechaActualizacion).toLocaleDateString()}</span>
                </div>
              )}
              <button
                onClick={loginWithGoogle}
                className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Iniciar Sesión</span>
                <span className="xs:hidden">Entrar</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Catalog */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Catálogo de Productos
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Explora nuestros artículos disponibles
          </p>
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
                  <button 
                    onClick={() => handleWhatsAppInquiry(product)}
                    className="flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    title="Solicitar información por WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Solicitar Info
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {availableProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-lg border border-gray-200 border-dashed">
              No hay productos disponibles en el catálogo en este momento.
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Todos los derechos reservados, y por autor: desarrollado por Ing. Miguel Mota, Desarrollo de Sistemas Creativos.
          </p>
        </div>
      </footer>
    </div>
  );
}
