
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat } from '@google/genai';
import { ChatMessage } from './components/ChatMessage';
import { OptionSelector } from './components/OptionSelector';
import { HorizontalSelector } from './components/HorizontalSelector';
import { RecipeCard } from './components/RecipeCard';
import { SavedRecipesModal } from './components/SavedRecipesModal';
import { fetchRecipe, generateDishImage, fetchSources, getGeneralResponse, suggestAlternatives, startChatWithRecipe } from './services/geminiService';
import { LANGUAGES, CUISINES, translations } from './constants';
import { ChatState, Message, Recipe, Language, Cuisine, Source, VideoSearchResult } from './types';
import { BookmarkIcon } from './components/icons/BookmarkIcon';
import { ChefBoardLogo } from './components/icons/ChefBoardLogo';

const SendIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" className="">
    <path fill="currentColor" d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path>
  </svg>
);

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<ChatState>(ChatState.GREETING);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(LANGUAGES[0]);
  const [selectedCuisine, setSelectedCuisine] = useState<Cuisine | null>(null);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [userInput, setUserInput] = useState('');
  const [chatSession, setChatSession] = useState<Chat | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const t = useCallback((key: keyof typeof translations.en, args?: any) => {
    const langTranslations = translations[selectedLanguage.code] || translations.en;
    const translation = langTranslations[key] || translations.en[key];
    if (typeof translation === 'function') {
      return translation(args);
    }
    return translation;
  }, [selectedLanguage]);

  const addMessage = useCallback((message: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...message, id: Date.now() + Math.random() }]);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (chatState === ChatState.GREETING) {
      addMessage({ sender: 'bot', type: 'text', content: t('greeting') });
      setTimeout(() => {
        addMessage({
          sender: 'bot',
          type: 'horizontal-options',
          content: t('selectLang'),
          options: LANGUAGES.map(lang => ({ label: lang.name, value: lang.code }))
        });
        setChatState(ChatState.SELECTING_LANGUAGE);
      }, 1000);
    }
  }, [chatState, addMessage, t]);
  
  const handleOptionSelect = async (value: string) => {
    if (chatState === ChatState.SELECTING_LANGUAGE) {
        const lang = LANGUAGES.find(l => l.code === value);
        if (!lang) return;
        
        setSelectedLanguage(lang);
        const newTranslations = translations[lang.code] || translations.en;
        
        addMessage({ sender: 'user', type: 'text', content: lang.name });
        setTimeout(() => {
            addMessage({
                sender: 'bot',
                type: 'horizontal-options',
                content: newTranslations.selectCuisine,
                options: CUISINES.map(c => ({ label: c.name, value: c.id }))
            });
            setChatState(ChatState.SELECTING_CUISINE);
        }, 1000);

    } else if (chatState === ChatState.SELECTING_CUISINE) {
        const cuisine = CUISINES.find(c => c.id === value);
        if (!cuisine) return;
        
        setSelectedCuisine(cuisine);
        addMessage({ sender: 'user', type: 'text', content: cuisine.name });
        setTimeout(() => {
            addMessage({
                sender: 'bot',
                type: 'text',
                content: t('whatDish', cuisine.name)
            });
            setChatState(ChatState.AWAITING_DISH_INPUT);
        }, 1000);

    } else if (chatState === ChatState.SHOWING_RECIPE) {
        if (value === 'save_recipe' && currentRecipe) {
            if (!savedRecipes.some(r => r.recipeName === currentRecipe.recipeName)) {
              setSavedRecipes(prev => [...prev, currentRecipe]);
            }
            addMessage({ sender: 'user', type: 'text', content: t('saveRecipe') });
            setTimeout(() => {
              addMessage({ sender: 'bot', type: 'text', content: t('recipeSaved') });
            }, 500);
        } else if (value === 'view_sources' && currentRecipe) {
            addMessage({ sender: 'user', type: 'text', content: t('viewSources') });
            setIsLoading(true);
            addMessage({ sender: 'bot', type: 'loading', content: '' });
            try {
                const result: VideoSearchResult = await fetchSources(currentRecipe.recipeName, selectedLanguage.name);
                setMessages(prev => prev.filter(m => m.type !== 'loading'));

                if (result.type === 'exact' && result.sources.length > 0) {
                    const links = result.sources.map((source, index) => `${index + 1}. ${source.title} – ${source.url}`).join('\n');
                    const content = `${t('sourcesLink')}\n${links}`;
                    addMessage({ sender: 'bot', type: 'text', content: content });
                } else {
                    addMessage({ sender: 'bot', type: 'text', content: t('sourcesNotFound') });
                }
            } catch (error) {
                 console.error(error);
                setMessages(prev => prev.filter(m => m.type !== 'loading'));
                addMessage({ sender: 'bot', type: 'text', content: t('sourcesNotFound') });
            } finally {
                setIsLoading(false);
            }
        } else if (value === 'search_another') {
            addMessage({ sender: 'user', type: 'text', content: t('yesSearchAnother') });
            setTimeout(() => {
                addMessage({ sender: 'bot', type: 'text', content: t('whatDish_short') });
                setChatState(ChatState.AWAITING_DISH_INPUT);
            }, 500);
        } else if (value === 'end_chat') {
            addMessage({ sender: 'user', type: 'text', content: t('noImDone') });
            setTimeout(() => {
                addMessage({ sender: 'bot', type: 'text', content: t('goodbye') });
                setChatState(ChatState.ENDED);
            }, 500);
        }
    }
  };

  const handleUserInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = userInput.trim();
    if (!text || isLoading) return;

    addMessage({ sender: 'user', type: 'text', content: text });
    setUserInput('');

    if (text.toLowerCase() === t('showMyRecipes').toLowerCase()) {
      setIsModalOpen(true);
      return;
    }
    
    const isQuestion = /\?|^(what|who|why|how|when|where|can|do|is|tell me)\b/i.test(text);

    // Case 1: Follow-up question about the current recipe
    if (chatState === ChatState.SHOWING_RECIPE && isQuestion && chatSession) {
        setIsLoading(true);
        addMessage({ sender: 'bot', type: 'loading', content: '' });
        try {
            const response = await chatSession.sendMessage({ message: text });
            setMessages(prev => prev.filter(m => m.type !== 'loading'));
            addMessage({ sender: 'bot', type: 'text', content: response.text });
        } catch (error) {
            console.error("Error sending chat message:", error);
            setMessages(prev => prev.filter(m => m.type !== 'loading'));
            addMessage({ sender: 'bot', type: 'text', content: t('recipeError') });
        } finally {
            setIsLoading(false);
        }
        return;
    }

    // Case 2: General question (not about a specific recipe)
    if (chatState === ChatState.AWAITING_DISH_INPUT && isQuestion) {
        setIsLoading(true);
        addMessage({ sender: 'bot', type: 'loading', content: '' });
        try {
            const response = await getGeneralResponse(text, selectedLanguage.name);
            setMessages(prev => prev.filter(m => m.type !== 'loading'));
            addMessage({ sender: 'bot', type: 'text', content: response });
        } catch (error) {
            console.error(error);
            setMessages(prev => prev.filter(m => m.type !== 'loading'));
            addMessage({ sender: 'bot', type: 'text', content: t('recipeError') });
        } finally {
            setIsLoading(false);
        }
        return;
    }
    
    // Case 3: Searching for a new recipe
    if (chatState === ChatState.AWAITING_DISH_INPUT || chatState === ChatState.SHOWING_RECIPE) {
        setIsLoading(true);
        addMessage({ sender: 'bot', type: 'loading', content: '' });
        setChatSession(null); // Clear any existing chat session

        try {
            const recipeData = await fetchRecipe(text, selectedLanguage.name);
            const imageUrl = await generateDishImage(text);
            const fullRecipe = { ...recipeData, image: imageUrl };
            setCurrentRecipe(fullRecipe);

            const newChat = startChatWithRecipe(fullRecipe, selectedLanguage.name);
            setChatSession(newChat);
            
            setMessages(prev => prev.filter(m => m.type !== 'loading'));
            addMessage({ sender: 'bot', type: 'recipe', content: '', recipe: fullRecipe });

             setTimeout(() => {
                 addMessage({
                    sender: 'bot',
                    type: 'actions',
                    content: '',
                    options: [
                        { label: t('saveRecipe'), value: 'save_recipe' },
                        { label: t('viewSources'), value: 'view_sources' },
                    ]
                });
                setChatState(ChatState.SHOWING_RECIPE);
            }, 500);

            setTimeout(() => {
                addMessage({
                    sender: 'bot',
                    type: 'options',
                    content: t('askAnotherRecipe'),
                    options: [
                        { label: t('yesSearchAnother'), value: 'search_another' },
                        { label: t('noImDone'), value: 'end_chat' },
                    ]
                });
            }, 1000);

        } catch (error) {
            console.error(error);
            setMessages(prev => prev.filter(m => m.type !== 'loading'));
            addMessage({ sender: 'bot', type: 'text', content: t('recipeError') });
            
            const alternatives = await suggestAlternatives(text, selectedLanguage.name);
            if (alternatives.length > 0) {
                 addMessage({
                    sender: 'bot',
                    type: 'options',
                    content: t('suggestions'),
                    options: alternatives.map(alt => ({ label: alt, value: alt }))
                });
                setChatState(ChatState.SELECTING_CUISINE); // Re-purpose state to select a suggested dish
            } else {
                 setChatState(ChatState.AWAITING_DISH_INPUT);
            }
        } finally {
            setIsLoading(false);
        }
    }
  }

  const handleRemoveRecipe = (recipeName: string) => {
    setSavedRecipes(prev => prev.filter(r => r.recipeName !== recipeName));
    addMessage({ sender: 'bot', type: 'text', content: t('recipeRemoved', recipeName) });
  };
  
  const isInputDisabled = isLoading || (chatState !== ChatState.AWAITING_DISH_INPUT && chatState !== ChatState.SHOWING_RECIPE) || chatState === ChatState.ENDED;
  
  const getPlaceholder = () => {
    if (chatState === ChatState.ENDED) return "Chat has ended.";
    if (isInputDisabled) return "Select an option above";
    if (chatState === ChatState.SHOWING_RECIPE) return t('recipePlaceholder');
    return t('textPlaceholder');
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 h-screen w-screen flex items-center justify-center font-sans">
      <div className="w-full h-full sm:w-[400px] sm:h-[800px] bg-white dark:bg-gray-800 shadow-2xl rounded-lg flex flex-col">
        <header className="bg-emerald-600 dark:bg-emerald-800 text-white p-3 flex items-center justify-between shadow-md z-10 rounded-t-lg flex-shrink-0">
          <div className="flex items-center">
            <ChefBoardLogo />
            <div>
              <h1 className="text-lg font-bold">Chef BOT</h1>
              <p className="text-sm opacity-80">online</p>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="p-2 rounded-full hover:bg-emerald-700 dark:hover:bg-emerald-900 transition-colors relative" aria-label="View saved recipes">
            <BookmarkIcon />
            {savedRecipes.length > 0 && (
              <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">{savedRecipes.length}</span>
            )}
          </button>
        </header>

        <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 bg-gray-200 dark:bg-gray-900" style={{ backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')", backgroundSize: 'contain', backgroundRepeat: 'repeat' }}>
          <div className="flex flex-col space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg}>
                {msg.type === 'options' && msg.options && (
                   <OptionSelector options={msg.options} onSelect={(value) => handleOptionSelect(value)} disabled={isLoading || (chatState !== ChatState.SHOWING_RECIPE && chatState !== ChatState.SELECTING_CUISINE)} />
                )}
                {msg.type === 'horizontal-options' && msg.options && (
                   <HorizontalSelector options={msg.options} onSelect={(value) => handleOptionSelect(value)} disabled={isLoading || (chatState !== ChatState.SELECTING_LANGUAGE && chatState !== ChatState.SELECTING_CUISINE)} />
                )}
                {msg.type === 'actions' && msg.options && (
                     <OptionSelector options={msg.options} onSelect={(value) => handleOptionSelect(value)} disabled={isLoading} isAction={true} />
                )}
                {msg.type === 'recipe' && msg.recipe && (
                  <RecipeCard recipe={msg.recipe} />
                )}
              </ChatMessage>
            ))}
          </div>
        </main>

        <footer className="bg-gray-100 dark:bg-gray-800 p-2 flex-shrink-0 border-t dark:border-gray-700 rounded-b-lg">
          <form onSubmit={handleUserInputSubmit} className="flex items-center space-x-2">
            <input 
              type="text" 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={getPlaceholder()}
              disabled={isInputDisabled}
              className="flex-1 p-3 rounded-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              aria-label="Type your message"
            />
            <button 
              type="submit" 
              disabled={!userInput.trim() || isLoading}
              className="w-11 h-11 bg-emerald-500 text-white rounded-full flex items-center justify-center transition-all duration-200 transform hover:bg-emerald-600 disabled:bg-gray-400 disabled:dark:bg-gray-600 disabled:scale-100"
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </form>
        </footer>
      </div>
      <SavedRecipesModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        recipes={savedRecipes} 
        onRemove={handleRemoveRecipe}
      />
    </div>
  );
};

export default App;
