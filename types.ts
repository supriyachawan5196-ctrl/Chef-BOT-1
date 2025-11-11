
export enum ChatState {
  GREETING,
  SELECTING_LANGUAGE,
  SELECTING_CUISINE,
  AWAITING_DISH_INPUT,
  SHOWING_RECIPE,
  ENDED,
}

export interface Option {
  label: string;
  value: string;
}

export interface Message {
  id: number;
  sender: 'user' | 'bot';
  type: 'text' | 'options' | 'recipe' | 'loading' | 'actions' | 'horizontal-options';
  content: string;
  options?: Option[];
  recipe?: Recipe;
}

export interface Source {
  title: string;
  url: string;
}

export interface VideoSearchResult {
  type: 'exact' | 'related' | 'none';
  sources: Source[];
}

export interface Recipe {
  recipeName: string;
  description: string;
  image: string;
  ingredients: string[];
  instructions: string[];
  sources?: Source[];
}

export interface Language {
  code: 'en' | 'hi' | 'mr' | 'ta' | 'gu' | 'kn' | 'bn' | 'te' | 'pa' | 'ml' | 'ur';
  name: string;
}

export interface Cuisine {
  id: string;
  name:string;
}
