import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { loginWithGoogle, authLoading, currentUser } = useAppContext();
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-24 w-24 bg-indigo-100 rounded-full flex items-center justify-center">
            {/* Logo placeholder */}
            <span className="text-indigo-600 font-bold text-2xl">PPC</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Pastoral de Pequeñas Comunidades
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sistema de Gestión y Control
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <button
                onClick={loginWithGoogle}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Iniciar sesión con Google
              </button>
            </div>
            <div className="text-sm text-center text-gray-500">
              Solo usuarios autorizados pueden acceder al sistema.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
