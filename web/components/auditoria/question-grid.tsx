"use client";

import { useEffect, useMemo, useState } from "react";

import type { AuditResponseModel } from "@/lib/api/types";

const ANSWER_OPTIONS = ["A", "B", "C", "D", "E", "UNMARKED"] as const;

type QuestionGridProps = {
  responses: AuditResponseModel[];
  currentAnswers: Record<string, string>;
  onChange: (question: string, value: string) => void;
  issues: Set<string>;
  isSaving?: boolean;
};

export function QuestionGrid({
  responses,
  currentAnswers,
  onChange,
  issues,
  isSaving,
}: QuestionGridProps) {
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  const sortedResponses = useMemo(
    () =>
      [...responses].sort((a, b) => {
        const qa = parseQuestionIndex(a.question);
        const qb = parseQuestionIndex(b.question);
        return qa - qb;
      }),
    [responses],
  );

  useEffect(() => {
    if (sortedResponses.length > 0) {
      setActiveQuestion(sortedResponses[0]?.question ?? null);
    } else {
      setActiveQuestion(null);
    }
  }, [sortedResponses]);

  useEffect(() => {
    if (!activeQuestion) return;

    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      const mapped = mapKeyToAnswer(event.key);
      if (mapped) {
        event.preventDefault();
        onChange(activeQuestion, mapped);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeQuestion, onChange]);

  return (
    <div className="flex h-full flex-col gap-3">
      <header className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Total de questões: <span className="font-semibold text-foreground">{responses.length}</span>
        </p>
        <p className="hidden sm:block">Use teclas A–E ou 1–5 para definir respostas.</p>
      </header>
      <div className="grid max-h-[420px] grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border/60 bg-card p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedResponses.map((response) => {
          const question = response.question;
          const readValue = response.read_value ?? "";
          const currentValue = currentAnswers[question] ?? readValue ?? "";
          const isIssue = issues.has(question);
          const isDirty = currentValue !== (response.corrected_value ?? readValue ?? "");
          const isActive = activeQuestion === question;

          return (
            <article
              key={question}
              className={`flex flex-col gap-2 rounded-md border p-3 text-sm transition-shadow ${
                isActive ? "border-ring shadow-sm" : "border-border/60"
              } ${isIssue ? "bg-amber-500/10" : "bg-muted/10"}`}
            >
              <button
                type="button"
                onClick={() => setActiveQuestion(question)}
                className="flex items-center justify-between text-left"
              >
                <span className="font-semibold text-foreground">{question}</span>
                {isDirty ? (
                  <span className="text-[11px] font-medium uppercase text-blue-600 dark:text-blue-300">
                    Editado
                  </span>
                ) : null}
              </button>

              <div className="flex flex-wrap gap-1.5">
                {ANSWER_OPTIONS.map((option) => {
                  const selected = normalizeValue(option) === normalizeValue(currentValue);
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={isSaving}
                      onClick={() => onChange(question, option)}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-background text-muted-foreground hover:border-primary/40"
                      } ${option === "UNMARKED" ? "tracking-wide" : ""}`}
                    >
                      {renderOptionLabel(option)}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-muted-foreground">
                Lido: {readValue || "∅"} • Atual: {currentValue || "∅"}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function parseQuestionIndex(question: string) {
  const match = question.match(/\d+/g);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return parseInt(match[0], 10);
}

function normalizeValue(value: string | null | undefined) {
  if (!value) return "";
  return value.toUpperCase();
}

function renderOptionLabel(option: string) {
  return option === "UNMARKED" ? "∅" : option;
}

function mapKeyToAnswer(key: string) {
  const normalized = key.toLowerCase();
  if (["1", "a"].includes(normalized)) return "A";
  if (["2", "b"].includes(normalized)) return "B";
  if (["3", "c"].includes(normalized)) return "C";
  if (["4", "d"].includes(normalized)) return "D";
  if (["5", "e"].includes(normalized)) return "E";
  if (["0", " ", "backspace", "delete"].includes(normalized)) return "UNMARKED";
  return null;
}
