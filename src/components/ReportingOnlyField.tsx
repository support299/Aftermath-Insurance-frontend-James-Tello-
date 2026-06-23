import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ReportingOnlyFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function ReportingOnlyField({ checked, onCheckedChange }: ReportingOnlyFieldProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:col-span-2">
      <Checkbox
        id="reporting_only"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <div className="space-y-1">
        <Label htmlFor="reporting_only" className="cursor-pointer font-medium">
          Reporting only (do not update GoHighLevel)
        </Label>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Record this sale on dashboards and leaderboards only. The linked GoHighLevel contact will
          not be updated — no custom fields, tags, workflows, emails, or texts will be triggered.
        </p>
      </div>
    </div>
  );
}
