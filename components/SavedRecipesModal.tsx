
import React from 'react';
import { Recipe } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface SavedRecipesModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
  onRemove: (recipeName: string) => void;
}

export const SavedRecipesModal: React.FC<SavedRecipesModalProps> = ({ isOpen, onClose, recipes, onRemove }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">My Saved Recipes</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="overflow-y-auto p-6">
          {recipes.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">You haven't saved any recipes yet.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Start chatting with Chef Board to find and save your favorites!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recipes.map((recipe, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex items-center space-x-4">
                  <img src={recipe.image} alt={recipe.recipeName} className="w-24 h-24 object-cover rounded-md flex-shrink-0"/>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 dark:text-white">{recipe.recipeName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic line-clamp-2">"{recipe.description}"</p>
                  </div>
                  <button 
                    onClick={() => onRemove(recipe.recipeName)}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                    aria-label={`Remove ${recipe.recipeName}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
