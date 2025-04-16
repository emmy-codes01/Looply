
import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

const NetworkDetector = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isWeakConnection, setIsWeakConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsWeakConnection(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Connection quality check using performance API
    const checkConnectionQuality = () => {
      if ('connection' in navigator && (navigator as any).connection) {
        const connection = (navigator as any).connection;
        
        if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
          setIsWeakConnection(true);
        } else {
          setIsWeakConnection(false);
        }
      } else if (isOnline) {
        // Fallback for browsers not supporting NetworkInformation API
        const startTime = Date.now();
        fetch('/favicon.ico', { mode: 'no-cors', cache: 'no-store' })
          .then(() => {
            const latency = Date.now() - startTime;
            setIsWeakConnection(latency > 2000); // Consider connection weak if latency is higher than 2 seconds
          })
          .catch(() => {
            setIsWeakConnection(true);
          });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check connection quality initially and every 30 seconds
    checkConnectionQuality();
    const interval = setInterval(checkConnectionQuality, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground py-2 px-4 rounded-full flex items-center space-x-2 shadow-lg animate-fade-in">
        <WifiOff size={16} />
        <span className="text-xs font-medium">You're offline. Check your connection.</span>
      </div>
    );
  }

  if (isWeakConnection) {
    return (
      <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white py-2 px-4 rounded-full flex items-center space-x-2 shadow-lg animate-fade-in">
        <Wifi size={16} className="animate-pulse-light" />
        <span className="text-xs font-medium">Weak connection. Content may load slowly.</span>
      </div>
    );
  }

  return null;
};

export default NetworkDetector;
