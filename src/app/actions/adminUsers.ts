'use server';

import { deviceStore, StoredUser } from '@/lib/auth/deviceStore';
import { UserRole, UserStatus } from '@/types';
import crypto from 'crypto';

export interface AdminCreateUserResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    did: string;
    status: string;
    enrollmentCode?: string;
  };
  error?: string;
}

export async function getRegisteredPersonnel() {
  const users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    did: string;
    status: string;
    created_at: string;
  }> = [];

  for (const user of deviceStore.users.values()) {
    // Deduplicate by ID
    if (!users.some(u => u.id === user.id)) {
      users.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        did: user.did,
        status: user.status,
        created_at: user.created_at,
      });
    }
  }

  return users;
}

export async function registerNewUserByAdmin(formData: {
  name: string;
  email: string;
  role: 'USER' | 'MANAGER' | 'AUDITOR';
  deviceName?: string;
}): Promise<AdminCreateUserResult> {
  try {
    const cleanEmail = String(formData.email || '').toLowerCase().trim();
    const cleanName = String(formData.name || '').trim();

    if (!cleanEmail || !cleanName) {
      return { success: false, error: 'Please enter both a name and an email address.' };
    }

    const role = formData.role === 'AUDITOR' 
      ? UserRole.AUDITOR 
      : formData.role === 'MANAGER' 
      ? UserRole.MANAGER 
      : UserRole.USER;

    const { user: newUser, enrollmentCode: code } = deviceStore.registerUser({
      name: cleanName,
      email: cleanEmail,
      role,
    });

    return {
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role === UserRole.AUDITOR ? 'Auditor' : 'Team Member',
        did: newUser.did,
        status: 'Active',
        enrollmentCode: code,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to register user.',
    };
  }
}
