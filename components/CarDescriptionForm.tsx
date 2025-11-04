import React from 'react';

export interface CarDescription {
  make: string;
  model: string;
  year: string;
  color: string;
}

interface CarDescriptionFormProps {
  description: CarDescription;
  onDescriptionChange: (description: CarDescription) => void;
}

export const CarDescriptionForm: React.FC<CarDescriptionFormProps> = ({ description, onDescriptionChange }) => {

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDescriptionChange({
      ...description,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="space-y-4 pt-4">
      <div>
        <label htmlFor="make" className="text-gray-600 mb-2 font-medium block">Marca</label>
        <input
          id="make"
          name="make"
          type="text"
          value={description.make}
          onChange={handleChange}
          placeholder="Ej: Volkswagen"
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
        />
      </div>
      <div>
        <label htmlFor="model" className="text-gray-600 mb-2 font-medium block">Modelo</label>
        <input
          id="model"
          name="model"
          type="text"
          value={description.model}
          onChange={handleChange}
          placeholder="Ej: Golf GTI"
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
        />
      </div>
      <div>
        <label htmlFor="year" className="text-gray-600 mb-2 font-medium block">Año</label>
        <input
          id="year"
          name="year"
          type="text"
          value={description.year}
          onChange={handleChange}
          placeholder="Ej: 2023"
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
        />
      </div>
      <div>
        <label htmlFor="color" className="text-gray-600 mb-2 font-medium block">Color</label>
        <input
          id="color"
          name="color"
          type="text"
          value={description.color}
          onChange={handleChange}
          placeholder="Ej: Rojo Tornado"
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
        />
      </div>
    </div>
  );
};
