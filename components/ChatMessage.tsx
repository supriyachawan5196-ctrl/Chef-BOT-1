
import React from 'react';
import { Message } from '../types';
import { ChefIcon } from './icons/ChefIcon';
import { UserIcon } from './icons/UserIcon';

interface ChatMessageProps {
  message: Message;
  children?: React.ReactNode;
}

const renderContentWithLinks = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-blue-400 hover:underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
};


export const ChatMessage: React.FC<ChatMessageProps> = ({ message, children }) => {
  const isBot = message.sender === 'bot';

  const bubbleClasses = isBot
    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 self-start rounded-r-xl rounded-bl-xl'
    : 'bg-emerald-500 dark:bg-emerald-700 text-white self-end rounded-l-xl rounded-br-xl';

  const containerClasses = isBot ? 'flex items-end justify-start' : 'flex items-end justify-end';
  
  const loadingSpinner = (
    <div className="flex items-center space-x-1 p-3">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
    </div>
  );

  return (
    <div className={`${containerClasses} animate-fade-in`}>
      {isBot && <ChefIcon />}
      <div className={`max-w-xs md:max-w-md shadow-md ${bubbleClasses}`}>
        {message.type === 'loading' ? loadingSpinner : (
            <>
                {message.content && <div className="p-3 text-sm whitespace-pre-wrap">{renderContentWithLinks(message.content)}</div>}
                {children}
            </>
        )}
      </div>
      {!isBot && <UserIcon />}
    </div>
  );
};

const style = document.createElement('style');
style.innerHTML = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
`;
document.head.appendChild(style);
