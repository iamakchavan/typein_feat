// Immediately execute before anything else loads
(function() {
  function setTheme() {
    const savedTheme = localStorage.getItem('editor-theme');
    const html = document.documentElement;
    
    if (savedTheme === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
    } else {
      // For any other case (null, 'dark', invalid value), force dark mode
      html.classList.remove('light');
      html.classList.add('dark');
      localStorage.setItem('editor-theme', 'dark');
    }
  }

  // Run immediately
  setTheme();

  // Also run on storage changes
  window.addEventListener('storage', setTheme);
})(); 