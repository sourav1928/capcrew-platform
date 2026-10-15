import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { KPI } from '../../types';

interface KPICardProps {
  kpi: KPI;
  accent?: 'blue' | 'green' | 'amber' | 'violet' | 'rose';
}

const accentMap = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   bar: 'bg-blue-500'   },
  green:  { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  bar: 'bg-amber-500'  },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', bar: 'bg-violet-500' },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-600',   bar: 'bg-rose-500'   },
};

export const KPICard: React.FC<KPICardProps> = ({ kpi, accent = 'blue' }) => {
  const colors = accentMap[accent];
  const isUp = kpi.trend === 'up';
  const isDown = kpi.trend === 'down';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
      <p className="text-sm text-gray-500 font-medium mb-3">{kpi.label}</p>
      <p className="text-3xl font-bold text-gray-900 tracking-tight mb-1">{kpi.value}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{kpi.subtext}</p>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            isUp
              ? 'bg-emerald-50 text-emerald-600'
              : isDown
              ? 'bg-red-50 text-red-600'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isUp ? (
            <TrendingUp className="w-3 h-3" />
          ) : isDown ? (
            <TrendingDown className="w-3 h-3" />
          ) : (
            <Minus className="w-3 h-3" />
          )}
          {Math.abs(kpi.delta)}%
        </span>
      </div>
    </div>
  );
};
