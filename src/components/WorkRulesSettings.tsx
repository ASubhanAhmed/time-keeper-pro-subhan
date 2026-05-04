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
        {/* Break range rule */}
        <div className="rounded-xl bg-background/60 p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Coffee className="h-4 w-4 text-accent-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <Label className="text-sm font-medium">Break Duration Range</Label>
                <p className="text-xs text-muted-foreground break-words">
                  Alert when break is {OPERATOR_LABELS[rules.breakOperator]} {rules.minBreakMinutes} & {OPERATOR_LABELS[rules.breakOperator2]} {rules.maxBreakMinutes} min
                </p>
              </div>
            </div>
            <Switch
              checked={rules.breakLimitEnabled}
              onCheckedChange={v => onUpdate({ breakLimitEnabled: v })}
            />
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-1.5 sm:gap-2">
            <Input
              type="number" min={0} max={480}
              value={rules.minBreakMinutes}
              onChange={e => onUpdate({ minBreakMinutes: parseInt(e.target.value) || 0 })}
              className="w-full min-w-0 h-8 px-1 text-sm text-center rounded-lg"
              disabled={!rules.breakLimitEnabled}
            />
            <Select value={rules.breakOperator} onValueChange={v => onUpdate({ breakOperator: v as RuleOperator })} disabled={!rules.breakLimitEnabled}>
              <SelectTrigger className="w-14 h-8 px-2 rounded-lg text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{OPERATORS.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-[10px] sm:text-xs text-muted-foreground px-0.5">break</span>
            <Select value={rules.breakOperator2} onValueChange={v => onUpdate({ breakOperator2: v as RuleOperator })} disabled={!rules.breakLimitEnabled}>
              <SelectTrigger className="w-14 h-8 px-2 rounded-lg text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{OPERATORS.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-1 min-w-0">
              <Input
                type="number" min={0} max={480}
                value={rules.maxBreakMinutes}
                onChange={e => onUpdate({ maxBreakMinutes: parseInt(e.target.value) || 0 })}
                className="w-full min-w-0 h-8 px-1 text-sm text-center rounded-lg"
                disabled={!rules.breakLimitEnabled}
              />
              <span className="text-[10px] sm:text-xs text-muted-foreground">min</span>
            </div>
          </div>
        </div>

        {/* Work hours range rule */}
        <div className="rounded-xl bg-background/60 p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <Label className="text-sm font-medium">Working Hours Range</Label>
                <p className="text-xs text-muted-foreground break-words">
                  Alert when net work is {OPERATOR_LABELS[rules.workOperator]} {rules.minWorkHours} & {OPERATOR_LABELS[rules.workOperator2]} {rules.maxWorkHours} hrs
                </p>
              </div>
            </div>
            <Switch
              checked={rules.minWorkEnabled}
              onCheckedChange={v => onUpdate({ minWorkEnabled: v })}
            />
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-1.5 sm:gap-2">
            <Input
              type="number" min={0} max={24} step={0.5}
              value={rules.minWorkHours}
              onChange={e => onUpdate({ minWorkHours: parseFloat(e.target.value) || 0 })}
              className="w-full min-w-0 h-8 px-1 text-sm text-center rounded-lg"
              disabled={!rules.minWorkEnabled}
            />
            <Select value={rules.workOperator} onValueChange={v => onUpdate({ workOperator: v as RuleOperator })} disabled={!rules.minWorkEnabled}>
              <SelectTrigger className="w-14 h-8 px-2 rounded-lg text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{OPERATORS.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-[10px] sm:text-xs text-muted-foreground px-0.5">work</span>
            <Select value={rules.workOperator2} onValueChange={v => onUpdate({ workOperator2: v as RuleOperator })} disabled={!rules.minWorkEnabled}>
              <SelectTrigger className="w-14 h-8 px-2 rounded-lg text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{OPERATORS.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-1 min-w-0">
              <Input
                type="number" min={0} max={24} step={0.5}
                value={rules.maxWorkHours}
                onChange={e => onUpdate({ maxWorkHours: parseFloat(e.target.value) || 0 })}
                className="w-full min-w-0 h-8 px-1 text-sm text-center rounded-lg"
                disabled={!rules.minWorkEnabled}
              />
              <span className="text-[10px] sm:text-xs text-muted-foreground">hrs</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
