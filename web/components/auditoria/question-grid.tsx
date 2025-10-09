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
  activeAuditId?: number | null;
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
  activeAuditId,
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
    estimateSize: () => 110, // Estimated height of each card (px) - reduced from 140
    overscan: 5, // Render 5 extra items outside viewport
  });

  const issuesKey = useMemo(() => {
    return Array.from(issues).sort().join("|");
  }, [issues]);

  const responsesKey = useMemo(() => {
    return sortedResponses.map((response) => response.question).join("|");
  }, [sortedResponses]);

  const lastScrollKey = useRef<string | null>(null);

  useEffect(() => {
    lastScrollKey.current = null;
  }, [activeAuditId, showIssuesOnly, responsesKey, issuesKey]);

  // Auto-scroll to first issue on load/change with flash visual
  useEffect(() => {
    if (sortedResponses.length === 0) {
      return;
    }

    const scrollKey = `${activeAuditId ?? "none"}-${showIssuesOnly ? "issues" : "all"}-${issuesKey}-${responsesKey}`;
    if (lastScrollKey.current === scrollKey) {
      return;
    }

    lastScrollKey.current = scrollKey;

    const firstIssueIndex = sortedResponses.findIndex((r) => issues.has(r.question));
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    let flashStartTimer: ReturnType<typeof setTimeout> | null = null;
    let flashCleanupTimer: ReturnType<typeof setTimeout> | null = null;

    if (firstIssueIndex !== -1) {
      const firstIssue = sortedResponses[firstIssueIndex];
      setFocusedQuestion(firstIssue.question);

      scrollTimer = window.setTimeout(() => {
        virtualizer.scrollToIndex(firstIssueIndex, {
          align: "start",
          behavior: "smooth",
        });

        flashStartTimer = window.setTimeout(() => {
          const element = document.querySelector(`[data-question="${firstIssue.question}"]`);
          if (element) {
            element.classList.add("ring-2", "ring-amber-500", "ring-offset-2");
            flashCleanupTimer = window.setTimeout(() => {
              element.classList.remove("ring-2", "ring-amber-500", "ring-offset-2");
            }, 2000);
          }
        }, 400);
      }, 250);
    } else {
      const firstQuestion = sortedResponses[0]?.question;
      if (firstQuestion) {
        setFocusedQuestion(firstQuestion);
        scrollTimer = window.setTimeout(() => {
          virtualizer.scrollToIndex(0, {
            align: "start",
            behavior: "smooth",
          });
        }, 250);
      }
    }

    return () => {
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      if (flashStartTimer) {
        clearTimeout(flashStartTimer);
      }
      if (flashCleanupTimer) {
        clearTimeout(flashCleanupTimer);
      }
    };
  }, [activeAuditId, issues, issuesKey, responsesKey, showIssuesOnly, sortedResponses, virtualizer]);

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

          // Scroll to question using virtualizer directly
          const responseIndex = sortedResponses.findIndex((r) => r.question === nextQuestion);
          if (responseIndex !== -1) {
            virtualizer.scrollToIndex(responseIndex, {
              align: "center",
              behavior: "smooth",
            });
          }

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
                "flex flex-col gap-2 rounded-md border p-2.5 mb-2.5 transition-all cursor-pointer",
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
              <div className="flex flex-wrap gap-1">
                {ANSWER_OPTIONS.map((option) => {
                  const selected = normalizeAnswer(option) === normalizedCurrent;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={isSaving}
                      onClick={() => onChange(question, option)}
                      aria-label={`Marcar resposta ${renderOptionLabel(option)} para ${question}`}
                      className={`rounded border px-2 py-0.5 text-xs font-medium transition min-w-[32px] ${
                        selected
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                          : "border-border/60 bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {renderOptionLabel(option)}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-muted-foreground leading-tight">
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
  return option === "UNMARKED" ? "∅" : option;
}
