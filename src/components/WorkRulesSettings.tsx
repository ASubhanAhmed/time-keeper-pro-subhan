import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Coffee, Clock } from 'lucide-react';
import { WorkRules } from '@/hooks/useWorkRules';

interface WorkRulesSettingsProps {
  rules: WorkRules;
  onUpdate: (updates: Partial<WorkRules>) => void;
}

export function WorkRulesSettings({ rules, onUpdate }: WorkRulesSettingsProps) {
  return (
    <Card className="border-none glass rounded-2xl shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Work Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-background/60 p-3">
          <div className="flex items-center gap-3">
            <Coffee className="h-4 w-4 text-accent-foreground shrink-0" />
            <div>
              <Label className="text-sm font-medium">Max Break Duration</Label>
              <p className="text-xs text-muted-foreground">Alert when break exceeds limit</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={5}
              max={180}
              value={rules.maxBreakMinutes}
              onChange={e => onUpdate({ maxBreakMinutes: parseInt(e.target.value) || 60 })}
              className="w-16 h-8 text-sm text-center rounded-lg"
              disabled={!rules.breakLimitEnabled}
            />
            <span className="text-xs text-muted-foreground">min</span>
            <Switch
              checked={rules.breakLimitEnabled}
              onCheckedChange={v => onUpdate({ breakLimitEnabled: v })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-background/60 p-3">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <div>
              <Label className="text-sm font-medium">Min Working Hours</Label>
              <p className="text-xs text-muted-foreground">Alert when net work falls below</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={16}
              step={0.5}
              value={rules.minWorkHours}
              onChange={e => onUpdate({ minWorkHours: parseFloat(e.target.value) || 9 })}
              className="w-16 h-8 text-sm text-center rounded-lg"
              disabled={!rules.minWorkEnabled}
            />
            <span className="text-xs text-muted-foreground">hrs</span>
            <Switch
              checked={rules.minWorkEnabled}
              onCheckedChange={v => onUpdate({ minWorkEnabled: v })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}