import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Image as ImageIcon, Upload } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';

export default function Settings() {
  const { settings, updateSettings } = useAppContext();
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [corporatePhone, setCorporatePhone] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || '');
      setLogoUrl(settings.logoUrl || '');
      setCorporatePhone(settings.corporatePhone || '');
    }
  }, [settings]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const base64Image = await compressImage(file, 800, 800, 0.7);
      setLogoUrl(base64Image);
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Error al procesar la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({ companyName, logoUrl, corporatePhone });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Configuración de la Empresa</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre de la Empresa</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder="Ej. Pastoral de Pequeñas Comunidades"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Teléfono Corporativo (WhatsApp)</label>
            <input
              type="text"
              value={corporatePhone}
              onChange={(e) => setCorporatePhone(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder="Ej. +584141234567"
            />
            <p className="mt-1 text-xs text-gray-500">
              Este número se utilizará para que los clientes soliciten información desde el catálogo público. Incluye el código de país (ej. +58).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo de la Empresa</label>
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="h-32 w-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  Recomendado: Imagen cuadrada (PNG o JPG) de al menos 200x200px.
                </p>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Eliminar logo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
