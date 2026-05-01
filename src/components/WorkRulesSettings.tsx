import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Coffee, Clock } from 'lucide-react';
import { WorkRules, RuleOperator, OPERATOR_LABELS } from '@/hooks/useWorkRules';

interface WorkRulesSettingsProps {
  rules: WorkRules;
  onUpdate: (updates: Partial<WorkRules>) => void;
}

const OPERATORS: RuleOperator[] = ['<', '<=', '=', '>=', '>'];

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
        {/* Break rule */}
        <div className="rounded-xl bg-background/60 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Coffee className="h-4 w-4 text-accent-foreground shrink-0" />
              <div>
                <Label className="text-sm font-medium">Break Duration Rule</Label>
                <p className="text-xs text-muted-foreground">
                  Alert when break is {OPERATOR_LABELS[rules.breakOperator]} {rules.maxBreakMinutes} min
                </p>
              </div>
            </div>
            <Switch
              checked={rules.breakLimitEnabled}
              onCheckedChange={v => onUpdate({ breakLimitEnabled: v })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={rules.breakOperator}
              onValueChange={(v) => onUpdate({ breakOperator: v as RuleOperator })}
              disabled={!rules.breakLimitEnabled}
            >
              <SelectTrigger className="w-20 h-8 rounded-lg text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map(op => (
                  <SelectItem key={op} value={op}>{op}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              max={480}
              value={rules.maxBreakMinutes}
              onChange={e => onUpdate({ maxBreakMinutes: parseInt(e.target.value) || 60 })}
              className="w-20 h-8 text-sm text-center rounded-lg"
              disabled={!rules.breakLimitEnabled}
            />
            <span className="text-xs text-muted-foreground">minutes</span>
          </div>
        </div>

        {/* Work hours rule */}
        <div className="rounded-xl bg-background/60 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <div>
                <Label className="text-sm font-medium">Working Hours Rule</Label>
                <p className="text-xs text-muted-foreground">
                  Alert when net work is {OPERATOR_LABELS[rules.workOperator]} {rules.minWorkHours} hrs
                </p>
              </div>
            </div>
            <Switch
              checked={rules.minWorkEnabled}
              onCheckedChange={v => onUpdate({ minWorkEnabled: v })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={rules.workOperator}
              onValueChange={(v) => onUpdate({ workOperator: v as RuleOperator })}
              disabled={!rules.minWorkEnabled}
            >
              <SelectTrigger className="w-20 h-8 rounded-lg text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map(op => (
                  <SelectItem key={op} value={op}>{op}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={rules.minWorkHours}
              onChange={e => onUpdate({ minWorkHours: parseFloat(e.target.value) || 9 })}
              className="w-20 h-8 text-sm text-center rounded-lg"
              disabled={!rules.minWorkEnabled}
            />
            <span className="text-xs text-muted-foreground">hours</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
