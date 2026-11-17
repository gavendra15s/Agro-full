import { SettingsForm } from "@/components/settings/settings-form";

export const metadata = { title: "Settings & Profile — KhetYatra" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <SettingsForm />
    </div>
  );
}
