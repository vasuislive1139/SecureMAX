import { CommandCenterView } from '@/components/admin/CommandCenterView';
import { QuickUserRegistrationCard } from '@/components/admin/QuickUserRegistrationCard';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  return (
    <div className="space-y-6 pb-12">
      <CommandCenterView />
      <div className="max-w-7xl mx-auto px-6">
        <QuickUserRegistrationCard />
      </div>
    </div>
  );
}
