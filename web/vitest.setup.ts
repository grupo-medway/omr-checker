import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.mock("next/image", () => ({
  default: ({ alt, fill: _fill, unoptimized: _unoptimized, ...props }: any) =>
    React.createElement("img", { alt, ...props }),
}));
