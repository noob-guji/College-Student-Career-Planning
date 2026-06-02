'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, X, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function InterviewFloatButton() {
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="mb-3 px-4 py-3 bg-white rounded-xl shadow-xl border border-slate-200 max-w-[200px]"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">数字人模拟面试</span>
              <button onClick={() => setShowTip(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">AI数字人面试官，沉浸式模拟面试体验</p>
          </motion.div>
        )}
      </AnimatePresence>

      <Link href="/interview">
        <button
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          className="group flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full shadow-xl shadow-indigo-500/30 transition-all duration-300 hover:scale-105 active:scale-95 z-50 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
        >
          <Video className="w-6 h-6 group-hover:animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 border-2 border-white flex items-center justify-center">
              <Sparkles className="w-2 h-2 text-white" />
            </span>
          </span>
        </button>
      </Link>
    </div>
  );
}
