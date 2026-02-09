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
      <CardContent className="flex items-center justify-center gap-4 py-8">
        <Clock className="h-8 w-8 text-primary" />
        <div className="text-center">
          <p className="font-mono text-5xl font-bold tracking-tight text-foreground">
            {time.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: false 
            })}
          </p>
          <p className="mt-1 text-muted-foreground">
            {time.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
