import { AlertTriangle, CheckCircle2, FileSearch, Radio, ShieldCheck } from "lucide-react";
import { ReportForm } from "@/components/report/report-form";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Report a Landslide — KhetYatra" };

const ASSURANCES = [
  { icon: ShieldCheck, label: "Secured Uplink" },
  { icon: Radio, label: "GPS Tagged" },
  { icon: FileSearch, label: "Real-time Sync" },
];

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Report Landslide / Hazard
          </h1>
          <p className="mt-4 text-lg text-ink-muted">
            Your immediate reporting helps rural communities and travellers stay safe. Data is
            shared directly across the safety network.
          </p>

          <div className="mt-6 border-l-4 border-warn bg-black/[0.03] p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
              <AlertTriangle size={18} className="text-warn" aria-hidden />
              Automated Verification
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Images are processed by our automated system. False reports are logged and may result
              in access restrictions.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-line bg-surface p-6 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-subtle">
              Evidence Guidelines
            </h3>
            <ul className="space-y-2.5 text-xs text-ink-muted">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-safe shrink-0 mt-0.5" />
                <span>Capture a clear, wide-angle photo showing slope movement or road blockage.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-safe shrink-0 mt-0.5" />
                <span>Allow GPS location permissions to automatically lock accurate coordinates.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-safe shrink-0 mt-0.5" />
                <span>Describe severity, weather conditions, or blocked access routes in the details box.</span>
              </li>
            </ul>
          </div>
        </div>

        <div>
          <ReportForm />

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {ASSURANCES.map(({ icon: Icon, label }) => (
              <Card key={label} className="flex flex-col items-center gap-2 p-4 text-center">
                <Icon size={22} className="text-brand-700" aria-hidden />
                <span className="text-sm font-semibold">{label}</span>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
