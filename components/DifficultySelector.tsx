import React from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import { DifficultyLevel } from '../types';
import { DIFFICULTY_LEVELS } from '../constants';

interface DifficultySelectorProps {
  current: DifficultyLevel;
  onChange: (level: DifficultyLevel) => void;
  disabled: boolean;
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({ current, onChange, disabled }) => {
  return (
    <div className="relative group">
      <div className="flex items-center bg-slate-700 hover:bg-slate-600 transition-colors rounded-lg px-3 py-2 cursor-pointer border border-slate-600 text-sm font-medium text-slate-200">
        <Settings className="w-4 h-4 mr-2" />
        <span className="mr-2">{current.name}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white" />
        
        <select 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          value={current.name.toUpperCase()}
          onChange={(e) => onChange(DIFFICULTY_LEVELS[e.target.value])}
          disabled={disabled}
        >
          {Object.keys(DIFFICULTY_LEVELS).map((key) => (
            <option key={key} value={key}>
              {DIFFICULTY_LEVELS[key].name} ({DIFFICULTY_LEVELS[key].rows}x{DIFFICULTY_LEVELS[key].cols})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};