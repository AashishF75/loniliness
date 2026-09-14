import { API_URL, fetchApi } from './api';

export interface VerificationStatusResponse {
  success: boolean;
  role: string;
  verified: boolean;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'NEEDS_REVIEW' | 'VERIFIED' | 'REJECTED';
  dob?: string | null;
  age?: number | null;
  verifiedAt?: string | null;
  verificationFailureReason?: string | null;
  verificationSubmittedAt?: string | null;
  request?: {
    id: string;
    status: string;
    declaredDob: string;
    extractedAge: number | null;
    dobMatched: boolean;
    nameMatchScore: number | null;
    rejectionReason: string | null;
    createdAt: string;
    reviewedAt: string | null;
  } | null;
}

export const verificationService = {
  async getStatus(): Promise<VerificationStatusResponse> {
    return await fetchApi('/verification/status');
  },

  async submitVerification(formData: FormData) {
    const token = localStorage.getItem('saathi_auth_token');
    const response = await fetch(`${API_URL}/verification/submit`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
        // Do NOT set Content-Type so the browser sets multipart/form-data with boundary
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Verification submission failed' }));
      throw new Error(error.message || `Submission failed with status ${response.status}`);
    }

    return response.json();
  }
};
