import * as React from 'react';
import { AuditorDashboardView } from '@/components/auditor/AuditorDashboardView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AuditTrailPage() {
  return <AuditorDashboardView />;
}
