"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  User,
  Zap,
} from "lucide-react";
import { fetchApi } from "../../../../lib/api";
import AssistantHeader from "./AssistantHeader";

type StudentSubject = {
  id: string;
  name: string;
  code?: string;
  teacherName?: string;
};

function StudentAssistantPageContent() {
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") as "explain" | "practice" | "plan") || "explain";

  const [mode, setMode] = useState<"explain" | "practice" | "plan">(initialMode);
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [gradeName, setGradeName] = useState<string>("Grade");
  const [sectionName, setSectionName] = useState<string>("Section");
  const [loading, setLoading] = useState(true);

  // Concept Explainer state
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [conceptQuery, setConceptQuery] = useState("");
  const [explanationStyle, setExplanationStyle] = useState<"simple" | "detailed" | "exam">("simple");
  const [explanationOutput, setExplanationOutput] = useState<{
    topic: string;
    summary: string;
    keyPoints: string[];
    example: string;
    quickCheck: string;
  } | null>(null);
  const [explaining, setExplaining] = useState(false);

  // Guided Practice state
  const [practiceSubject, setPracticeSubject] = useState<string>("");
  const [practiceQuestion, setPracticeQuestion] = useState<{
    subject: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  } | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasCheckedAnswer, setHasCheckedAnswer] = useState(false);

  // Study Plan state
  const [studyHoursPerDay, setStudyHoursPerDay] = useState(2);
  const [studyFocus, setStudyFocus] = useState<string>("all");
  const [generatedPlan, setGeneratedPlan] = useState<Array<{
    day: string;
    subject: string;
    tasks: string[];
    duration: string;
  }> | null>(null);

  useEffect(() => {
    async function loadStudentData() {
      try {
        const res = await fetchApi("/student/dashboard");
        if (res.ok) {
          const data = await res.json();
          const enrolledGrade = data.enrollment?.schoolGrade?.grade?.name || "Grade 5";
          const enrolledSection = data.enrollment?.section?.name ? `Section ${data.enrollment.section.name}` : "Section A";
          setGradeName(enrolledGrade);
          setSectionName(enrolledSection);

          const list: StudentSubject[] = [];
          if (Array.isArray(data.subjects) && data.subjects.length > 0) {
            data.subjects.forEach((s: any) => {
              list.push({
                id: s.id || s.subject.name,
                name: s.subject.name,
                code: s.subject.code,
                teacherName: s.teacher ? `${s.teacher.firstName} ${s.teacher.lastName}` : undefined,
              });
            });
          } else if (Array.isArray(data.weeklyClasses)) {
            const seen = new Set<string>();
            data.weeklyClasses.forEach((c: any) => {
              const name = c.teachingAssignment?.subject?.name;
              if (name && !seen.has(name)) {
                seen.add(name);
                list.push({
                  id: c.id,
                  name,
                  code: c.teachingAssignment?.subject?.code,
                  teacherName: c.teachingAssignment?.teacher
                    ? `${c.teachingAssignment.teacher.firstName} ${c.teachingAssignment.teacher.lastName}`
                    : undefined,
                });
              }
            });
          }

          setSubjects(list);
          if (list.length > 0) {
            setSelectedSubject(list[0].name);
            setPracticeSubject(list[0].name);
          }
        }
      } catch (err) {
        console.error("Failed to load student assistant subjects", err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentData();
  }, []);

  // Handle Explain Concept
  const handleExplain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conceptQuery.trim() || !selectedSubject) return;

    setExplaining(true);
    setTimeout(() => {
      setExplanationOutput({
        topic: `${conceptQuery} in ${selectedSubject}`,
        summary: `In ${gradeName} ${selectedSubject}, "${conceptQuery}" is an essential building block. It establishes core foundational understanding that prepares you for both classroom quizzes and national curriculum competencies.`,
        keyPoints: [
          `Fundamental Definition: "${conceptQuery}" defines how components interact within the scope of ${selectedSubject}.`,
          `Core Rule: Always verify conditions and review instructional steps provided by your teacher before calculating or reasoning.`,
          `Practical Application: In everyday life and Ethiopian context, understanding this concept helps solve real problems accurately.`,
        ],
        example: `Practical Demonstration: When applied to a standard ${gradeName} problem, break down the known inputs, apply the formula or grammatical pattern, and verify the outcome step by step.`,
        quickCheck: `Quick Self-Check Question: Can you rephrase the meaning of ${conceptQuery} in your own words in 2 sentences?`,
      });
      setExplaining(false);
    }, 400);
  };

  // Generate Guided Practice Question
  const handleGeneratePractice = () => {
    const sub = practiceSubject || (subjects[0]?.name ?? "General Science");
    setSelectedOption(null);
    setHasCheckedAnswer(false);

    if (sub.toLowerCase().includes("math")) {
      setPracticeQuestion({
        subject: sub,
        question: `In ${gradeName} Mathematics, what is the least common multiple (LCM) of 6 and 8?`,
        options: ["14", "24", "48", "16"],
        correctIndex: 1,
        explanation: "Multiples of 6 are 6, 12, 18, 24... Multiples of 8 are 8, 16, 24... The smallest shared multiple is 24.",
      });
    } else if (sub.toLowerCase().includes("english")) {
      setPracticeQuestion({
        subject: sub,
        question: `Choose the correct past continuous verb form: "While we _____ for the bus, it began to rain."`,
        options: ["were waiting", "was wait", "are waiting", "waited"],
        correctIndex: 0,
        explanation: 'We use the past continuous "were waiting" for an action in progress in the past when another short action interrupted it.',
      });
    } else if (sub.toLowerCase().includes("amharic")) {
      setPracticeQuestion({
        subject: sub,
        question: `በአማርኛ ሰዋሰው ውስጥ የስም ተግባር ምንድን ነው?`,
        options: ["የሰዎችን፣ የቦታዎችን ወይም የነገሮችን ስም መግለጽ", "የድርጊት አፈፃፀምን ማመልከት", "ቃላትን ብቻ ማያያዝ", "የጊዜ ርዝማኔን መለካት"],
        correctIndex: 0,
        explanation: "ስም በቋንቋችን ውስጥ የሰዎችን፣ የእንስሳትን፣ የቦታዎችን ወይም የተለያዩ ግዑዝ እና ህያው ነገሮችን መጠሪያ የሚያመለክት የቃል ክፍል ነው።",
      });
    } else if (sub.toLowerCase().includes("civic")) {
      setPracticeQuestion({
        subject: sub,
        question: `Which of the following is considered a primary civic responsibility of a student in school?`,
        options: [
          "Respecting school rules and peers while participating actively in learning",
          "Deciding on national educational budgets",
          "Skipping assignments without notice",
          "Working outside during school hours",
        ],
        correctIndex: 0,
        explanation: "Active participation in studies, punctuality, and mutual respect are foundational student civic responsibilities.",
      });
    } else {
      setPracticeQuestion({
        subject: sub,
        question: `In ${gradeName} ${sub}, which observation method provides the most reliable experimental evidence?`,
        options: [
          "Systematic observation with recorded measurements",
          "Guessing based on appearance",
          "Asking an unverified rumor",
          "Ignoring unexpected results",
        ],
        correctIndex: 0,
        explanation: "The scientific curriculum relies on repeatable, structured observations and measured data.",
      });
    }
  };

  // Generate Study Plan
  const handleGeneratePlan = () => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const subList = subjects.length > 0 ? subjects.map((s) => s.name) : ["Mathematics", "English", "General Science"];

    const plan = days.map((day, idx) => {
      const activeSub = subList[idx % subList.length];
      return {
        day,
        subject: activeSub,
        tasks: [
          `Review lecture notes & definitions from last ${activeSub} class`,
          `Complete 3 practice problems from Chapter textbook exercises`,
          `Prepare any questions for teacher consult session`,
        ],
        duration: `${studyHoursPerDay} hrs / evening`,
      };
    });

    setGeneratedPlan(plan);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      <AssistantHeader
        activeMode={mode}
        onSelectMode={(m) => setMode(m)}
        subjectsCount={subjects.length}
      />

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-[#184973] mx-auto" />
          <p className="text-sm font-medium">Syncing curriculum context from database...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mode 1: Explain Concepts */}
          {mode === "explain" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-5 space-y-4">
                <div className="flex items-center gap-2 text-[#184973]">
                  <Lightbulb className="h-5 w-5" />
                  <h2 className="text-base font-bold text-slate-900">Concept Inquiry</h2>
                </div>
                <p className="text-xs text-slate-500">
                  Select your enrolled subject and enter any topic or homework question you want clearly explained.
                </p>

                <form onSubmit={handleExplain} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Enrolled Subject
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          {sub.name} {sub.code ? `(${sub.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Concept or Topic to Explain
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Fractions, Photosynthesis, Past Continuous..."
                      value={conceptQuery}
                      onChange={(e) => setConceptQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Explanation Format
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "simple", label: "Simple" },
                        { key: "detailed", label: "Detailed" },
                        { key: "exam", label: "Exam Tips" },
                      ].map((style) => (
                        <button
                          key={style.key}
                          type="button"
                          onClick={() => setExplanationStyle(style.key as any)}
                          className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                            explanationStyle === style.key
                              ? "bg-[#184973] text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={explaining || !conceptQuery.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#184973] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#123654] transition cursor-pointer disabled:opacity-50"
                  >
                    {explaining ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Generating explanation...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span>Explain Concept</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Quick Prompts */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Quick Sample Questions
                  </span>
                  <div className="space-y-1.5">
                    {[
                      "How do I add fractions with different denominators?",
                      "What are the main functions of plant leaves?",
                      "Explain the difference between rights and responsibilities.",
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setConceptQuery(prompt);
                        }}
                        className="w-full text-left rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1.5 text-[11px] text-slate-600 border border-slate-200/60 transition"
                      >
                        &quot;{prompt}&quot;
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Output Panel */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7">
                {explanationOutput ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#184973] px-2 py-0.5 rounded-full border border-blue-200">
                          Explanation Ready
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">
                          {explanationOutput.topic}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        {gradeName} &bull; {sectionName}
                      </span>
                    </div>

                    <div className="rounded-xl bg-blue-50/60 p-4 border border-blue-100 text-xs text-slate-700 leading-relaxed">
                      <p className="font-semibold text-slate-900 mb-1">Concept Summary:</p>
                      {explanationOutput.summary}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Key Breakdown &amp; Principles:
                      </p>
                      <div className="space-y-2">
                        {explanationOutput.keyPoints.map((pt, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs text-emerald-900">
                      <p className="font-bold mb-1">Step-by-Step Example:</p>
                      <p className="leading-relaxed text-emerald-800">{explanationOutput.example}</p>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
                      <span className="font-bold block mb-0.5">Quick Practice Drill:</span>
                      <p>{explanationOutput.quickCheck}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                      <Lightbulb className="h-8 w-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">No concept queried yet</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        Type a question or concept from your enrolled courses to receive an interactive, curriculum-grounded explanation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode 2: Guided Practice */}
          {mode === "practice" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-4 space-y-4">
                <div className="flex items-center gap-2 text-[#184973]">
                  <BrainCircuit className="h-5 w-5" />
                  <h2 className="text-base font-bold text-slate-900">Practice Drills</h2>
                </div>
                <p className="text-xs text-slate-500">
                  Select any course from your verified enrollment to generate curriculum-aligned questions and test your mastery.
                </p>

                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Choose Subject
                  </label>
                  <select
                    value={practiceSubject}
                    onChange={(e) => setPracticeSubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleGeneratePractice}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#184973] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#123654] transition cursor-pointer"
                  >
                    <Zap className="h-4 w-4 text-amber-300" />
                    <span>Generate Practice Question</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-8">
                {practiceQuestion ? (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#184973] px-2.5 py-0.5 rounded-full border border-blue-200">
                        {practiceQuestion.subject} Practice Question
                      </span>
                      <span className="text-xs text-slate-500">
                        Curriculum Assessment Drill
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {practiceQuestion.question}
                    </h3>

                    <div className="space-y-2.5">
                      {practiceQuestion.options.map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        const isCorrect = idx === practiceQuestion.correctIndex;

                        let style = "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800";
                        if (hasCheckedAnswer) {
                          if (isCorrect) {
                            style = "border-emerald-300 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-400/40";
                          } else if (isSelected && !isCorrect) {
                            style = "border-rose-300 bg-rose-50 text-rose-900 font-semibold";
                          }
                        } else if (isSelected) {
                          style = "border-blue-400 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-300";
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (!hasCheckedAnswer) setSelectedOption(idx);
                            }}
                            className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left text-xs transition cursor-pointer ${style}`}
                          >
                            <span>{opt}</span>
                            {hasCheckedAnswer && isCorrect && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      {!hasCheckedAnswer ? (
                        <button
                          type="button"
                          onClick={() => setHasCheckedAnswer(true)}
                          disabled={selectedOption === null}
                          className="rounded-xl bg-[#184973] hover:bg-[#123654] text-white px-4 py-2 text-xs font-bold transition shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          Check Answer
                        </button>
                      ) : (
                        <div className="space-y-2 flex-1">
                          <div className={`p-3 rounded-xl text-xs ${
                            selectedOption === practiceQuestion.correctIndex
                              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                              : "bg-amber-50 text-amber-900 border border-amber-200"
                          }`}>
                            <p className="font-bold">
                              {selectedOption === practiceQuestion.correctIndex ? "Correct!" : "Explanation:"}
                            </p>
                            <p className="mt-0.5">{practiceQuestion.explanation}</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleGeneratePractice}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline pt-1"
                          >
                            <span>Try Next Question</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                      <BrainCircuit className="h-8 w-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">No question active</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        Click &quot;Generate Practice Question&quot; on the left to start a self-test drill for any of your courses.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode 3: Study Planning */}
          {mode === "plan" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[#184973]">
                      <CalendarCheck className="h-5 w-5" />
                      <h2 className="text-base font-bold text-slate-900">Custom Study Roadmap</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Distribute study sessions evenly across your enrolled curriculum courses ({subjects.length} active classes).
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">Daily Study Target:</span>
                      <select
                        value={studyHoursPerDay}
                        onChange={(e) => setStudyHoursPerDay(Number(e.target.value))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value={1}>1 hour / day</option>
                        <option value={2}>2 hours / day</option>
                        <option value={3}>3 hours / day</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleGeneratePlan}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#184973] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#123654] transition cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <span>Build Weekly Schedule</span>
                    </button>
                  </div>
                </div>
              </div>

              {generatedPlan ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {generatedPlan.map((item, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="font-black text-sm text-slate-900">{item.day}</span>
                        <span className="text-[10px] font-bold text-[#184973] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {item.duration}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-800">{item.subject}</span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {item.tasks.map((task, tIdx) => (
                          <div key={tIdx} className="flex items-start gap-2 text-[11px] text-slate-600">
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 space-y-3">
                  <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No schedule generated yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Click &quot;Build Weekly Schedule&quot; above to create a balanced revision timetable customized to your enrolled subjects.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentAssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-sm font-medium">Loading AI Study Assistant...</p>
          </div>
        </div>
      }
    >
      <StudentAssistantPageContent />
    </Suspense>
  );
}
