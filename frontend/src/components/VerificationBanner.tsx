import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Clock, AlertCircle, ArrowRight, X } from 'lucide-react';
import { Button } from './ui/Button';

interface VerificationBannerProps {
  status: 'UNVERIFIED' | 'PENDING' | 'NEEDS_REVIEW' | 'VERIFIED' | 'REJECTED' | string;
  verified?: boolean;
  role?: string;
  className?: string;
}

export function VerificationBanner({ status, verified, role = 'SENIOR', className = '' }: VerificationBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Only seniors need to see verification banners
  if (role !== 'SENIOR' || (status === 'VERIFIED' && verified === true) || dismissed) {
    return null;
  }

  if (status === 'NEEDS_REVIEW' || status === 'PENDING') {
    return (
      <div className={`bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-sm ${className}`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-bold text-blue-900">Verification Under Review</h4>
            <p className="text-sm sm:text-base text-blue-700 font-medium">
              Our safety team is reviewing your submitted document. You will be notified as soon as it is approved.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-blue-500 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  if (status === 'REJECTED') {
    return (
      <div className={`bg-red-50 border-2 border-red-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${className}`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 bg-red-100 text-red-700 rounded-xl shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-bold text-red-900">Verification Needs Resubmission</h4>
            <p className="text-sm sm:text-base text-red-700 font-medium">
              Your previous document could not be verified. Please submit a clearer photo of your ID card.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <Button
            onClick={() => navigate('/verify')}
            className="bg-red-600 hover:bg-red-700 text-white font-bold w-full sm:w-auto h-11 px-5"
          >
            Resubmit ID <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="text-red-400 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-100 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // UNVERIFIED
  return (
    <div className={`bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base sm:text-lg font-bold text-amber-950">Verify Your Senior Citizen Status</h4>
          <p className="text-sm sm:text-base text-amber-800 font-medium">
            To prevent impersonators and protect our senior members, verifying your age with an ID card is required before sending connection requests.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
        <Button
          onClick={() => navigate('/verify')}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold w-full sm:w-auto h-11 px-5"
        >
          Verify Now <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-500 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-100 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
