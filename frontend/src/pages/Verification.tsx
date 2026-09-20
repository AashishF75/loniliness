import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  ShieldCheck,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Calendar,
  FileText,
  X,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { VerifiedBadge } from '../components/ui/VerifiedBadge';
import { verificationService, type VerificationStatusResponse } from '../services/verificationService';

export function Verification() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusData, setStatusData] = useState<VerificationStatusResponse | null>(null);

  const [declaredDob, setDeclaredDob] = useState('');
  const [documentType, setDocumentType] = useState('AADHAAR');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);

  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadStatus();
    return () => {
      stopCamera();
    };
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await verificationService.getStatus();
      setStatusData(data);
      if (data.dob) {
        setDeclaredDob(new Date(data.dob).toISOString().split('T')[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load verification status.');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Document image must be under 5 MB.');
        return;
      }
      setDocumentFile(file);
      setDocumentPreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Selfie image must be under 5 MB.');
        return;
      }
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access denied:', err);
      setCameraError('Unable to access camera. You can upload a photo file instead.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelfieFile(file);
        setSelfiePreview(URL.createObjectURL(file));
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!declaredDob) {
      setErrorMsg('Please enter your Date of Birth.');
      return;
    }

    const birthYear = new Date(declaredDob).getFullYear();
    const currentYear = new Date().getFullYear();
    if (currentYear - birthYear < 50) {
      setErrorMsg('Saathi Senior Citizen verification is designed for individuals aged 50 and above.');
      return;
    }

    if (!documentFile) {
      setErrorMsg('Please attach a photo of your identity document.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('declaredDob', declaredDob);
      formData.append('documentType', documentType);
      formData.append('document', documentFile);
      if (selfieFile) {
        formData.append('selfie', selfieFile);
      }

      const res = await verificationService.submitVerification(formData);
      if (res.status === 'VERIFIED' || res.verified) {
        setSuccessMsg(t('verification.autoVerifiedSuccess'));
      } else {
        setErrorMsg(t('verification.autoVerifyFailed'));
      }
      await loadStatus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Already Verified State
  if (statusData?.verificationStatus === 'VERIFIED' && statusData?.verified === true) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 flex flex-col gap-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 font-medium">
          <ArrowLeft className="w-5 h-5 mr-1" /> Back
        </button>

        <Card className="p-8 sm:p-12 text-center flex flex-col items-center gap-6 border-2 border-emerald-200 bg-emerald-50/40">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-emerald-300">
            <ShieldCheck className="w-10 h-10 text-emerald-600" />
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">{t('verification.verifiedTitle')}</h1>
            <p className="text-lg sm:text-xl text-gray-600 font-medium max-w-md mx-auto">
              {t('verification.verifiedSeniorDesc')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <VerifiedBadge size="lg" />
          </div>

          {statusData.verifiedAt && (
            <p className="text-sm text-gray-500 font-medium">
              {t('verification.verifiedOn')} {new Date(statusData.verifiedAt).toLocaleDateString()}
            </p>
          )}

          <div className="flex gap-4 mt-4 w-full sm:w-auto">
            <Button onClick={() => navigate('/people')} className="w-full sm:w-auto px-8 h-14 text-lg font-bold">
              {t('verification.findCompanions')}
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full sm:w-auto px-8 h-14 text-lg font-bold">
              {t('verification.dashboard')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Submission Form (for UNVERIFIED, NEEDS_REVIEW, PENDING, or REJECTED)
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 flex flex-col gap-8">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 font-medium">
        <ArrowLeft className="w-5 h-5 mr-1" /> Back
      </button>

      <div>
        <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-800 font-bold px-3 py-1 rounded-xl text-sm mb-3">
          <Shield className="w-4 h-4 text-brand-600" />
          {t('verification.safetyFirst')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
          {t('verification.title')}
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 font-medium">
          {t('verification.subtitle')}
        </p>
      </div>

      {(statusData?.verificationStatus === 'NEEDS_REVIEW' || statusData?.verificationStatus === 'PENDING') && (
        <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-2xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-lg font-bold text-amber-900 mb-1">{t('verification.needsReview')}</h4>
            <p className="text-amber-800 font-medium text-base">
              {t('verification.autoVerifyFailed')}
            </p>
          </div>
        </div>
      )}
      {statusData?.verificationStatus === 'REJECTED' && (
        <div className="bg-red-50 border-2 border-red-200 p-5 rounded-2xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-lg font-bold text-red-900 mb-1">{t('verification.rejected')}</h4>
            <p className="text-red-700 font-medium text-base">
              {statusData.verificationFailureReason || t('verification.autoVerifyFailed')}
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="text-base font-medium">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <p className="text-base font-medium">{successMsg}</p>
        </div>
      )}

      <Card className="p-6 sm:p-10 shadow-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {/* Step 1: Date of Birth */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center">1</span>
              <label className="text-xl font-bold text-gray-800">{t('verification.registeredDob')}</label>
            </div>
            <p className="text-sm text-gray-500 ml-9">{t('verification.immutableDobNote')}</p>
            <div className="relative ml-9">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <Input
                type="date"
                value={declaredDob}
                readOnly={Boolean(statusData?.dob)}
                onChange={(e) => !statusData?.dob && setDeclaredDob(e.target.value)}
                className={`pl-14 h-14 text-lg rounded-2xl ${statusData?.dob ? 'bg-gray-100 cursor-not-allowed text-gray-700' : 'bg-gray-50'} border-2 border-gray-200`}
                required
              />
            </div>
          </div>

          {/* Step 2: Document Type */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center">2</span>
              <label className="text-xl font-bold text-gray-800">Select Document Type</label>
            </div>
            <div className="relative ml-9">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full pl-14 pr-4 h-14 text-lg rounded-2xl bg-gray-50 border-2 border-gray-200 focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="AADHAAR">Aadhaar Card</option>
                <option value="VOTER_ID">Voter ID Card (EPIC)</option>
                <option value="PASSPORT">Passport</option>
                <option value="SENIOR_CARD">Senior Citizen Card</option>
                <option value="DRIVING_LICENSE">Driving License</option>
                <option value="OTHER">Other Government Issued Photo ID</option>
              </select>
            </div>
          </div>

          {/* Step 3: Document Upload */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center">3</span>
              <label className="text-xl font-bold text-gray-800">Upload Photo of ID Document</label>
            </div>
            <p className="text-sm text-gray-500 ml-9">
              Ensure your name and birth date are clearly readable. You may cover your ID number for privacy.
            </p>

            <div className="ml-9">
              {!documentPreview ? (
                <label className="border-2 border-dashed border-gray-300 hover:border-brand-500 bg-gray-50 hover:bg-brand-50/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors">
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    <Upload className="w-8 h-8 text-brand-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-800">Click to upload document photo</p>
                    <p className="text-sm text-gray-500">JPG, PNG, or WebP (max 5 MB)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleDocumentChange}
                  />
                </label>
              ) : (
                <div className="relative border-2 border-brand-200 rounded-2xl overflow-hidden bg-gray-900 p-2">
                  <img
                    src={documentPreview}
                    alt="Document preview"
                    className="max-h-72 w-full object-contain rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentFile(null);
                      setDocumentPreview(null);
                    }}
                    className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-md transition-colors"
                    title="Remove photo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Optional Camera Selfie */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-slate-500 text-white font-bold text-sm flex items-center justify-center">4</span>
                <label className="text-xl font-bold text-gray-800">Photo Selfie (Optional)</label>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded-lg">Recommended</span>
            </div>
            <p className="text-sm text-gray-500 ml-9">
              Taking a quick photo of yourself helps our safety team confirm that you are the genuine account owner.
            </p>

            <div className="ml-9">
              {isCameraActive ? (
                <div className="flex flex-col items-center gap-4 bg-gray-900 p-4 rounded-2xl">
                  <video ref={videoRef} autoPlay playsInline className="w-full max-h-72 rounded-xl object-cover" />
                  <div className="flex gap-3">
                    <Button type="button" onClick={captureSelfie} className="bg-brand-600 hover:bg-brand-700 text-white font-bold">
                      <Camera className="w-5 h-5 mr-2" /> Snap Photo
                    </Button>
                    <Button type="button" variant="outline" onClick={stopCamera} className="border-gray-600 text-white hover:bg-gray-800">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : selfiePreview ? (
                <div className="relative border-2 border-brand-200 rounded-2xl overflow-hidden bg-gray-900 p-2">
                  <img src={selfiePreview} alt="Selfie preview" className="max-h-60 w-full object-contain rounded-xl" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieFile(null);
                      setSelfiePreview(null);
                    }}
                    className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-md"
                    title="Remove selfie"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    className="flex-1 h-14 border-2 border-gray-300 font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <Camera className="w-5 h-5 mr-2 text-brand-600" /> Use Device Camera
                  </Button>
                  <label className="flex-1 h-14 border-2 border-gray-300 font-bold text-gray-700 hover:bg-gray-50 rounded-2xl flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-5 h-5 text-brand-600" /> Upload Selfie Photo
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleSelfieUpload} />
                  </label>
                </div>
              )}
              {cameraError && <p className="text-sm text-red-600 mt-2">{cameraError}</p>}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="h-16 text-xl font-bold shadow-md w-full mt-2"
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('verification.autoVerifying')}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ShieldCheck className="w-6 h-6" /> {t('verification.submitVerification')}
              </span>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
