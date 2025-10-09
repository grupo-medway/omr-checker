"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertCircle, AlertTriangle, XCircle } from "lucide-react";

import type { AuditResponseModel } from "@/lib/api/types";
import type { IssueType } from "@/hooks/useAuditoria";
import { normalizeAnswer } from "@/lib/utils/normalize";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ANSWER_OPTIONS = ["A", "B", "C", "D", "E", "UNMARKED"] as const;

type QuestionGridProps = {
  responses: AuditResponseModel[];
  currentAnswers: Record<string, string>;
  onChange: (question: string, value: string) => void;
  issues: Set<string>;
  issuesMap: Map<string, IssueType>;
  isSaving?: boolean;
  showIssuesOnly?: boolean;
};

function getIssueConfig(issueType: IssueType | undefined) {
  switch (issueType) {
    case "multi-marked":
      return {
        variant: "destructive" as const,
        icon: AlertCircle,
        label: "Multi-marcado",
        borderColor: "border-l-red-500",
        bgColor: "bg-red-50 dark:bg-red-950/20",
        textColor: "text-red-700 dark:text-red-400",
      };
    case "unmarked":
      return {
        variant: "warning" as const,
        icon: AlertTriangle,
        label: "Não marcado",
        borderColor: "border-l-amber-500",
        bgColor: "bg-amber-50 dark:bg-amber-950/20",
        textColor: "text-amber-700 dark:text-amber-400",
      };
    case "invalid":
      return {
        variant: "secondary" as const,
        icon: XCircle,
        label: "Inválido",
        borderColor: "border-l-gray-500",
        bgColor: "bg-gray-50 dark:bg-gray-950/20",
        textColor: "text-gray-700 dark:text-gray-400",
      };
    default:
      return {
        variant: "warning" as const,
        icon: AlertTriangle,
        label: "Issue",
        borderColor: "border-l-amber-500",
        bgColor: "bg-amber-50 dark:bg-amber-950/20",
        textColor: "text-amber-700 dark:text-amber-400",
      };
  }
}

export function QuestionGrid({
  responses,
  currentAnswers,
  onChange,
  issues,
  issuesMap,
  isSaving,
  showIssuesOnly = false,
}: QuestionGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [focusedQuestion, setFocusedQuestion] = useState<string | null>(null);

  // Filter and sort responses
  const sortedResponses = useMemo(() => {
    let filtered = responses;

    // Filter only issues if toggle active
    if (showIssuesOnly) {
      filtered = responses.filter((r) => issues.has(r.question));
    }

    // Sort: issues first, then by number
    return [...filtered].sort((a, b) => {
      const aHasIssue = issues.has(a.question);
      const bHasIssue = issues.has(b.question);

      if (aHasIssue && !bHasIssue) return -1;
      if (!aHasIssue && bHasIssue) return 1;

      // Extract question number (assumes "Q1", "Q2", etc or just "1", "2")
      const aNum = parseQuestionIndex(a.question);
      const bNum = parseQuestionIndex(b.question);
      return aNum - bNum;
    });
  }, [responses, issues, showIssuesOnly]);

  // Virtual scrolling
  const virtualizer = useVirtualizer({
    count: sortedResponses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Estimated height of each card (px)
    overscan: 5, // Render 5 extra items outside viewport
  });

  // Auto-scroll AND auto-focus first issue on load
  useEffect(() => {
    if (sortedResponses.length > 0) {
      const firstIssueIndex = sortedResponses.findIndex((r) =>
        issues.has(r.question)
      );

      if (firstIssueIndex !== -1) {
        const firstIssue = sortedResponses[firstIssueIndex];
        setFocusedQuestion(firstIssue.question);

        // Wait for next frame to ensure DOM is ready
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(firstIssueIndex, {
            align: "center",
            behavior: "smooth",
          });

          // Focus the element after scroll
          setTimeout(() => {
            const element = document.querySelector(`[data-question="${firstIssue.question}"]`) as HTMLElement;
            element?.focus();
          }, 100);
        });
      } else {
        // No issues, focus first question
        const firstQuestion = sortedResponses[0]?.question;
        if (firstQuestion) {
          setFocusedQuestion(firstQuestion);
          setTimeout(() => {
            const element = document.querySelector(`[data-question="${firstQuestion}"]`) as HTMLElement;
            element?.focus();
          }, 100);
        }
      }
    }
  }, [sortedResponses, issues, showIssuesOnly, virtualizer]);

  // Keyboard navigation (answers + arrow navigation between issues)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isSaving) return;

      // Get list of issue questions for navigation
      const issueQuestions = sortedResponses
        .filter((r) => issues.has(r.question))
        .map((r) => r.question);

      // Arrow Down/Up: Navigate between issues
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (issueQuestions.length > 0) {
          e.preventDefault();

          const currentIndex = focusedQuestion
            ? issueQuestions.indexOf(focusedQuestion)
            : -1;

          let nextIndex: number;
          if (e.key === "ArrowDown") {
            nextIndex = currentIndex < issueQuestions.length - 1 ? currentIndex + 1 : 0;
          } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : issueQuestions.length - 1;
          }

          const nextQuestion = issueQuestions[nextIndex];
          setFocusedQuestion(nextQuestion);

          // Scroll to question
          const responseIndex = sortedResponses.findIndex((r) => r.question === nextQuestion);
          if (responseIndex !== -1) {
            virtualizer.scrollToIndex(responseIndex, {
              align: "center",
              behavior: "smooth",
            });
          }

          // Focus element
          setTimeout(() => {
            const element = document.querySelector(`[data-question="${nextQuestion}"]`) as HTMLElement;
            element?.focus();
          }, 100);

          return;
        }
      }

      // Get active question from focused element or state
      const target = e.target as HTMLElement;
      const activeQuestion = target.closest("[data-question]")?.getAttribute("data-question") || focusedQuestion;

      if (!activeQuestion) return;

      // A-E or 1-5 to mark answer
      if (/^[A-E]$/i.test(e.key)) {
        e.preventDefault();
        onChange(activeQuestion, e.key.toUpperCase());
      } else if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const answerMap: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E" };
        onChange(activeQuestion, answerMap[e.key]);
      } else if (e.key === "0" || e.key === "Backspace") {
        e.preventDefault();
        onChange(activeQuestion, "");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [onChange, isSaving, sortedResponses, issues, focusedQuestion, virtualizer]);

  if (sortedResponses.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">
            {showIssuesOnly ? "Nenhuma issue encontrada" : "Nenhuma questão disponível"}
          </p>
          {showIssuesOnly && (
            <p className="text-xs text-muted-foreground">
              Todos os cartões estão corretos! 🎉
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-y-auto overscroll-contain p-4">
      {/* Virtual container with total height */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {/* Render only visible items */}
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const response = sortedResponses[virtualRow.index];
          const { question, read_value } = response;
          const currentValue = currentAnswers[question] ?? read_value ?? "";
          const normalizedCurrent = normalizeAnswer(currentValue);
          const normalizedBaseline = normalizeAnswer(response.corrected_value ?? read_value ?? "");
          const isDirty = normalizedCurrent !== normalizedBaseline;
          const hasIssue = issues.has(question);
          const issueType = issuesMap.get(question);
          const issueConfig = hasIssue ? getIssueConfig(issueType) : null;

          const isFocused = focusedQuestion === question;

          return (
            <article
              key={virtualRow.key}
              data-index={virtualRow.index}
              data-question={question}
              ref={virtualizer.measureElement}
              onClick={() => setFocusedQuestion(question)}
              onFocus={() => setFocusedQuestion(question)}
              className={cn(
                "absolute top-0 left-0 w-full",
                "flex flex-col gap-3 rounded-md border p-3 mb-3 transition-all cursor-pointer",
                "hover:shadow-md focus-within:ring-2 focus-within:ring-primary",
                // Focus indicator
                isFocused && "ring-2 ring-primary shadow-lg",
                // Issue highlighting
                hasIssue && `border-l-4 ${issueConfig?.borderColor} ${issueConfig?.bgColor}`,
                !hasIssue && "border-border/60 bg-muted/10"
              )}
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
              tabIndex={0}
            >
              {/* Header with question number and badge */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "font-semibold text-lg",
                    hasIssue && issueConfig?.textColor,
                    !hasIssue && "text-foreground"
                  )}
                >
                  {question}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {isDirty && (
                    <span className="text-[11px] font-medium uppercase text-blue-600 dark:text-blue-300">
                      Editado
                    </span>
                  )}
                  {hasIssue && issueConfig && (
                    <Badge variant={issueConfig.variant} className="gap-1 shrink-0">
                      <issueConfig.icon className="h-3 w-3" />
                      {issueConfig.label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Answer buttons */}
              <div className="flex flex-wrap gap-2">
                {ANSWER_OPTIONS.map((option) => {
                  const selected = normalizeAnswer(option) === normalizedCurrent;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={isSaving}
                      onClick={() => onChange(question, option)}
                      aria-label={`Marcar resposta ${renderOptionLabel(option)} para ${question}`}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition min-w-[44px] ${
                        selected
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary ring-offset-2"
                          : "border-border/60 bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {renderOptionLabel(option)}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">
                Lido: {read_value || "∅"} • Atual: {normalizedCurrent === "UNMARKED" ? "∅" : normalizedCurrent}
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
  return option === "UNMARKED" ? "Vazio" : option;
}
