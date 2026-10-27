"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  X,
  Clock,
  User,
  ShieldCheck,
  Send,
  Calendar,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { fetchApi } from "../../../../lib/api";

type TeacherOption = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  photoUrl?: string | null;
  assignments?: Array<{
    subject: { name: string; code?: string };
  }>;
};

type ExplanationSubmission = {
  id: string;
  type: string;
  description: string;
  absenceDate: string | null;
  recipientTeacherId: string | null;
  attachmentData: string | null;
  attachmentName: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
};

const EXCUSE_CATEGORIES = [
  { label: "Medical / Illness", prefix: "[Medical] " },
  { label: "Family Emergency", prefix: "[Family Emergency] " },
  { label: "Official Event", prefix: "[Official School Event] " },
  { label: "Transportation", prefix: "[Transit Disruption] " },
  { label: "Other", prefix: "[Personal] " },
];

export default function SubmitExplanationCard() {
  const searchParams = useSearchParams();
  const prefilledDate = searchParams.get("date") || "";

  const [absenceDate, setAbsenceDate] = useState(prefilledDate);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [recipientTeacherId, setRecipientTeacherId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Medical / Illness");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<{ data: string; name: string; size: number } | null>(null);

  // Submissions tracking
  const [submissions, setSubmissions] = useState<ExplanationSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  // Unexcused dates for 1-click helper
  const [unexcusedDates, setUnexcusedDates] = useState<string[]>([]);

  // Form states
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // When prefilled date changes from URL
  useEffect(() => {
    if (prefilledDate) {
      setAbsenceDate(prefilledDate);
    }
  }, [prefilledDate]);

  // Load teachers, past submissions, and unexcused dates
  async function loadData() {
    try {
      // 1. Teachers
      const teacherRes = await fetchApi("/student/attendance/teachers").catch(() => null);
      if (teacherRes && teacherRes.ok) {
        const teacherData = await teacherRes.json();
        if (Array.isArray(teacherData)) {
          setTeachers(teacherData);
          if (teacherData.length > 0 && !recipientTeacherId) {
            setRecipientTeacherId(teacherData[0].id);
          }
        }
      }

      // 2. Past explanations
      const expRes = await fetchApi("/student/attendance/explanations").catch(() => null);
      if (expRes && expRes.ok) {
        const expData = await expRes.json();
        if (Array.isArray(expData)) {
          setSubmissions(expData);
        }
      } else {
        // Fallback to dashboard supportFlags
        const dashRes = await fetchApi("/student/dashboard").catch(() => null);
        if (dashRes && dashRes.ok) {
          const dashData = await dashRes.json();
          if (Array.isArray(dashData.supportFlags)) {
            const attFlags = dashData.supportFlags.filter((f: any) => f.type === "ATTENDANCE");
            setSubmissions(attFlags);
          }
        }
      }

      // 3. Unexcused dates helper
      const attRes = await fetchApi("/student/attendance").catch(() => null);
      if (attRes && attRes.ok) {
        const attData = await attRes.json();
        if (Array.isArray(attData)) {
          const absentDates = attData
            .filter((r: any) => r.status === "ABSENT")
            .map((r: any) => r.date.split("T")[0]);
          setUnexcusedDates(Array.from(new Set(absentDates)));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubmissions(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!absenceDate) {
      setMessage({ type: "error", text: "Please select the date of your absence." });
      return;
    }
    if (!recipientTeacherId) {
      setMessage({ type: "error", text: "Please select an assigned recipient teacher." });
      return;
    }
    if (!description.trim()) {
      setMessage({ type: "error", text: "Please provide a clear written explanation." });
      return;
    }

    setSubmitting(true);
    try {
      const fullDescription = description.startsWith("[")
        ? description
        : `[${selectedCategory}] ${description.trim()}`;

      const response = await fetchApi("/student/attendance/explanation", {
        method: "POST",
        body: JSON.stringify({
          absenceDate,
          recipientTeacherId,
          description: fullDescription,
          attachmentData: attachment?.data,
          attachmentName: attachment?.name,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Could not submit explanation.");
      }

      // Success
      setMessage({
        type: "success",
        text: "Your formal attendance explanation was successfully submitted and routed to your teacher for review.",
      });
      setDescription("");
      setAttachment(null);

      // Refresh submissions
      loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not submit explanation.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setAttachment(null);
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      setMessage({ type: "error", text: "Supported file formats: JPG, PNG, WEBP, or PDF." });
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "The attachment file must be 5 MB or smaller." });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        data: String(reader.result),
        name: file.name,
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* LEFT COLUMN: The Excuse Request Form */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-indigo-100 p-1 text-indigo-700">
              <FileText className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Official Attendance Excuse Request
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Submit a formal notice with optional medical/parent verification. Once approved by your
            teacher or admin, the unexcused record will be converted to Excused status.
          </p>
        </div>

        {/* Feedback message banner */}
        {message && (
          <div
            className={`mt-4 flex items-start gap-3 rounded-xl p-3.5 text-xs font-medium ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            )}
            <p className="flex-1">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Quick 1-click select from unexcused dates */}
          {unexcusedDates.length > 0 && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                1-Click Select: Recent Unexcused Dates
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {unexcusedDates.slice(0, 5).map((date) => (
                  <button
                    key={`unexcused-${date}`}
                    type="button"
                    onClick={() => setAbsenceDate(date)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      absenceDate === date
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-white text-slate-700 border border-rose-200 hover:bg-rose-100"
                    }`}
                  >
                    {new Date(date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Absence Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Absence Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={absenceDate}
              onChange={(e) => setAbsenceDate(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          {/* Recipient Teacher Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Recipient Teacher / Supervisor <span className="text-rose-500">*</span>
            </label>
            <select
              value={recipientTeacherId}
              onChange={(e) => setRecipientTeacherId(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
            >
              <option value="">Choose an assigned instructor</option>
              {teachers.map((teacher) => {
                const subject = teacher.assignments?.[0]?.subject?.name;
                return (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName}
                    {subject ? ` (${subject})` : ""}
                  </option>
                );
              })}
            </select>
            {teachers.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-600">
                Loading assigned faculty for your section...
              </p>
            )}
          </div>

          {/* Reason Category Pills */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Reason Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EXCUSE_CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setSelectedCategory(cat.label)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    selectedCategory === cat.label
                      ? "bg-[#184973] text-white font-bold shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Narrative */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Detailed Written Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a clear, detailed explanation of why you missed the session..."
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Include specific details such as symptoms, doctor visits, or unavoidable travel.
            </p>
          </div>

          {/* Supporting Document / Medical Certificate */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Supporting Medical Slip or Parent Note (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition">
                <UploadCloud className="h-4 w-4 text-indigo-600" />
                <span>Upload Document</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleAttachmentChange}
                  className="hidden"
                />
              </label>

              {attachment && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                  <Paperclip className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-semibold max-w-[200px] truncate">{attachment.name}</span>
                  <span className="text-[10px] text-emerald-600">
                    ({Math.round(attachment.size / 1024)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="ml-1 rounded-full p-0.5 text-emerald-700 hover:bg-emerald-200 transition"
                    title="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Accepted formats: JPG, PNG, WEBP, or PDF up to 5 MB.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#184973] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-[#123655] disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-300" />
                  <span>Submitting Notice...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 text-indigo-300" />
                  <span>Submit Explanation for Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* RIGHT COLUMN: Submission History & Real-Time Review Status */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                Submitted Explanations
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track status updates from teachers and school administration.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
              title="Refresh submissions"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Submissions List */}
          <div className="mt-4 space-y-3">
            {loadingSubmissions ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-600" />
                Checking review statuses...
              </div>
            ) : submissions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                <FileText className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">No submissions on file</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  When you submit an explanation for an absence, you can monitor review progress and
                  notes here.
                </p>
              </div>
            ) : (
              submissions.map((item) => {
                const isResolved = Boolean(item.resolvedAt);
                const absDate = item.absenceDate
                  ? new Date(item.absenceDate).toLocaleDateString()
                  : "General session";
                const submittedDate = new Date(item.createdAt).toLocaleDateString();

                return (
                  <div
                    key={item.id}
                    className="group rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-[#4085b3] hover:shadow-xs transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-[#4085b3] transition-colors">
                        Absence: {absDate}
                      </span>
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Approved & Excused
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          <Clock className="h-3 w-3 text-amber-600" />
                          Pending Review
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                      {item.description}
                    </p>

                    {item.attachmentName && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-indigo-700">
                        <Paperclip className="h-3 w-3" />
                        <span>Attached: {item.attachmentName}</span>
                      </div>
                    )}

                    {/* Resolution Note if reviewed by teacher */}
                    {item.resolution && (
                      <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-[11px] text-emerald-900">
                        <span className="font-bold">Faculty Feedback: </span>
                        {item.resolution}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] text-slate-400">
                      <span>Submitted on {submittedDate}</span>
                      <span>Ticket #{item.id.slice(-6)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Informative Policy Note */}
        <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs text-indigo-900">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Official Processing:</strong> Submitted explanations are reviewed within 48
              hours. Once approved, the school registry automatically marks the session as Excused.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
