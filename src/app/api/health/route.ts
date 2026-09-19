import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { supabaseAdmin } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  if (require('@/lib/auth/deviceStore').deviceStore?.readyPromise) {
    await require('@/lib/auth/deviceStore').deviceStore.readyPromise;
  }
  try {
    // Check DB connectivity
    const { error } = await supabaseAdmin.from('users').select('id').limit(1);
    
    if (error) {
      return errorResponse('DB_UNAVAILABLE', 'Database connection failed', 503);
    }

    return successResponse({
      status: 'OK',
      db: 'CONNECTED',
      version: '1.0.0-foundation'
    });
  } catch (error) {
    return errorResponse('INTERNAL_ERROR', 'Health check failed', 500);
  }
}
