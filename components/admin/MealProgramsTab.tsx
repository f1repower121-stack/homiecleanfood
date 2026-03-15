'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Copy, Pause, Play } from 'lucide-react';

interface MealProgram {
  id: string;
  program_name: string;
  total_days: number;
  meals_per_day: number;
  total_meals: number;
  package_duration_days: number;
  price_per_meal: number;
  total_price: number;
  is_available: boolean;
}

interface MealItem {
  day_number: number;
  meal_number: number;
  meal_name: string;
  calories: number;
  contains_meat: string;
}

interface CustomerPackage {
  id: string;
  customer_name: string;
  program_name: string;
  meals_consumed: number;
  total_meals: number;
  status: 'active' | 'paused' | 'completed';
  started_at: string;
  expires_at: string;
  location: string;
}

export default function MealProgramsTab() {
  const [activeTab, setActiveTab] = useState<'programs' | 'customers' | 'create'>('programs');
  const [programs, setPrograms] = useState<MealProgram[]>([
    {
      id: '1',
      program_name: '30-Day Standard Plan',
      total_days: 30,
      meals_per_day: 2,
      total_meals: 60,
      package_duration_days: 30,
      price_per_meal: 150,
      total_price: 9000,
      is_available: true,
    },
    {
      id: '2',
      program_name: '60-Day Premium Plan',
      total_days: 60,
      meals_per_day: 3,
      total_meals: 180,
      package_duration_days: 60,
      price_per_meal: 140,
      total_price: 25200,
      is_available: true,
    },
  ]);

  const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([
    {
      id: '1',
      customer_name: 'Andras Donauer',
      program_name: '30-Day Standard Plan',
      meals_consumed: 30,
      total_meals: 60,
      status: 'active',
      started_at: '2026-02-15',
      expires_at: '2026-03-15',
      location: 'BKK',
    },
    {
      id: '2',
      customer_name: 'Bo Mirasena',
      program_name: '60-Day Premium Plan',
      meals_consumed: 85,
      total_meals: 180,
      status: 'paused',
      started_at: '2026-01-15',
      expires_at: '2026-03-15',
      location: 'BKK',
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    program_name: '',
    total_days: 30,
    meals_per_day: 2,
    package_duration_days: 30,
    price_per_meal: 150,
  });

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    const total_meals = formData.total_days * formData.meals_per_day;
    const total_price = total_meals * formData.price_per_meal;

    const newProgram: MealProgram = {
      id: Date.now().toString(),
      program_name: formData.program_name,
      total_days: formData.total_days,
      meals_per_day: formData.meals_per_day,
      total_meals: total_meals,
      package_duration_days: formData.package_duration_days,
      price_per_meal: formData.price_per_meal,
      total_price: total_price,
      is_available: true,
    };

    setPrograms([...programs, newProgram]);
    setFormData({
      program_name: '',
      total_days: 30,
      meals_per_day: 2,
      package_duration_days: 30,
      price_per_meal: 150,
    });
    setShowCreateForm(false);
    setActiveTab('programs');
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('programs')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'programs'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📋 Meal Programs
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'customers'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          👥 Customer Packages
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'create'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ➕ Create Program
        </button>
      </div>

      {/* Meal Programs Tab */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Available Meal Programs</h3>
            <button
              onClick={() => setActiveTab('create')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus size={20} /> New Program
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programs.map((program) => (
              <div key={program.id} className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">{program.program_name}</h4>
                    <p className="text-sm text-gray-500">ID: {program.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <Edit2 size={18} className="text-blue-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <Copy size={18} className="text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Program Duration</p>
                    <p className="text-xl font-bold text-blue-600">{program.total_days} days</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Meals/Day</p>
                    <p className="text-xl font-bold text-green-600">{program.meals_per_day}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Total Meals</p>
                    <p className="text-xl font-bold text-purple-600">{program.total_meals}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Package Duration</p>
                    <p className="text-xl font-bold text-orange-600">{program.package_duration_days}d</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-600">Per Meal</p>
                      <p className="text-lg font-bold text-gray-800">฿{program.price_per_meal}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Total Price</p>
                      <p className="text-lg font-bold text-green-600">฿{program.total_price.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
                  Assign to Customer →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Packages Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Active Customer Packages</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Program</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Progress</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Expires</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Location</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customerPackages.map((pkg) => (
                  <tr key={pkg.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{pkg.customer_name}</td>
                    <td className="px-4 py-3 text-gray-700">{pkg.program_name}</td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{
                              width: `${(pkg.meals_consumed / pkg.total_meals) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {pkg.meals_consumed}/{pkg.total_meals}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          pkg.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : pkg.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {pkg.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{pkg.expires_at}</td>
                    <td className="px-4 py-3 text-gray-700">{pkg.location}</td>
                    <td className="px-4 py-3 flex gap-2">
                      {pkg.status === 'active' ? (
                        <button className="p-1 hover:bg-yellow-100 rounded" title="Pause">
                          <Pause size={16} className="text-yellow-600" />
                        </button>
                      ) : (
                        <button className="p-1 hover:bg-green-100 rounded" title="Resume">
                          <Play size={16} className="text-green-600" />
                        </button>
                      )}
                      <button className="p-1 hover:bg-blue-100 rounded" title="View Details">
                        <Edit2 size={16} className="text-blue-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Program Tab */}
      {activeTab === 'create' && (
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold mb-6">Create New Meal Program</h3>

          <form onSubmit={handleCreateProgram} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
            {/* Program Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Program Name</label>
              <input
                type="text"
                required
                value={formData.program_name}
                onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
                placeholder="e.g., 30-Day Lean Plan"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📅 How Many Days?</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.total_days}
                  onChange={(e) => setFormData({ ...formData, total_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">Program runs for this many days</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🍱 How Many Meals/Day?</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  required
                  value={formData.meals_per_day}
                  onChange={(e) => setFormData({ ...formData, meals_per_day: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">Meals to deliver each day</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📦 Package Duration</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.package_duration_days}
                  onChange={(e) => setFormData({ ...formData, package_duration_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">Days before package expires</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">💰 Price Per Meal</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  required
                  value={formData.price_per_meal}
                  onChange={(e) => setFormData({ ...formData, price_per_meal: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">Price per meal (฿)</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">Program Summary</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-blue-700">Total Meals</p>
                  <p className="text-xl font-bold text-blue-900">{formData.total_days * formData.meals_per_day}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Total Price</p>
                  <p className="text-xl font-bold text-green-600">
                    ฿{(formData.total_days * formData.meals_per_day * formData.price_per_meal).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Meals Per Day</p>
                  <p className="text-xl font-bold text-blue-900">{formData.meals_per_day}</p>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                💡 <strong>Next:</strong> After creating this program, you'll select which preset meals to include for each day.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
              >
                Create Program
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('programs')}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Next Step Info */}
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">How This Works</h4>
            <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
              <li>Create a program (e.g., "30-Day Standard Plan")</li>
              <li>Select preset meals for each day</li>
              <li>Assign to customers</li>
              <li>Customers see the program in their dashboard</li>
              <li>Admin controls pause/resume from here</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
