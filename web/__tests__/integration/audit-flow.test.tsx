import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import AuditoriaPage from "@/app/auditoria/page";

const processResponse = {
  summary: {
    batch_id: "batch-1",
    total_items: 1,
  },
  audit: {
    items: [{ id: 1 }],
  },
} as any;

const detailData = {
  id: 1,
  file_id: "file1.jpg",
  image_url: "/original.jpg",
  marked_image_url: "/marked.jpg",
  issues: ["q1: MULTI"],
  notes: null,
  responses: [
    { question: "q1", read_value: "A", corrected_value: null },
  ],
} as any;

const listData = {
  items: [
    {
      id: 1,
      file_id: "file1.jpg",
      status: "pending",
      updated_at: "2025-10-08T13:21:44",
      issues: ["q1: MULTI"],
    },
  ],
} as any;

const processMutate = vi.fn();
const submitMutate = vi.fn();
const exportMutateAsync = vi.fn(() => Promise.resolve(new Blob(["csv"])));
const cleanupMutateAsync = vi.fn(() => Promise.resolve());
const refetchMock = vi.fn();

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/hooks/useAuditoria", () => ({
  DEFAULT_PAGE_SIZE: 100,
  useTemplatesQuery: () => ({ data: { templates: ["template-a"] }, isLoading: false }),
  useProcessOmrMutation: (options?: { onSuccess?: (response: any) => void }) => ({
    mutate: (variables: any) => {
      processMutate(variables);
      options?.onSuccess?.(processResponse);
    },
    isPending: false,
  }),
  useAuditListQuery: () => ({ data: listData, isLoading: false, refetch: refetchMock, remove: vi.fn() }),
  useAuditDetailQuery: () => ({ data: detailData, isLoading: false }),
  useSubmitDecisionMutation: () => ({
    mutate: (_payload: any, callbacks?: { onSuccess?: (data: any) => void }) => {
      submitMutate(_payload);
      callbacks?.onSuccess?.(detailData);
    },
    isPending: false,
  }),
  useExportBatchMutation: () => ({ mutateAsync: exportMutateAsync, isPending: false }),
  useCleanupBatchMutation: () => ({ mutateAsync: cleanupMutateAsync, isPending: false }),
  useExportMetadataQuery: () => ({
    data: {
      last_exported_at: "2025-10-08T13:23:55",
      exported_by: "auditor@sala1",
    },
    isLoading: false,
    refetch: vi.fn(),
    remove: vi.fn(),
  }),
  useAuditIssues: () => new Set(["q1"]),
}));

vi.mock("@/components/audit-credentials-provider", () => ({
  useAuditCredentials: () => ({
    credentials: { user: "auditor", token: "token" },
    hydrated: true,
    clearCredentials: vi.fn(),
  }),
}));

vi.mock("@/components/auditoria/credentials-dialog", () => ({
  CredentialsDialog: () => null,
}));

describe("AuditoriaPage integration", () => {
  beforeEach(() => {
    processMutate.mockClear();
    submitMutate.mockClear();
    exportMutateAsync.mockClear();
    cleanupMutateAsync.mockClear();
    refetchMock.mockClear();
    vi.spyOn(window, "confirm").mockImplementation(() => true);
  });

  it("executa fluxo principal de auditoria", async () => {
    render(<AuditoriaPage />);

    const fileInput = screen.getByLabelText(/arquivo zip/i);
    const file = new File(["conteudo"], "lote.zip", { type: "application/zip" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /iniciar processamento/i }));

    await waitFor(() => expect(processMutate).toHaveBeenCalled());

    fireEvent.click(screen.getByText("file1.jpg"));

    await waitFor(() => {
      const lidoElements = screen.getAllByText(/lido:/i);
      expect(lidoElements.length).toBeGreaterThan(0);
    });

    // Mudar de A para B (diferente do valor lido "A")
    const bButton = screen.getByRole("button", { name: /marcar resposta B para q1/i });
    fireEvent.click(bButton);

    // Aguardar debounce processar
    await new Promise((resolve) => setTimeout(resolve, 600));

    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /salvar decisão/i });
      expect(saveButton).toBeEnabled();
    });

    const saveButton = screen.getByRole("button", { name: /salvar decisão/i });
    fireEvent.click(saveButton);

    await waitFor(() => expect(submitMutate).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /exportar csv/i }));
    await waitFor(() => expect(exportMutateAsync).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /limpar lote/i }));
    await waitFor(() => expect(cleanupMutateAsync).toHaveBeenCalled());
  });
});
