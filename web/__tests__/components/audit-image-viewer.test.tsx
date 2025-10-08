import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { AuditImageViewer } from "@/components/auditoria/audit-image-viewer";

describe("AuditImageViewer", () => {
  it("permite alternar entre imagem original e marcada", () => {
    render(
      <AuditImageViewer
        imageUrl="/original.jpg"
        markedImageUrl="/marcada.jpg"
        issues={[]}
      />,
    );

    const markedButton = screen.getByRole("button", { name: /marcada/i });
    const originalButton = screen.getByRole("button", { name: /original/i });

    expect(markedButton).toHaveClass("bg-background");
    fireEvent.click(originalButton);
    expect(originalButton).toHaveClass("bg-background");
  });

  it("exibe mensagem quando imagem não está disponível", () => {
    render(<AuditImageViewer issues={[]} />);
    expect(screen.getByText(/imagem não disponível/i)).toBeInTheDocument();
  });
});
