import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  approved: "bg-success/15 text-[color:var(--success)] border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  completed: "bg-accent text-accent-foreground border-accent",
  in_use: "bg-primary/15 text-primary border-primary/30",
  available: "bg-success/15 text-[color:var(--success)] border-success/30",
  maintenance: "bg-warning/15 text-warning-foreground border-warning/30",
  unavailable: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status] ?? "")}>
      {statusLabel[status] ?? status}
    </Badge>
  );
}