export function ThemeScript() {
  const script = `
    (function() {
      function getCookie(name) {
        const value = '; ' + document.cookie;
        const parts = value.split('; ' + name + '=');
        if (parts.length === 2) return parts.pop().split(';').shift();
      }
      
      function applyTheme() {
        const colorMode = getCookie('color-mode') || 'dark';
        const root = document.documentElement;
        
        // Apply color mode immediately
        root.classList.remove('light', 'dark');
        if (colorMode === 'dark') {
          root.classList.add('dark');
        }
      }
      
      // Apply theme immediately
      applyTheme();
      
      // Listen for theme changes and apply them immediately
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            // Theme class changed, ensure it's applied correctly
            const colorMode = getCookie('color-mode') || 'dark';
            const root = document.documentElement;
            
            if (colorMode === 'dark' && !root.classList.contains('dark')) {
              root.classList.add('dark');
            } else if (colorMode === 'light' && root.classList.contains('dark')) {
              root.classList.remove('dark');
            }
          }
        });
      });
      
      // Start observing
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      // Also listen for cookie changes (for when theme is toggled)
      let lastColorMode = getCookie('color-mode') || 'dark';
      setInterval(function() {
        const currentColorMode = getCookie('color-mode') || 'dark';
        if (currentColorMode !== lastColorMode) {
          lastColorMode = currentColorMode;
          applyTheme();
        }
      }, 100);
      
    })();
  `.trim();

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
