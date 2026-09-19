import * as React from 'react';
import { getVerifiedSession } from '@/lib/auth/session';
import { AuditorDashboardView } from '@/components/auditor/AuditorDashboardView';

export const dynamic = 'force-dynamic';

export default async function AuditorDashboardPage() {
  await getVerifiedSession(); // Validate active session

  return <AuditorDashboardView />;
}
