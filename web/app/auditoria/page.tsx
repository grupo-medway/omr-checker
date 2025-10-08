"use client";

import { useEffect, useMemo, useState } from "react";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
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
import { useAuditCredentials } from "@/components/audit-credentials-provider";
import {
  useAuditDetailQuery,
  useAuditIssues,
  useAuditListQuery,
  useCleanupBatchMutation,
  useExportBatchMutation,
  useExportMetadataQuery,
  useSubmitDecisionMutation,
  DEFAULT_PAGE_SIZE,
} from "@/hooks/useAuditoria";
import type { AuditDetail, ProcessResponse } from "@/lib/api/types";
import { normalizeAnswer, normalizeRaw } from "@/lib/utils/normalize";

export default function AuditoriaPage() {
  const { credentials, clearCredentials, hydrated } = useAuditCredentials();
  const [batchId, setBatchId] = useState<string | null>(null);
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>("pending");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [baselineAnswers, setBaselineAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [baselineNotes, setBaselineNotes] = useState("");

  const listQuery = useAuditListQuery(
    {
      batchId,
      status: filterStatus,
      pageSize: DEFAULT_PAGE_SIZE,
    },
    { enabled: Boolean(batchId) },
  );

  const detailQuery = useAuditDetailQuery(selectedAuditId, { enabled: Boolean(selectedAuditId) });
  const submitDecision = useSubmitDecisionMutation(selectedAuditId);
  const exportMutation = useExportBatchMutation(batchId);
  const cleanupMutation = useCleanupBatchMutation(batchId);
  const manifestQuery = useExportMetadataQuery(batchId);

  const currentDetail = detailQuery.data;
  const issuesSet = useAuditIssues(currentDetail);

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
    }
  }, [batchId]);

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

  const listItems = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  );
  const currentIndex = useMemo(() => {
    if (!selectedAuditId) return -1;
    return listItems.findIndex((item) => item.id === selectedAuditId);
  }, [listItems, selectedAuditId]);

  useEffect(() => {
    if (!selectedAuditId) return;
    if (currentIndex !== -1) return;
    if (listItems.length === 0) {
      setSelectedAuditId(null);
      return;
    }
    setSelectedAuditId(listItems[0].id);
  }, [currentIndex, listItems, selectedAuditId]);

  const previousId = currentIndex > 0 ? listItems[currentIndex - 1]?.id ?? null : null;
  const nextId =
    currentIndex >= 0 && currentIndex < listItems.length - 1
      ? listItems[currentIndex + 1]?.id ?? null
      : null;

  const handleProcessed = (response: ProcessResponse) => {
    const newBatchId = response.summary.batch_id;
    setBatchId(newBatchId);
    setFilterStatus("pending");
    const firstItem = response.audit?.items?.[0];
    setSelectedAuditId(firstItem?.id ?? null);
  };

  const handleSelectItem = (id: number) => {
    if (id === selectedAuditId) return;
    if (hasChanges) {
      const confirmed = window.confirm(
        "Você possui alterações não salvas. Deseja descartá-las e trocar de cartão?",
      );
      if (!confirmed) return;
    }
    setSelectedAuditId(id);
  };

  const handleAnswerChange = (question: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [question]: value }));
  };

  const handleSaveDecision = () => {
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
        listQuery.refetch();
        manifestQuery.refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Não foi possível salvar a decisão");
      },
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
    const confirmed = window.confirm(
      "Tem certeza que deseja limpar o lote? Esta ação removerá dados e arquivos exportados.",
    );
    if (!confirmed) return;

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

  return (
    <div className="relative min-h-screen bg-background">
      <CredentialsDialog />

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
        </header>

        <UploadForm onProcessed={handleProcessed} disabled={!credentials.user} />

        {batchId ? (
          <BatchSummary
            response={listQuery.data}
            batchId={batchId}
            manifestInfo={
              manifestQuery.data && typeof manifestQuery.data === "object" && "exported_at" in manifestQuery.data
                ? {
                    exported_at: manifestQuery.data.exported_at,
                    exported_by: manifestQuery.data.exported_by,
                  }
                : undefined
            }
          />
        ) : null}

        <ExportActions
          batchId={batchId}
          disabled={!batchId || listQuery.isLoading}
          isExporting={exportMutation.isPending}
          isCleaning={cleanupMutation.isPending}
          manifest={
            manifestQuery.data && typeof manifestQuery.data === "object" && "exported_at" in manifestQuery.data
              ? {
                  exported_at: manifestQuery.data.exported_at,
                  exported_by: manifestQuery.data.exported_by,
                }
              : undefined
          }
          manifestLoading={manifestQuery.isLoading}
          onExport={handleExport}
          onCleanup={handleCleanup}
        />

        <main className="grid flex-1 gap-6 pb-10 lg:grid-cols-[320px_1fr]">
          <aside className="flex h-full flex-col gap-3">
            <AuditList
              items={listQuery.data?.items}
              isLoading={listQuery.isLoading}
              selectedId={selectedAuditId}
              onSelect={handleSelectItem}
              filterStatus={filterStatus}
              onFilterStatus={setFilterStatus}
            />
          </aside>

          <section className="flex h-full flex-col gap-4">
            {showWorkspace && currentDetail ? (
              <>
                <AuditImageViewer
                  imageUrl={currentDetail.image_url}
                  markedImageUrl={currentDetail.marked_image_url}
                  issues={currentDetail.issues}
                />
                <QuestionGrid
                  responses={currentDetail.responses}
                  currentAnswers={answers}
                  issues={issuesSet}
                  onChange={handleAnswerChange}
                  isSaving={submitDecision.isPending}
                />
                <DecisionToolbar
                  onSave={handleSaveDecision}
                  onPrev={previousId ? () => handleSelectItem(previousId) : undefined}
                  onNext={nextId ? () => handleSelectItem(nextId) : undefined}
                  disabled={!currentDetail}
                  isSaving={submitDecision.isPending}
                  hasChanges={hasChanges}
                  notes={notes}
                  onNotesChange={setNotes}
                />
              </>
            ) : batchId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                <p>Selecione um cartão pendente na lista para iniciar a correção.</p>
                <p>
                  Cartões disponíveis: <strong>{listItems.length}</strong>
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                <p>Faça upload de um lote para visualizar cartões em auditoria.</p>
              </div>
            )}
          </section>
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
