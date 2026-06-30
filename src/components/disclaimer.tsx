import { ShieldAlert } from "lucide-react";

export function Disclaimer({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground/80">
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      <p className="leading-snug">
        {children ??
          "General information only. FinAssist AI does not provide regulated financial, investment, tax, or legal advice (FAIS Act, Republic of South Africa). Always verify with a qualified, FSCA-authorised adviser."}
      </p>
    </div>
  );
}
