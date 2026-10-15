"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Send, UserRound } from "lucide-react";
import { fetchApi } from "@/lib/api";

type Teacher = { id: string; userId: string | null; firstName: string; lastName: string; photoUrl?: string | null; assignments: { subject: { name: string } }[] };
type Message = { id: string; senderId: string; receiverId: string; content: string; isRead: boolean; createdAt: string; sender: { id: string; name: string | null }; receiver: { id: string; name: string | null } };

export default function StudentTeacherMessagesPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTeacher = teachers.find((teacher) => teacher.userId === selectedTeacherId) ?? teachers[0] ?? null;
  const conversation = useMemo(() => selectedTeacher?.userId ? messages.filter((message) => message.senderId === selectedTeacher.userId || message.receiverId === selectedTeacher.userId) : [], [messages, selectedTeacher]);

  useEffect(() => {
    async function loadTeachers() {
      try {
        const response = await fetchApi("/student/communication/teachers");
        if (!response.ok) throw new Error("Unable to load assigned teachers");
        const data = await response.json();
        const assigned = Array.isArray(data) ? data as Teacher[] : [];
        setTeachers(assigned.filter((teacher) => teacher.userId));
        setSelectedTeacherId(assigned.find((teacher) => teacher.userId)?.userId ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load assigned teachers");
      } finally {
        setLoading(false);
      }
    }
    void loadTeachers();
  }, []);

  useEffect(() => {
    async function loadMessages() {
      if (!selectedTeacher?.userId) return;
      const response = await fetchApi(`/student/communication/messages?otherUserId=${encodeURIComponent(selectedTeacher.userId)}`);
      if (response.ok) setMessages(await response.json());
    }
    void loadMessages();
  }, [selectedTeacher]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTeacher?.userId || !content.trim()) return;
    setSending(true);
    const response = await fetchApi("/student/communication/messages", {
      method: "POST",
      body: JSON.stringify({ receiverId: selectedTeacher.userId, content: content.trim() })
    });
    if (response.ok) {
      const sentMessage = await response.json() as Message;
      setMessages((current) => [...current, sentMessage]);
      setContent("");
    }
    setSending(false);
  }

  if (loading) return <div className="mx-auto max-w-6xl rounded-xl bg-white p-6 text-sm text-gray-500">Loading your assigned teachers...</div>;
  if (error) return <div className="mx-auto max-w-6xl rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</div>;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <header className="flex items-start gap-3 border-b border-gray-200 pb-5">
        <div className="rounded-lg bg-blue-100 p-2.5 text-blue-800"><MessageSquare className="h-5 w-5" /></div>
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-800">Communication · Direct contact</p><h1 className="mt-1 text-2xl font-bold text-gray-900">Teacher Messages</h1><p className="mt-1 text-sm text-gray-600">Contact teachers assigned to your current class and section.</p></div>
      </header>

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="px-2 py-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Your teachers</p>
          {teachers.length === 0 ? <p className="p-3 text-sm text-gray-500">No assigned teacher contacts are available.</p> : teachers.map((teacher) => (
            <button key={teacher.id} type="button" onClick={() => setSelectedTeacherId(teacher.userId)} className={`w-full rounded-lg p-3 text-left ${selectedTeacher?.id === teacher.id ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50"}`}>
              <div className="flex items-center gap-3"><div className="rounded-full bg-gray-100 p-2 text-gray-600"><UserRound className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{teacher.firstName} {teacher.lastName}</p><p className="truncate text-xs text-gray-500">{teacher.assignments.map((assignment) => assignment.subject.name).join(" · ")}</p></div></div>
            </button>
          ))}
        </aside>

        <section className="flex min-h-[520px] flex-col rounded-lg border border-gray-200 bg-white">
          {selectedTeacher ? <>
            <div className="border-b border-gray-200 p-4"><p className="font-semibold text-gray-900">{selectedTeacher.firstName} {selectedTeacher.lastName}</p><p className="mt-1 text-xs text-gray-500">{selectedTeacher.assignments.map((assignment) => assignment.subject.name).join(" · ")}</p></div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
              {conversation.length === 0 ? <div className="flex h-full items-center justify-center text-sm text-gray-500">No messages yet. Start the conversation with your teacher.</div> : conversation.map((message) => <div key={message.id} className={`max-w-[80%] rounded-lg p-3 text-sm ${message.senderId === selectedTeacher.userId ? "bg-white text-gray-800" : "ml-auto bg-blue-700 text-white"}`}><p>{message.content}</p><p className={`mt-1 text-[10px] ${message.senderId === selectedTeacher.userId ? "text-gray-400" : "text-blue-100"}`}>{new Date(message.createdAt).toLocaleString()}</p></div>)}
            </div>
            <form onSubmit={sendMessage} className="flex gap-2 border-t border-gray-200 p-3"><input value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write a message to your teacher" className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-600" /><button type="submit" disabled={sending || !content.trim()} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /> Send</button></form>
          </> : <div className="flex flex-1 items-center justify-center p-6 text-sm text-gray-500">Choose an assigned teacher to begin.</div>}
        </section>
      </div>
    </div>
  );
}
