import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { AuditImageViewer } from "@/components/auditoria/audit-image-viewer";

describe("AuditImageViewer", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";
  });

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

  it("constrói url absoluta quando recebe caminho estático", () => {
    render(
      <AuditImageViewer
        imageUrl="/static/batch1/original/foo.jpg"
        issues={[]}
      />,
    );

    const image = screen.getByRole("img", { name: /cartão omr/i }) as HTMLImageElement;
    expect(image.src).toBe("http://localhost:8000/static/batch1/original/foo.jpg");
  });

  it("codifica espaços ao construir url estática", () => {
    render(
      <AuditImageViewer
        imageUrl="/static/batch 1/original/arquivo final.jpg"
        issues={[]}
      />,
    );

    const image = screen.getByRole("img", { name: /cartão omr/i }) as HTMLImageElement;
    expect(image.src).toBe("http://localhost:8000/static/batch%201/original/arquivo%20final.jpg");
  });

  it("mantém base64 inalterado", () => {
    render(
      <AuditImageViewer
        imageUrl="data:image/png;base64,abcd"
        issues={[]}
      />,
    );

    const image = screen.getByRole("img", { name: /cartão omr/i }) as HTMLImageElement;
    expect(image.src).toBe("data:image/png;base64,abcd");
  });

  it("exibe mensagem quando imagem não está disponível", () => {
    render(<AuditImageViewer issues={[]} />);
    expect(screen.getByText(/imagem não disponível/i)).toBeInTheDocument();
  });
});
