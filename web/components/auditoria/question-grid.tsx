"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import type { AuditResponseModel } from "@/lib/api/types";
import { normalizeAnswer } from "@/lib/utils/normalize";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ANSWER_OPTIONS = ["A", "B", "C", "D", "E", "UNMARKED"] as const;
const PAGE_SIZE = 60;

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
  const [pageIndex, setPageIndex] = useState(0);

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
      // Auto-focus primeira issue, se houver; senão, primeira questão
      const firstIssue = sortedResponses.find((r) => issues.has(r.question));
      const targetQuestion = firstIssue?.question ?? sortedResponses[0]?.question ?? null;
      setActiveQuestion(targetQuestion);
      setPageIndex(0);
    } else {
      setActiveQuestion(null);
      setPageIndex(0);
    }
  }, [sortedResponses, issues]);

  useEffect(() => {
    if (!activeQuestion) return;
    const questionIndex = sortedResponses.findIndex(
      (response) => response.question === activeQuestion,
    );
    if (questionIndex === -1) {
      return;
    }
    const targetPage = Math.floor(questionIndex / PAGE_SIZE);
    if (targetPage !== pageIndex) {
      setPageIndex(targetPage);
    }
  }, [activeQuestion, pageIndex, sortedResponses]);

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

  const pageCount = Math.max(1, Math.ceil(sortedResponses.length / PAGE_SIZE));
  const pagedResponses = useMemo(
    () =>
      sortedResponses.slice(
        pageIndex * PAGE_SIZE,
        pageIndex * PAGE_SIZE + PAGE_SIZE,
      ),
    [pageIndex, sortedResponses],
  );

  const goToPage = (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 0), pageCount - 1);
    setPageIndex(clamped);
    const firstQuestion = sortedResponses[clamped * PAGE_SIZE]?.question;
    if (firstQuestion) {
      setActiveQuestion(firstQuestion);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <header className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Total de questões: <span className="font-semibold text-foreground">{responses.length}</span>
        </p>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs sm:block">Use teclas A–E ou 1–5 para definir respostas.</p>
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              className="rounded-md border border-border/60 bg-background px-2 py-1 text-muted-foreground hover:border-primary/30"
              onClick={() => goToPage(pageIndex - 1)}
              disabled={pageIndex === 0}
              aria-label="Página anterior de questões"
            >
              Anterior
            </button>
            <span className="text-muted-foreground">
              {pageIndex + 1}/{pageCount}
            </span>
            <button
              type="button"
              className="rounded-md border border-border/60 bg-background px-2 py-1 text-muted-foreground hover:border-primary/30"
              onClick={() => goToPage(pageIndex + 1)}
              disabled={pageIndex >= pageCount - 1}
              aria-label="Próxima página de questões"
            >
              Próxima
            </button>
          </div>
        </div>
      </header>
      <div className="grid flex-1 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border/60 bg-card p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pagedResponses.map((response) => {
          const question = response.question;
          const readValue = response.read_value ?? "";
          const currentValue = currentAnswers[question] ?? readValue ?? "";
          const normalizedCurrent = normalizeAnswer(currentValue);
          const normalizedBaseline = normalizeAnswer(response.corrected_value ?? readValue ?? "");
          const isDirty = normalizedCurrent !== normalizedBaseline;
          const isActive = activeQuestion === question;
          const hasIssue = issues.has(question);

          return (
            <article
              key={question}
              className={cn(
                "flex flex-col gap-2 rounded-md border p-3 text-sm transition-all",
                isActive && "ring-4 ring-primary shadow-xl scale-105",
                hasIssue &&
                  "border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
                !hasIssue && "border-border/60 bg-muted/10"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveQuestion(question)}
                  className={cn(
                    "font-semibold text-left",
                    hasIssue && "text-amber-700 dark:text-amber-400",
                    !hasIssue && "text-foreground"
                  )}
                >
                  {question}
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  {isDirty && (
                    <span className="text-[11px] font-medium uppercase text-blue-600 dark:text-blue-300">
                      Editado
                    </span>
                  )}
                  {hasIssue && (
                    <Badge variant="warning" className="gap-1 shrink-0">
                      <AlertTriangle className="h-3 w-3" />
                      Issue
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ANSWER_OPTIONS.map((option) => {
                  const selected = normalizeAnswer(option) === normalizedCurrent;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={isSaving}
                      onClick={() => onChange(question, option)}
                      aria-label={`Marcar resposta ${renderOptionLabel(option)} para ${question}`}
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
                Lido: {readValue || "∅"} • Atual: {normalizedCurrent === "UNMARKED" ? "∅" : normalizedCurrent}
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
