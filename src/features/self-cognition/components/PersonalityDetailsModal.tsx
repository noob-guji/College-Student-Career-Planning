'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PersonalityDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PersonalityDetailsModal({ isOpen, onClose }: PersonalityDetailsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
            ></div>
            
            {/* Modal Container */}
            <div className="relative w-full max-w-4xl h-[85vh] bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-300 border border-white/20">
                {/* Header Actions */}
                <div className="absolute top-6 right-6 z-20">
                    <button 
                        onClick={onClose}
                        className="p-3 bg-white/50 backdrop-blur-md border border-slate-100 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all shadow-sm hover:shadow-md hover:scale-105"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Modal Body - Empty for now, as requested */}
                <div className="flex-1 overflow-y-auto relative w-full h-full flex flex-col items-center justify-center text-slate-400 p-8">
                    <div className="text-center">
                        <p className="font-mono text-xs font-bold tracking-[0.3em] uppercase mb-4 opacity-40">Detail View</p>
                        <p className="text-lg font-medium">Content coming in next step...</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
