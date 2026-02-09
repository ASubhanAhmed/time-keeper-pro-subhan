import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export function ClockDisplay() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="border-none bg-card/50 backdrop-blur-sm">
      <CardContent className="flex items-center justify-center gap-3 sm:gap-4 py-6 sm:py-8 px-4">
        <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
        <div className="text-center">
          <p className="font-mono text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            {time.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: false 
            })}
          </p>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            {time.toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
