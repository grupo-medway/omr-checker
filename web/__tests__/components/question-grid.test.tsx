import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { QuestionGrid } from "@/components/auditoria/question-grid";

function makeResponses(count: number) {
  return Array.from({ length: count }, (_value, index) => {
    const question = `q${index + 1}`;
    return {
      question,
      read_value: "A",
      corrected_value: null,
    } as const;
  });
}

describe("QuestionGrid", () => {
  it("paginação limita número de questões renderizadas", () => {
    const responses = makeResponses(65);

    render(
      <QuestionGrid
        responses={responses as any}
        currentAnswers={{}}
        onChange={() => {}}
        issues={new Set()}
      />,
    );

    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /marcar resposta/i }).length).toBeGreaterThan(0);

    // primeira página mostra q1
    expect(screen.getByText("q1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /próxima página de questões/i }));
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(screen.getByText("q65")).toBeInTheDocument();
  });

  it("atalhos de teclado atualizam resposta ativa", () => {
    const onChange = vi.fn();
    render(
      <QuestionGrid
        responses={makeResponses(5) as any}
        currentAnswers={{}}
        onChange={onChange}
        issues={new Set()}
      />,
    );

    fireEvent.keyDown(window, { key: "1" });
    expect(onChange).toHaveBeenCalledWith("q1", "A");
  });
});
