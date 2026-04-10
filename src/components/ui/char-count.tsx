import { cn } from "@/lib/utils";

interface CharCountProps {
  current: number;
  max: number;
  className?: string;
}

export function CharCount({ current, max, className }: CharCountProps) {
  const exceeded = current > max;
  return (
    <p
      className={cn(
        "text-xs text-right",
        exceeded ? "text-red-500 font-medium" : "text-muted-foreground",
        className,
      )}
    >
      {current}/{max}
      {exceeded && " — exceeds limit!"}
    </p>
  );
}
