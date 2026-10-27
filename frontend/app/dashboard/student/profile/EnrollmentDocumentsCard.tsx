"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  FileCheck,
  Eye,
  ExternalLink,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileQuestion,
  Download,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import {
  buildStudentProfileView,
  formatDate,
  formatDocumentType,
  formatFileSize,
  type StudentDocumentItem,
  type StudentProfileView,
} from "@/lib/student-profile";

interface EnrollmentDocumentsCardProps {
  initialDocuments?: StudentDocumentItem[];
}

export default function EnrollmentDocumentsCard({ initialDocuments }: EnrollmentDocumentsCardProps) {
  const [profile, setProfile] = useState<StudentProfileView | null>(null);
  const [documents, setDocuments] = useState<StudentDocumentItem[]>(initialDocuments || []);
  const [loading, setLoading] = useState(!initialDocuments);
  const [error, setError] = useState<string | null>(null);

  // Modal preview state
  const [selectedDoc, setSelectedDoc] = useState<StudentDocumentItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    if (initialDocuments && initialDocuments.length > 0) {
      setDocuments(initialDocuments);
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const response = await fetchApi("/student/me");
        if (!response.ok) throw new Error("Failed to load profile documents");
        const data = await response.json();
        const view = buildStudentProfileView(data);
        setProfile(view);
        setDocuments(view.documents || []);
      } catch {
        setError("We could not load your enrollment documents.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [initialDocuments]);

  const openDocumentPreview = (doc: StudentDocumentItem) => {
    setSelectedDoc(doc);
    setZoomLevel(100);
    setRotation(0);
  };

  const closeDocumentPreview = () => {
    setSelectedDoc(null);
    setZoomLevel(100);
    setRotation(0);
  };

  const isImageFile = (url: string, mime?: string | null) => {
    if (mime?.startsWith("image/")) return true;
    const cleanUrl = url.split("?")[0].toLowerCase();
    return cleanUrl.endsWith(".png") || cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg") || cleanUrl.endsWith(".webp") || cleanUrl.endsWith(".gif") || cleanUrl.endsWith(".svg");
  };

  const isPdfFile = (url: string, mime?: string | null) => {
    if (mime === "application/pdf") return true;
    const cleanUrl = url.split("?")[0].toLowerCase();
    return cleanUrl.endsWith(".pdf");
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Verified
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            Verification Issue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            Pending Verification
          </span>
        );
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-5 w-44 rounded bg-gray-200" />
            <div className="h-5 w-24 rounded bg-gray-200" />
          </div>
          <div className="h-14 rounded-xl bg-gray-100" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-32 rounded-xl bg-gray-100" />
            <div className="h-32 rounded-xl bg-gray-100" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="text-sm font-medium">{error}</p>
      </section>
    );
  }

  const verifiedCount = documents.filter((d) => d.verificationStatus?.toUpperCase() === "VERIFIED").length;
  const pendingCount = documents.filter((d) => d.verificationStatus?.toUpperCase() === "PENDING").length;

  return (
    <>
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Card Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#184973] border border-blue-100">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Official Enrollment Documents</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  <Lock className="h-3 w-3" />
                  Read-Only Archive
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Official certificates and identification submitted upon academic registration.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-center">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Total</span>
              <span className="text-xs font-black text-slate-800">{documents.length}</span>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-center">
              <span className="block text-[10px] font-bold uppercase text-emerald-600">Verified</span>
              <span className="text-xs font-black text-emerald-800">{verifiedCount}</span>
            </div>
            {pendingCount > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-center">
                <span className="block text-[10px] font-bold uppercase text-amber-600">Review</span>
                <span className="text-xs font-black text-amber-800">{pendingCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Read-Only Notice Box */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200/80 bg-blue-50/60 p-3.5 text-xs text-[#184973]">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#184973] mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Official Records Verification Protocol</p>
            <p className="text-slate-600 leading-relaxed">
              These intake documents were validated by the school registrar and permanently archived in the National EMIS registry.
              Students have complete viewing and download access. Any corrections or new legal documentation must be submitted directly through your school administration.
            </p>
          </div>
        </div>

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <FileQuestion className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No Documents Uploaded</h3>
            <p className="mt-1 text-xs text-gray-500">
              No enrollment documents have been registered for this academic file yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => {
              const isImg = isImageFile(doc.fileUrl, doc.mimeType);
              const isPdf = isPdfFile(doc.fileUrl, doc.mimeType);

              return (
                <div
                  key={doc.id}
                  className="group relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-all duration-300 hover:border-[#4085b3] hover:shadow-md"
                >
                  <div className="space-y-3">
                    {/* Top Row: Type and Verification Status */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        {formatDocumentType(doc.documentType)}
                      </span>
                      {getStatusBadge(doc.verificationStatus)}
                    </div>

                    {/* Document Icon & Title */}
                    <div className="flex items-start gap-3 pt-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#184973] border border-blue-100">
                        {isImg ? (
                          <FileText className="h-5 w-5 text-blue-600" />
                        ) : isPdf ? (
                          <FileText className="h-5 w-5 text-rose-600" />
                        ) : (
                          <FileText className="h-5 w-5 text-slate-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 group-hover:text-[#4085b3] transition-colors truncate" title={doc.title}>
                          {doc.title || formatDocumentType(doc.documentType)}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {formatFileSize(doc.fileSize)} • {isImg ? "Image (PNG/JPG)" : isPdf ? "PDF Document" : "Official Record"}
                        </p>
                      </div>
                    </div>

                    {/* Registration Date */}
                    {doc.createdAt && (
                      <p className="text-[11px] text-gray-400">
                        Submitted: {formatDate(doc.createdAt)}
                      </p>
                    )}

                    {/* Registrar Notes if present */}
                    {doc.verificationNotes && (
                      <div className="rounded-lg bg-gray-50 border border-gray-100 p-2 text-[11px] text-gray-600 italic">
                        &ldquo;{doc.verificationNotes}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDocumentPreview(doc)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#184973] px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#133a5c] cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View File</span>
                    </button>

                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open file in new window"
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Interactive Document Viewer Modal */}
      {selectedDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label={selectedDoc.title}
        >
          <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5 bg-slate-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-[#184973] shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {selectedDoc.title || formatDocumentType(selectedDoc.documentType)}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <span>{formatDocumentType(selectedDoc.documentType)}</span>
                    <span>•</span>
                    <span>{formatFileSize(selectedDoc.fileSize)}</span>
                  </div>
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Zoom Controls for Images */}
                {isImageFile(selectedDoc.fileUrl, selectedDoc.mimeType) && (
                  <div className="hidden sm:flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                      className="p-1 hover:text-[#184973] cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-semibold text-slate-700 w-10 text-center">{zoomLevel}%</span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
                      className="p-1 hover:text-[#184973] cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <span className="h-3 w-px bg-gray-200 mx-1" />
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1 hover:text-[#184973] cursor-pointer"
                      title="Rotate 90deg"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <a
                  href={selectedDoc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                  title="Open file in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open Original</span>
                </a>

                <button
                  type="button"
                  onClick={closeDocumentPreview}
                  className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  title="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 overflow-auto bg-slate-100/80 p-4 min-h-[380px] flex items-center justify-center">
              {isImageFile(selectedDoc.fileUrl, selectedDoc.mimeType) ? (
                <div className="flex items-center justify-center p-2 min-h-full min-w-full">
                  <img
                    src={selectedDoc.fileUrl}
                    alt={selectedDoc.title}
                    style={{
                      transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                      transition: "transform 0.2s ease",
                      maxHeight: zoomLevel <= 100 ? "65vh" : "none",
                    }}
                    className="rounded-lg shadow-md object-contain border border-slate-200 bg-white"
                  />
                </div>
              ) : isPdfFile(selectedDoc.fileUrl, selectedDoc.mimeType) ? (
                <iframe
                  src={selectedDoc.fileUrl}
                  title={selectedDoc.title}
                  className="w-full h-[65vh] rounded-lg border border-slate-200 bg-white shadow-inner"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm max-w-md">
                  <FileText className="mx-auto h-12 w-12 text-[#184973]" />
                  <h4 className="mt-3 text-sm font-bold text-gray-900">{selectedDoc.title}</h4>
                  <p className="mt-1 text-xs text-gray-500">
                    This file format is archived in your official student repository.
                  </p>
                  <div className="mt-4">
                    <a
                      href={selectedDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#184973] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#133a5c]"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download or Open Document</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <span>
                  Official student document • Read-only verification view (Modifications restricted to registrar).
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={closeDocumentPreview}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
