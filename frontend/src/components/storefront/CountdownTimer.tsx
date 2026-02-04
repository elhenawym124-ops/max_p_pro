import React, { useState, useEffect } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

interface CountdownTimerProps {
  endDate: Date | string;
  enabled: boolean;
  className?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endDate,
  enabled,
  className = ''
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const calculateTimeLeft = () => {
      const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
      const now = new Date();
      const difference = end.getTime() - now.getTime();

      if (difference <= 0) {
        setExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      if (newTimeLeft.days === 0 && newTimeLeft.hours === 0 && 
          newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        setExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate, enabled]);

  if (!enabled || expired) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ClockIcon className="h-5 w-5 text-red-500" />
      <span className="text-sm font-semibold text-gray-900">ينتهي العرض خلال:</span>
      <div className="flex items-center gap-2">
        {timeLeft.days > 0 && (
          <div className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
            {timeLeft.days} يوم
          </div>
        )}
        <div className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
          {String(timeLeft.hours).padStart(2, '0')}:
        </div>
        <div className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
          {String(timeLeft.minutes).padStart(2, '0')}:
        </div>
        <div className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
          {String(timeLeft.seconds).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;

