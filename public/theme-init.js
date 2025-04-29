// Force dark mode by default, run before page load
(function() {
  try {
    // Only switch to light if explicitly set
    if (localStorage.getItem('editor-theme') !== 'light') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('editor-theme', 'dark');
    }
  } catch (e) {
    // If localStorage fails, force dark mode
    document.documentElement.classList.add('dark');
  }
})(); 