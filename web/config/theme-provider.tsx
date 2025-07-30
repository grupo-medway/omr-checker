"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getCookie, setCookie } from "@/lib/utils/cookies";

type ColorMode = "light" | "dark";

interface ThemeContextType {
  colorMode: ColorMode;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colorMode: "dark",
  toggleColorMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorMode, setColorMode] = useState<ColorMode>("dark");

  const toggleColorMode = () => {
    const newMode = colorMode === "dark" ? "light" : "dark";
    setColorMode(newMode);
    setCookie("color-mode", newMode, 365);

    applyColorMode(newMode);
  };

  const applyColorMode = (mode: ColorMode) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (mode === "dark") {
      root.classList.add("dark");
    }
  };

  useEffect(() => {
    const savedColorMode = getCookie("color-mode") as ColorMode;
    if (savedColorMode) {
      setColorMode(savedColorMode);
      applyColorMode(savedColorMode);
    }
  }, []);

  useEffect(() => {
    applyColorMode(colorMode);
  }, [colorMode]);

  return (
    <ThemeContext.Provider value={{ colorMode, toggleColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
