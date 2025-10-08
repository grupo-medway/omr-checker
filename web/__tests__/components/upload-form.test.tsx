import React from "react";
import { vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { UploadForm } from "@/components/auditoria/upload-form";

const mutateMock = vi.fn();

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/hooks/useAuditoria", () => ({
  useTemplatesQuery: () => ({ data: { templates: ["template-a", "template-b"] }, isLoading: false }),
  useProcessOmrMutation: () => ({ mutate: mutateMock, mutateAsync: mutateMock, isPending: false }),
}));

vi.mock("@/components/audit-credentials-provider", () => ({
  useAuditCredentials: () => ({ credentials: { user: "auditor", token: "token" } }),
}));

describe("UploadForm", () => {
  beforeEach(() => {
    mutateMock.mockReset();
  });

  it("desabilita processamento sem arquivo selecionado", () => {
    const onProcessed = vi.fn();
    render(<UploadForm onProcessed={onProcessed} />);

    expect(screen.getByRole("button", { name: /iniciar processamento/i })).toBeDisabled();
  });

  it("envia arquivo ZIP quando formulário é válido", async () => {
    const onProcessed = vi.fn();
    render(<UploadForm onProcessed={onProcessed} />);

    const fileInput = screen.getByLabelText(/arquivo zip/i);
    const file = new File(["content"], "lote.zip", { type: "application/zip" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitButton = screen.getByRole("button", { name: /iniciar processamento/i });
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledTimes(1);
      expect(mutateMock).toHaveBeenCalledWith({ file, template: "template-a" });
    });
  });
});
