import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Check } from 'lucide-react';

interface SliderCaptchaProps {
  onVerify: (success: boolean) => void;
  isDarkMode?: boolean;
}

export default function SliderCaptcha({ onVerify, isDarkMode }: SliderCaptchaProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sliderX, setSliderX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isVerified) return;
    setIsDragging(true);
  };

  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || isVerified || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    let x = clientX - containerRect.left - 20; // 20 is half of slider width

    const maxX = containerRect.width - 44; // 44 is slider width + padding
    if (x < 0) x = 0;
    if (x > maxX) x = maxX;

    setSliderX(x);

    if (x >= maxX - 2) {
      setIsVerified(true);
      setIsDragging(false);
      onVerify(true);
    }
  };

  const handleEnd = () => {
    if (isVerified) return;
    setIsDragging(false);
    if (!isVerified) {
      setSliderX(0);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    } else {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">人机验证</label>
      <div 
        ref={containerRef}
        className={`relative h-11 rounded-xl border overflow-hidden select-none transition-colors ${
          isVerified 
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' 
            : 'bg-gray-100 border-gray-200 dark:bg-slate-800 dark:border-slate-700'
        }`}
      >
        <div 
          className="absolute inset-0 flex items-center justify-center text-sm font-medium transition-opacity"
          style={{ opacity: isVerified ? 0 : 1 }}
        >
          <span className="text-gray-400 dark:text-slate-500">向右滑动验证</span>
        </div>

        {isVerified && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in">
            <Check className="w-4 h-4 mr-2" />
            验证通过
          </div>
        )}

        <div 
          className={`absolute top-1 bottom-1 left-1 bg-primary-600 rounded-lg shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-all ${
            isDragging ? 'scale-105' : ''
          } ${isVerified ? 'bg-emerald-500' : ''}`}
          style={{ 
            width: '40px', 
            transform: `translateX(${sliderX}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
          onMouseDown={handleStart}
          onTouchStart={handleStart}
        >
          {isVerified ? (
            <Check className="w-5 h-5 text-white" />
          ) : (
            <ChevronRight className="w-5 h-5 text-white" />
          )}
        </div>
      </div>
    </div>
  );
}
