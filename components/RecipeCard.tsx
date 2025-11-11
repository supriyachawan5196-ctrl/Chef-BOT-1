
import React from 'react';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  return (
    <div className="w-full max-w-sm rounded-lg overflow-hidden my-2">
      <img className="w-full h-48 object-cover" src={recipe.image} alt={recipe.recipeName} />
      <div className="p-4">
        <h3 className="font-bold text-xl mb-2">{recipe.recipeName}</h3>
        <p className="text-sm italic mb-4">"{recipe.description}"</p>
        
        <div>
          <h4 className="font-semibold text-lg mb-2 border-b border-gray-300 dark:border-gray-600 pb-1">Ingredients</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index}>{ingredient}</li>
            ))}
          </ul>
        </div>
        
        <div className="mt-4">
          <h4 className="font-semibold text-lg mb-2 border-b border-gray-300 dark:border-gray-600 pb-1">Instructions</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            {recipe.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};
