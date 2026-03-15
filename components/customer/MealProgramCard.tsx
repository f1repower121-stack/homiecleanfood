'use client';

import { Pause, Play, Calendar, UtensilsCrossed, TrendingDown } from 'lucide-react'
import { getTodayICT } from '@/lib/dateUtils'

interface CustomerPackage {
  id: string;
  program_name: string;
  program_description: string;
  status: 'active' | 'paused';
  meals_consumed: number;
  total_meals: number;
  started_at: string;
  expires_at: string;
  paused_until_date?: string;
  meals_per_day: number;
  total_days: number;
  package_duration_days: number;
  delivery_time: string;
}

interface Props {
  package: CustomerPackage;
  onPause: (packageId: string, resumeDate: string) => void;
  onResume: (packageId: string) => void;
}

export default function MealProgramCard({ package: pkg, onPause, onResume }: Props) {
  const mealsRemaining = pkg.total_meals - pkg.meals_consumed;
  const progressPercentage = (pkg.meals_consumed / pkg.total_meals) * 100;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border-l-4 border-l-green-600">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 border-b">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{pkg.program_name}</h2>
            <p className="text-gray-600 mt-1">{pkg.program_description}</p>
          </div>
          <div className="text-right">
            <span
              className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                pkg.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {pkg.status === 'active' ? '✓ Active' : '⏸ Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Program Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-blue-600" />
              <p className="text-xs text-gray-600 font-medium">DAYS</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{pkg.total_days}</p>
            <p className="text-xs text-gray-600 mt-1">days program</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <UtensilsCrossed size={18} className="text-green-600" />
              <p className="text-xs text-gray-600 font-medium">MEALS/DAY</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{pkg.meals_per_day}</p>
            <p className="text-xs text-gray-600 mt-1">per day</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={18} className="text-purple-600" />
              <p className="text-xs text-gray-600 font-medium">TOTAL</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">{pkg.total_meals}</p>
            <p className="text-xs text-gray-600 mt-1">total meals</p>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-orange-600" />
              <p className="text-xs text-gray-600 font-medium">DURATION</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{pkg.package_duration_days}d</p>
            <p className="text-xs text-gray-600 mt-1">package valid</p>
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Your Progress</h3>
            <span className="text-sm font-bold text-gray-700">
              {pkg.meals_consumed} / {pkg.total_meals} meals
            </span>
          </div>

          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>Consumed</span>
              <span>Progress: {Math.round(progressPercentage)}%</span>
            </div>
          </div>

          {/* Meals Remaining */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-700 font-medium">Meals Remaining</p>
            <p className="text-3xl font-bold text-green-600">{mealsRemaining}</p>
            <p className="text-xs text-green-700 mt-1">
              {mealsRemaining > 0 ? `About ${Math.ceil(mealsRemaining / pkg.meals_per_day)} days left` : 'Almost done!'}
            </p>
          </div>
        </div>

        {/* Date Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600 font-medium mb-1">Started</p>
            <p className="text-sm font-semibold text-gray-800">{pkg.started_at}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-medium mb-1">Expires</p>
            <p className="text-sm font-semibold text-gray-800">{pkg.expires_at}</p>
          </div>
        </div>

        {/* Paused Status */}
        {pkg.status === 'paused' && pkg.paused_until_date && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium">⏸️ Program Paused</p>
            <p className="text-sm text-yellow-700 mt-1">
              Deliveries resume on <strong>{pkg.paused_until_date}</strong>
            </p>
          </div>
        )}

        {/* Delivery Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">📍 Delivery Details</p>
          <p className="text-sm text-blue-800">
            <strong>Time:</strong> {pkg.delivery_time}
          </p>
        </div>

        {/* Pause/Resume Button */}
        <div className="flex gap-3">
          {pkg.status === 'active' ? (
            <button
              onClick={() => {
                const resumeDate = prompt('When will you return? (YYYY-MM-DD)', getTodayICT());
                if (resumeDate) onPause(pkg.id, resumeDate);
              }}
              className="flex-1 bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 font-medium flex items-center justify-center gap-2"
            >
              <Pause size={20} /> Pause Program
            </button>
          ) : (
            <button
              onClick={() => onResume(pkg.id)}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
            >
              <Play size={20} /> Resume Program
            </button>
          )}

          <button className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-medium">
            📧 Get Help
          </button>
        </div>

        {/* Next Delivery Info */}
        <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-4 border-l-4 border-green-600">
          <p className="text-sm font-semibold text-gray-800 mb-2">📦 Next Delivery</p>
          {pkg.status === 'active' ? (
            <p className="text-sm text-gray-700">
              Your next meals will be delivered <strong>tomorrow</strong> at <strong>{pkg.delivery_time}</strong>
            </p>
          ) : (
            <p className="text-sm text-gray-700">
              Deliveries paused until <strong>{pkg.paused_until_date}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-4 border-t">
        <p className="text-xs text-gray-600 text-center">
          Questions? Contact support or reply to LINE messages
        </p>
      </div>
    </div>
  );
}
