"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Image as ImageIcon, List as ListIcon, LogOut, ShieldCheck, UserRound } from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { UploadForm } from "@/components/auditoria/upload-form";
import { BatchSummary } from "@/components/auditoria/batch-summary";
import { AuditList } from "@/components/auditoria/audit-list";
import { AuditImageViewer } from "@/components/auditoria/audit-image-viewer";
import { QuestionGrid } from "@/components/auditoria/question-grid";
import { DecisionToolbar } from "@/components/auditoria/decision-toolbar";
import { ExportActions } from "@/components/auditoria/export-actions";
import { CredentialsDialog } from "@/components/auditoria/credentials-dialog";
import { KeyboardShortcutsLegend } from "@/components/auditoria/keyboard-shortcuts-legend";
import { CleanupConfirmationDialog } from "@/components/auditoria/cleanup-confirmation-dialog";
import { showUnsavedChangesToast } from "@/components/auditoria/unsaved-changes-toast";
import { useAuditCredentials } from "@/components/audit-credentials-provider";
import {
  useAuditDetailQuery,
  useAuditIssues,
  useAuditIssuesMap,
  useAuditListQuery,
  useCleanupBatchMutation,
  useExportBatchMutation,
  useExportMetadataQuery,
  useSubmitDecisionMutation,
  DEFAULT_PAGE_SIZE,
} from "@/hooks/useAuditoria";
import type { AuditDetail, ProcessResponse } from "@/lib/api/types";
import { normalizeAnswer, normalizeRaw } from "@/lib/utils/normalize";
import { sortByPriority } from "@/lib/auditoria/sorting";

export default function AuditoriaPage() {
  const { credentials, clearCredentials, hydrated } = useAuditCredentials();
  const [batchId, setBatchId] = useState<string | null>(null);
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>("pending");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [baselineAnswers, setBaselineAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [baselineNotes, setBaselineNotes] = useState("");
  const [uploadOpen, setUploadOpen] = useState(!batchId);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [mobileTab, setMobileTab] = useState<"image" | "questions">("image");
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);
  const [sortMode, setSortMode] = useState<"priority" | "date">("priority");

  const listQuery = useAuditListQuery(
    {
      batchId,
      status: filterStatus,
      pageSize: DEFAULT_PAGE_SIZE,
    },
    { enabled: Boolean(batchId) },
  );
  const refetchList = listQuery.refetch;

  const detailQuery = useAuditDetailQuery(selectedAuditId, { enabled: Boolean(selectedAuditId) });
  const submitDecision = useSubmitDecisionMutation(selectedAuditId);
  const exportMutation = useExportBatchMutation(batchId);
  const cleanupMutation = useCleanupBatchMutation(batchId);
  const manifestQuery = useExportMetadataQuery(batchId);

  const currentDetail = detailQuery.data;
  const issuesSet = useAuditIssues(currentDetail);
  const issuesMap = useAuditIssuesMap(currentDetail);

  useEffect(() => {
    if (currentDetail) {
      const initialAnswers = buildInitialAnswers(currentDetail);
      setAnswers(initialAnswers);
      setBaselineAnswers(initialAnswers);
      const detailNotes = normalizeRaw(currentDetail.notes);
      setNotes(detailNotes);
      setBaselineNotes(detailNotes);
      return;
    }

    setAnswers({});
    setBaselineAnswers({});
    setNotes("");
    setBaselineNotes("");
  }, [currentDetail]);

  useEffect(() => {
    if (!batchId) {
      setSelectedAuditId(null);
      setFilterStatus("pending");
      setAnswers({});
      setBaselineAnswers({});
      setNotes("");
      setBaselineNotes("");
      setUploadOpen(true);
    } else {
      setUploadOpen(false);
    }
  }, [batchId]);

  // Auto-switch to questions tab on mobile when issues detected
  useEffect(() => {
    if (issuesSet.size > 0 && mobileTab === "image" && typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileTab("questions");
    }
  }, [issuesSet.size, mobileTab]);

  const hasChanges = useMemo(() => {
    if (!currentDetail) return false;
    // IMPORTANTE: Usar notes imediatas (não debounced) para detectar mudanças
    // Garante que o alerta apareça instantaneamente ao digitar
    if (normalizeRaw(notes) !== normalizeRaw(baselineNotes)) {
      return true;
    }
    const questions = new Set([
      ...Object.keys(baselineAnswers),
      ...Object.keys(answers),
    ]);
    for (const question of questions) {
      if (normalizeAnswer(answers[question]) !== normalizeAnswer(baselineAnswers[question])) {
        return true;
      }
    }
    return false;
  }, [answers, baselineAnswers, baselineNotes, currentDetail, notes]);

  const listItems = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);

  const orderedListItems = useMemo(() => {
    if (sortMode === "priority") {
      return sortByPriority(listItems);
    }
    return listItems;
  }, [listItems, sortMode]);
  const currentIndex = useMemo(() => {
    if (!selectedAuditId) return -1;
    return orderedListItems.findIndex((item) => item.id === selectedAuditId);
  }, [orderedListItems, selectedAuditId]);

  useEffect(() => {
    if (!selectedAuditId) return;
    if (currentIndex !== -1) return;
    if (orderedListItems.length === 0) {
      setSelectedAuditId(null);
      return;
    }
    setSelectedAuditId(orderedListItems[0].id);
  }, [currentIndex, orderedListItems, selectedAuditId]);

  const previousId = currentIndex > 0 ? orderedListItems[currentIndex - 1]?.id ?? null : null;
  const nextId =
    currentIndex >= 0 && currentIndex < orderedListItems.length - 1
      ? orderedListItems[currentIndex + 1]?.id ?? null
      : null;

  const totalItems = listQuery.data?.total ?? orderedListItems.length;
  const fallbackPending = orderedListItems.filter((item) => String(item.status).toUpperCase() === "PENDING").length;
  const pendingCount = listQuery.data?.pending ?? fallbackPending;
  const cardPosition = currentIndex >= 0 ? currentIndex + 1 : 0;

  const handleProcessed = (response: ProcessResponse) => {
    const newBatchId = response.summary.batch_id;
    setBatchId(newBatchId);
    setFilterStatus("pending");
    const firstItem = response.audit?.items?.[0];
    setSelectedAuditId(firstItem?.id ?? null);
  };

  const handleSaveDecision = useCallback((onSaved?: (detail: AuditDetail) => void) => {
    if (!currentDetail) {
      toast.error("Nenhum item selecionado");
      return;
    }

    const payload = {
      answers: toPayloadAnswers(answers),
      notes: notes.trim() ? notes.trim() : undefined,
    };

    submitDecision.mutate(payload, {
      onSuccess: (data) => {
        toast.success("Decisão registrada com sucesso");
        const refreshedAnswers = buildInitialAnswers(data);
        setAnswers(refreshedAnswers);
        setBaselineAnswers(refreshedAnswers);
        const updatedNotes = (data.notes ?? "").trim();
        setNotes(updatedNotes);
        setBaselineNotes(updatedNotes);
        refetchList();
        manifestQuery.refetch();
        onSaved?.(data);
      },
      onError: (error) => {
        toast.error(error.message || "Não foi possível salvar a decisão");
      },
    });
  }, [currentDetail, answers, notes, submitDecision, refetchList, manifestQuery]);

  const runOrQueueNavigation = useCallback(
    (action: () => void) => {
      if (hasChanges) {
        showUnsavedChangesToast({
          onSave: async () => {
            handleSaveDecision(() => {
              action();
              refetchList();
            });
          },
          onDiscard: () => {
            // Reseta answers para baseline
            setAnswers(baselineAnswers);
            setNotes(baselineNotes);
            action();
            refetchList();
          },
          onCancel: () => {
            // Apenas fecha toast, não navega
          },
        });
      } else {
        action();
        refetchList();
      }
    },
    [hasChanges, handleSaveDecision, baselineAnswers, baselineNotes, refetchList],
  );

  const handleSelectItem = (id: number) => {
    if (id === selectedAuditId) return;
    runOrQueueNavigation(() => setSelectedAuditId(id));
  };

  const handleAnswerChange = (question: string, value: string) => {
    // Usar callback para garantir que o estado é atualizado sincronamente
    setAnswers((prev) => {
      const updated = { ...prev, [question]: value };
      // Forçar re-render síncrono para atualizar hasChanges
      return updated;
    });
  };

  const handleExport = async () => {
    if (!batchId) {
      toast.error("Nenhum lote selecionado");
      return;
    }
    if (exportMutation.isPending) {
      return;
    }
    try {
      const blob = await exportMutation.mutateAsync();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Results_Corrigidos_${batchId}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success("CSV exportado com sucesso");
      manifestQuery.refetch();
    } catch (error) {
      toast.error((error as Error).message || "Falha ao exportar o lote");
    }
  };

  const handleCleanup = async () => {
    if (!batchId) {
      toast.error("Nenhum lote selecionado");
      return;
    }
    if (cleanupMutation.isPending) {
      return;
    }
    setShowCleanupDialog(true);
  };

  const handleConfirmedCleanup = async () => {
    if (!batchId) return;

    try {
      await cleanupMutation.mutateAsync();
      toast.success("Lote limpo com sucesso");
      setBatchId(null);
      setSelectedAuditId(null);
    } catch (error) {
      toast.error((error as Error).message || "Falha ao limpar o lote");
    }
  };

  const showWorkspace = Boolean(currentDetail);

  const handlePrevious = useCallback(() => {
    if (!previousId) return;
    // Usar requestAnimationFrame para garantir que React processou todas as atualizações de estado
    requestAnimationFrame(() => {
      runOrQueueNavigation(() => setSelectedAuditId(previousId));
    });
  }, [previousId, runOrQueueNavigation]);

  const handleNext = useCallback(() => {
    if (!nextId) return;
    // Usar requestAnimationFrame para garantir que React processou todas as atualizações de estado
    requestAnimationFrame(() => {
      runOrQueueNavigation(() => setSelectedAuditId(nextId));
    });
  }, [nextId, runOrQueueNavigation]);

  useEffect(() => {
    if (!showWorkspace) return;
    const handler = (event: KeyboardEvent) => {
      if (submitDecision.isPending) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if (event.key === "ArrowLeft" && previousId) {
        event.preventDefault();
        handlePrevious();
      }
      if (event.key === "ArrowRight" && nextId) {
        event.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showWorkspace, submitDecision.isPending, previousId, nextId, handlePrevious, handleNext]);

  return (
    <div className="relative min-h-screen bg-background">
      <CredentialsDialog />

      <CleanupConfirmationDialog
        open={showCleanupDialog}
        onOpenChange={setShowCleanupDialog}
        onConfirm={handleConfirmedCleanup}
        batchId={batchId}
        totalItems={totalItems}
      />

      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="flex flex-col justify-between gap-4 border-b border-border/40 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Auditoria de Cartões OMR</h1>
              <p className="text-sm text-muted-foreground">
                Faça upload, revise cartões problemáticos e exporte resultados corrigidos em um único fluxo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <KeyboardShortcutsLegend />

            {hydrated && credentials.user ? (
              <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card px-3 py-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                  <span className="text-foreground font-medium">{credentials.user}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => clearCredentials()}
                >
                  <LogOut className="h-4 w-4" />
                  Trocar usuário
                </Button>
              </div>
            ) : null}
          </div>
        </header>

        <Collapsible.Root open={uploadOpen} onOpenChange={setUploadOpen}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Upload de Cartões</h2>
            <Collapsible.Trigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                {uploadOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {uploadOpen ? "Ocultar" : "Mostrar"}
              </Button>
            </Collapsible.Trigger>
          </div>
          <Collapsible.Content>
            <UploadForm onProcessed={handleProcessed} disabled={!credentials.user} />
          </Collapsible.Content>
        </Collapsible.Root>

        {batchId ? (
          <Collapsible.Root open={summaryOpen} onOpenChange={setSummaryOpen}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Métricas do Lote</h2>
              <Collapsible.Trigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  {summaryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {summaryOpen ? "Ocultar" : "Mostrar"}
                </Button>
              </Collapsible.Trigger>
            </div>
            <Collapsible.Content>
              <BatchSummary
                response={listQuery.data}
                batchId={batchId}
                isRefreshing={listQuery.isFetching}
                manifestInfo={
                  manifestQuery.data && typeof manifestQuery.data === "object" && "exported_at" in manifestQuery.data
                    ? {
                        exported_at: manifestQuery.data.exported_at,
                        exported_by: manifestQuery.data.exported_by,
                      }
                    : undefined
                }
              />
            </Collapsible.Content>
          </Collapsible.Root>
        ) : null}

        {batchId ? (
          <Collapsible.Root open={exportOpen} onOpenChange={setExportOpen}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Exportar e Limpar</h2>
              <Collapsible.Trigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  {exportOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {exportOpen ? "Ocultar" : "Mostrar"}
                </Button>
              </Collapsible.Trigger>
            </div>
            <Collapsible.Content>
              <ExportActions
                batchId={batchId}
                disabled={!batchId || listQuery.isLoading}
                isExporting={exportMutation.isPending}
                isCleaning={cleanupMutation.isPending}
                onExport={handleExport}
                onCleanup={handleCleanup}
              />
            </Collapsible.Content>
          </Collapsible.Root>
        ) : null}

        {/* Mobile Layout: Tabs */}
        <div className="lg:hidden flex flex-col gap-4 pb-10">
          {/* Compact List (Collapsible) */}
          {batchId && (
            <Collapsible.Root defaultOpen={false}>
              <Collapsible.Trigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    Cartão {cardPosition} de {totalItems}
                    {pendingCount > 0 && ` • ${pendingCount} pendentes`}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </Collapsible.Trigger>
              <Collapsible.Content className="mt-3">
                <AuditList
                  items={orderedListItems}
                  isLoading={listQuery.isLoading}
                  selectedId={selectedAuditId}
                  onSelect={handleSelectItem}
                  filterStatus={filterStatus}
                  onFilterStatus={setFilterStatus}
                  compact={true}
                  sortMode={sortMode}
                  onSortModeChange={setSortMode}
                />
              </Collapsible.Content>
            </Collapsible.Root>
          )}

          {showWorkspace && currentDetail ? (
            <>
              <Tabs value={mobileTab} onValueChange={(value) => setMobileTab(value as "image" | "questions")} className="flex-1">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="image">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Imagem
                  </TabsTrigger>
                  <TabsTrigger value="questions">
                    <ListIcon className="h-4 w-4 mr-2" />
                    Questões
                    {issuesSet.size > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5">
                        {issuesSet.size}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="image" className="overflow-hidden mt-4 h-[calc(100vh-420px)]">
                  <AuditImageViewer
                    imageUrl={currentDetail.image_url}
                    markedImageUrl={currentDetail.marked_image_url}
                  />
                </TabsContent>

                <TabsContent value="questions" className="overflow-hidden mt-4 h-[calc(100vh-420px)]">
                  <QuestionGrid
                    responses={currentDetail.responses}
                    currentAnswers={answers}
                    issues={issuesSet}
                    issuesMap={issuesMap}
                    onChange={handleAnswerChange}
                    isSaving={submitDecision.isPending}
                    showIssuesOnly={showIssuesOnly}
                    activeAuditId={selectedAuditId}
                  />
                </TabsContent>
              </Tabs>

              <DecisionToolbar
                onSave={() => handleSaveDecision()}
                onPrev={previousId ? handlePrevious : undefined}
                onNext={nextId ? handleNext : undefined}
                disabled={!currentDetail}
                isSaving={submitDecision.isPending}
                hasChanges={hasChanges}
                notes={notes}
                onNotesChange={setNotes}
                currentIndex={currentIndex}
                totalCount={totalItems}
                resolvedCount={listQuery.data?.resolved ?? 0}
              />
            </>
          ) : batchId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
              <p>Selecione um cartão pendente na lista para iniciar a correção.</p>
              <p>
                Cartões disponíveis: <strong>{orderedListItems.length}</strong>
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
              <p>Faça upload de um lote para visualizar cartões em auditoria.</p>
            </div>
          )}
        </div>

        {/* Desktop Layout: 3 Columns */}
        <main className="hidden lg:grid flex-1 gap-6 pb-10 h-[calc(100vh-180px)] lg:grid-cols-[280px_1fr_320px] overflow-hidden">
          {/* Column 1: List */}
          <aside className="flex flex-col overflow-hidden border rounded-lg">
            <AuditList
              items={orderedListItems}
              isLoading={listQuery.isLoading}
              selectedId={selectedAuditId}
              onSelect={handleSelectItem}
              filterStatus={filterStatus}
              onFilterStatus={setFilterStatus}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
            />
          </aside>

          {/* Column 2: Image + Toolbar */}
          <section className="flex flex-col gap-4 overflow-hidden">
            {showWorkspace && currentDetail ? (
              <>
                <AuditImageViewer
                  imageUrl={currentDetail.image_url}
                  markedImageUrl={currentDetail.marked_image_url}
                />
                <DecisionToolbar
                  onSave={() => handleSaveDecision()}
                  onPrev={previousId ? handlePrevious : undefined}
                  onNext={nextId ? handleNext : undefined}
                  disabled={!currentDetail}
                  isSaving={submitDecision.isPending}
                  hasChanges={hasChanges}
                  notes={notes}
                  onNotesChange={setNotes}
                  currentIndex={currentIndex}
                  totalCount={totalItems}
                  resolvedCount={listQuery.data?.resolved ?? 0}
                />
              </>
            ) : batchId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                <p>Selecione um cartão pendente na lista para iniciar a correção.</p>
                <p>
                  Cartões disponíveis: <strong>{orderedListItems.length}</strong>
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                <p>Faça upload de um lote para visualizar cartões em auditoria.</p>
              </div>
            )}
          </section>

          {/* Column 3: Questions */}
          <aside className="flex flex-col overflow-hidden border rounded-lg">
            {showWorkspace && currentDetail ? (
              <>
                {/* Header with summary and toggle */}
                <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                  <div className="text-sm">
                    <span className="font-semibold">
                      Cartão {cardPosition} de {totalItems}
                    </span>
                    {issuesSet.size > 0 && (
                      <span className="ml-2 text-destructive">
                        • {issuesSet.size} {issuesSet.size === 1 ? "issue" : "issues"}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowIssuesOnly(!showIssuesOnly)}
                  >
                    {showIssuesOnly ? "Mostrar todas" : "Apenas issues"}
                  </Button>
                </div>

                <QuestionGrid
                  responses={currentDetail.responses}
                  currentAnswers={answers}
                  issues={issuesSet}
                  issuesMap={issuesMap}
                  onChange={handleAnswerChange}
                  isSaving={submitDecision.isPending}
                  showIssuesOnly={showIssuesOnly}
                  activeAuditId={selectedAuditId}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                Selecione um cartão
              </div>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}

function buildInitialAnswers(detail: AuditDetail) {
  const result: Record<string, string> = {};
  detail.responses.forEach((response) => {
    const value = normalizeAnswer(response.corrected_value || response.read_value);
    result[response.question] = value;
  });
  return result;
}

function toPayloadAnswers(answers: Record<string, string>) {
  return Object.keys(answers).reduce<Record<string, string>>((acc, question) => {
    const value = normalizeAnswer(answers[question]);
    acc[question] = value;
    return acc;
  }, {});
}
