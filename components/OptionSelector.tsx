
import React from 'react';
import { Option } from '../types';

interface OptionSelectorProps {
  options: Option[];
  onSelect: (value: string) => void;
  disabled: boolean;
  isAction?: boolean;
}

export const OptionSelector: React.FC<OptionSelectorProps> = ({ options, onSelect, disabled, isAction = false }) => {
  const containerClasses = isAction
    ? 'flex flex-row space-x-2 p-2'
    : 'flex flex-col space-y-2 p-2';

  const buttonClasses = `w-full text-left font-medium rounded-lg transition-all duration-200 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-700 disabled:opacity-50 disabled:cursor-not-allowed`;
  
  const optionButtonClasses = `${buttonClasses} bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:hover:bg-emerald-800 focus:ring-emerald-500 p-2.5 text-sm`;
  const actionButtonClasses = `${buttonClasses} bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 focus:ring-blue-500 text-center px-4 py-2 text-xs`;

  return (
    <div className={containerClasses}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onSelect(option.value)}
          disabled={disabled}
          className={isAction ? actionButtonClasses : optionButtonClasses}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};