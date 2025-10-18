import type { DashboardRequest, DashboardResponse } from '@/types/dashboard';

const API_BASE_URL = 'https://otkroimosprom-backend.vercel.app';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = 'Unexpected error';
    try {
      const data = await response.json();
      message = data?.detail ?? data?.message ?? message;
    } catch {
      // ignore json parse errors
    }
    throw new Error(message);
  }
  try {
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const decoded = decoder.decode(buffer);
    return JSON.parse(decoded) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to parse response');
  }
}

export async function createDashboard(request: DashboardRequest): Promise<DashboardResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  return handleResponse<DashboardResponse>(response);
}

export async function retrieveDashboard(uid: string | number): Promise<DashboardResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/${uid}`);
  return handleResponse<DashboardResponse>(response);
}

export const api = {
  createDashboard,
  retrieveDashboard
};


