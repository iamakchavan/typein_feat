// Immediately execute before anything else loads
(function() {
  function setTheme() {
    const savedTheme = localStorage.getItem('editor-theme');
    const html = document.documentElement;
    const validThemes = ['light', 'dark', 'amethyst-light', 'amethyst-dark', 'cosmic-light', 'cosmic-dark', 'perpetuity-light', 'perpetuity-dark', 'quantum-rose-light', 'quantum-rose-dark', 'clean-slate-light', 'clean-slate-dark'];
    
    // Remove all theme classes
    html.classList.remove('light', 'dark', 'amethyst-light', 'amethyst-dark', 'cosmic-light', 'cosmic-dark', 'perpetuity-light', 'perpetuity-dark', 'quantum-rose-light', 'quantum-rose-dark', 'clean-slate-light', 'clean-slate-dark');
    
    if (validThemes.includes(savedTheme)) {
      html.classList.add(savedTheme);
    } else {
      // Default to dark mode
      html.classList.add('dark');
      localStorage.setItem('editor-theme', 'dark');
    }
  }

  // Run immediately
  setTheme();

  // Also run on storage changes
  window.addEventListener('storage', setTheme);
})(); 