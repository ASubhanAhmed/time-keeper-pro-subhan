import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { getApiUrl, setApiUrl } from '@/lib/dbSync';
import { toast } from 'sonner';

export function ApiSettings() {
  const [url, setUrl] = useState(getApiUrl());
  const [open, setOpen] = useState(false);

  const save = () => {
    setApiUrl(url.trim());
    toast.success('API URL saved. Data will now sync to your database.');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Database API Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enter the URL where you uploaded <code>timetrack-api.php</code> on your hosting.
          </p>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourdomain.com/timetrack-api.php"
          />
          <Button onClick={save} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
