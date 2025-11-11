import React from 'react';
import { Option } from '../types';

interface HorizontalSelectorProps {
  options: Option[];
  onSelect: (value: string) => void;
  disabled: boolean;
}

export const HorizontalSelector: React.FC<HorizontalSelectorProps> = ({ options, onSelect, disabled }) => {
  return (
    <div className="p-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            disabled={disabled}
            className="px-4 py-2 text-sm font-medium text-emerald-800 bg-emerald-100 rounded-full hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:hover:bg-emerald-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
