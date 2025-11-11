
import React from 'react';

export const ChefBoardLogo: React.FC = () => (
  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 mr-3 flex-shrink-0 p-1">
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      {/* Hat Top */}
      <path d="M12.5,6A2.5,2.5,0,1,0,15,3.5,2.5,2.5,0,0,0,12.5,6Z" />
      <path d="M7.5,8A2.5,2.5,0,1,0,10,5.5,2.5,2.5,0,0,0,7.5,8Z" />
      <path d="M5,10.5A2.5,2.5,0,1,0,7.5,8,2.5,2.5,0,0,0,5,10.5Z" />
      <path d="M15,8.5a2.5,2.5,0,1,0-2.5-2.5A2.5,2.5,0,0,0,15,8.5Z" />
      <path d="M19,9a2.5,2.5,0,1,0-2.5-2.5A2.5,2.5,0,0,0,19,9Z" />
      {/* Hat Bottom */}
      <path d="M18.5,11.5H5.5a.5.5,0,0,0-.5.5v2a.5.5,0,0,0,.5.5h13a.5.5,0,0,0,.5-.5v-2A.5.5,0,0,0,18.5,11.5Z" />
      {/* Utensils */}
      <path d="M10.7,15.79,7.15,19.34a.5.5,0,0,0,0,.7.5.5,0,0,0,.7,0L11.4,16.5a1.49,1.49,0,0,1,2.12,0L17.07,20a.5.5,0,0,0,.7,0,.5.5,0,0,0,0-.7L14.22,15.79a2.49,2.49,0,0,0-3.52,0Z" opacity="0.6"/>
    </svg>
  </div>
);