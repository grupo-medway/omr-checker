'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/config/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { colorMode, toggleColorMode } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleColorMode}
      className="w-9 h-9"
    >
      {colorMode === 'light' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}