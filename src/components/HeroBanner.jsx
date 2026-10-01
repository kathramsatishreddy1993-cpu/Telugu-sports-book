import React from 'react';  
  
export default function HeroBanner() {  
  return (  
    <div className="relative w-full bg-gradient-to-br from-[#121c2d] via-[#0d1522] to-[#080d16] border-b border-gray-800 py-10 px-4 text-center overflow-hidden">  
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />  
        
      <div className="relative max-w-4xl mx-auto space-y-4">  
        <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-amber-400 uppercase bg-amber-400/10 border border-amber-500/30 rounded-full">  
          India's Premier Sports & Gaming Hub  
        </span>  
  
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">  
          Welcome to <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">Telugu Sports Book</span>  
        </h1>  
  
        <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">  
          Experience real-time sports updates, live odds, interactive gaming, and instant bonus returns. Fast, secure, and built for sports fans.  
        </p>  
      </div>  
    </div>  
  );  
}  
  
