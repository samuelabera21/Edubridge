"use client";

import { FormEvent, useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";

export default function SubmitExplanationCard() {
  const [absenceDate, setAbsenceDate] = useState("");
  const [teachers, setTeachers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [recipientTeacherId, setRecipientTeacherId] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<{ data: string; name: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApi("/student/attendance/teachers")
      .then(async (response) => {
        if (!response.ok) throw new Error("Teacher list request failed");
        const data = await response.json();
        setTeachers(Array.isArray(data) ? data : []);
      })
      .catch(() => setMessage("Could not load teachers for this section."));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const response = await fetchApi("/student/attendance/explanation", {
        method: "POST",
        body: JSON.stringify({
          absenceDate,
          recipientTeacherId,
          description,
          attachmentData: attachment?.data,
          attachmentName: attachment?.name,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not submit explanation.");
      setDescription("");
      setAbsenceDate("");
      setRecipientTeacherId("");
      setAttachment(null);
      setMessage("Your explanation was submitted for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit explanation.");
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
      setMessage("Choose a JPG, PNG, WEBP, or PDF file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("The attachment must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAttachment({ data: String(reader.result), name: file.name });
    reader.readAsDataURL(file);
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Submit Explanation</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Absence date
          <input type="date" value={absenceDate} onChange={(event) => setAbsenceDate(event.target.value)} required className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700" />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Send explanation to
          <select value={recipientTeacherId} onChange={(event) => setRecipientTeacherId(event.target.value)} required className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <option value="">Choose a teacher</option>
            {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</option>)}
          </select>
        </label>
        <textarea
          rows={5}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Write your explanation for an absence or lateness..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 outline-none ring-0 placeholder:text-gray-400"
          required
        />
        <label className="block text-sm font-medium text-gray-700">
          Hospital paper or supporting document
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleAttachmentChange}
            className="mt-2 block w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-800"
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">JPG, PNG, WEBP, or PDF up to 5 MB.</span>
        </label>
        {attachment && <p className="text-xs text-emerald-700">Attached: {attachment.name}</p>}
        <button type="submit" disabled={submitting} className="rounded-xl bg-[#006b3f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005334] disabled:opacity-60">
          {submitting ? "Submitting..." : "Submit explanation"}
        </button>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </form>
    </section>
  );
}
