/**
 * Theme Manager - Dark Mode Support
 * Handles theme switching, persistence, and system preference detection
 */

class ThemeManager {
  constructor() {
    this.STORAGE_KEY = 'uqudo_theme_preference';
    this.THEME_ATTRIBUTE = 'data-theme';
    this.DARK_CLASS = 'dark-mode';
    this.THEMES = {
      LIGHT: 'light',
      DARK: 'dark',
      SYSTEM: 'system'
    };

    this.currentTheme = this.THEMES.SYSTEM;
    this.listeners = [];

    // Bind methods
    this.handleSystemThemeChange = this.handleSystemThemeChange.bind(this);

    // Initialize
    this.init();
  }

  /**
   * Initialize theme manager
   */
  init() {
    // Load saved preference
    this.loadSavedTheme();

    // Apply initial theme
    this.applyTheme(this.currentTheme);

    // Listen for system preference changes
    this.setupSystemPreferenceListener();

    // Make toggle function globally available
    window.toggleTheme = () => this.toggle();
    window.setTheme = (theme) => this.setTheme(theme);
    window.getTheme = () => this.getEffectiveTheme();
  }

  /**
   * Load saved theme preference from localStorage or API
   */
  loadSavedTheme() {
    // First check localStorage
    const savedTheme = localStorage.getItem(this.STORAGE_KEY);

    if (savedTheme && Object.values(this.THEMES).includes(savedTheme)) {
      this.currentTheme = savedTheme;
    } else {
      // Default to system preference
      this.currentTheme = this.THEMES.SYSTEM;
    }
  }

  /**
   * Save theme preference to localStorage and optionally to API
   */
  async saveThemePreference(theme) {
    // Save to localStorage for immediate persistence
    localStorage.setItem(this.STORAGE_KEY, theme);

    // Try to save to backend if user is authenticated
    const token = localStorage.getItem('auth_token') || localStorage.getItem('uqudo_token');
    if (token && window.api) {
      try {
        await window.api.request('/users/me/preferences', {
          method: 'PATCH',
          body: JSON.stringify({ theme_preference: theme })
        });
      } catch (error) {
        // Silently fail - localStorage has the preference
        console.debug('Could not save theme to server:', error.message);
      }
    }
  }

  /**
   * Load theme preference from API (call after login)
   */
  async loadThemeFromAPI() {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('uqudo_token');
    if (!token || !window.api) return;

    try {
      const response = await window.api.request('/users/me/preferences');
      if (response.success && response.data?.theme_preference) {
        const serverTheme = response.data.theme_preference;
        if (Object.values(this.THEMES).includes(serverTheme)) {
          this.currentTheme = serverTheme;
          localStorage.setItem(this.STORAGE_KEY, serverTheme);
          this.applyTheme(serverTheme);
        }
      }
    } catch (error) {
      console.debug('Could not load theme from server:', error.message);
    }
  }

  /**
   * Setup listener for system preference changes
   */
  setupSystemPreferenceListener() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', this.handleSystemThemeChange);
    }
  }

  /**
   * Handle system preference change
   */
  handleSystemThemeChange(event) {
    if (this.currentTheme === this.THEMES.SYSTEM) {
      this.applyTheme(this.THEMES.SYSTEM);
      this.notifyListeners();
    }
  }

  /**
   * Get the system's preferred color scheme
   */
  getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return this.THEMES.DARK;
    }
    return this.THEMES.LIGHT;
  }

  /**
   * Get the effective theme (resolves 'system' to actual theme)
   */
  getEffectiveTheme() {
    if (this.currentTheme === this.THEMES.SYSTEM) {
      return this.getSystemPreference();
    }
    return this.currentTheme;
  }

  /**
   * Apply theme to the document
   */
  applyTheme(theme) {
    const effectiveTheme = theme === this.THEMES.SYSTEM ? this.getSystemPreference() : theme;
    const html = document.documentElement;
    const body = document.body;

    // Remove existing theme classes and attributes
    html.removeAttribute(this.THEME_ATTRIBUTE);
    body.classList.remove(this.DARK_CLASS);

    // Apply new theme
    if (effectiveTheme === this.THEMES.DARK) {
      html.setAttribute(this.THEME_ATTRIBUTE, 'dark');
      body.classList.add(this.DARK_CLASS);
    } else {
      html.setAttribute(this.THEME_ATTRIBUTE, 'light');
    }

    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(effectiveTheme);

    // Update toggle button state
    this.updateToggleButton(effectiveTheme);
  }

  /**
   * Update meta theme-color for mobile browsers
   */
  updateMetaThemeColor(theme) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }

    metaThemeColor.content = theme === this.THEMES.DARK ? '#0d1117' : '#ffffff';
  }

  /**
   * Update toggle button visual state
   */
  updateToggleButton(theme) {
    const toggleButtons = document.querySelectorAll('.theme-toggle');
    toggleButtons.forEach(btn => {
      const sunIcon = btn.querySelector('.icon-sun');
      const moonIcon = btn.querySelector('.icon-moon');

      if (sunIcon && moonIcon) {
        // Icons are handled via CSS, but we can add aria-label
        btn.setAttribute('aria-label',
          theme === this.THEMES.DARK ? 'Switch to light mode' : 'Switch to dark mode'
        );
      }
    });
  }

  /**
   * Set theme explicitly
   */
  setTheme(theme) {
    if (!Object.values(this.THEMES).includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Use 'light', 'dark', or 'system'.`);
      return;
    }

    this.currentTheme = theme;
    this.applyTheme(theme);
    this.saveThemePreference(theme);
    this.notifyListeners();
  }

  /**
   * Toggle between light and dark themes
   */
  toggle() {
    const effectiveTheme = this.getEffectiveTheme();
    const newTheme = effectiveTheme === this.THEMES.DARK ? this.THEMES.LIGHT : this.THEMES.DARK;
    this.setTheme(newTheme);
  }

  /**
   * Add listener for theme changes
   */
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  /**
   * Remove listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  /**
   * Notify all listeners of theme change
   */
  notifyListeners() {
    const effectiveTheme = this.getEffectiveTheme();
    this.listeners.forEach(callback => {
      try {
        callback(effectiveTheme, this.currentTheme);
      } catch (error) {
        console.error('Theme listener error:', error);
      }
    });
  }

  /**
   * Check if dark mode is currently active
   */
  isDarkMode() {
    return this.getEffectiveTheme() === this.THEMES.DARK;
  }

  /**
   * Get current theme setting (may be 'system')
   */
  getCurrentSetting() {
    return this.currentTheme;
  }
}

// Create singleton instance
const themeManager = new ThemeManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThemeManager, themeManager };
}

// Also expose globally
window.ThemeManager = ThemeManager;
window.themeManager = themeManager;

/**
 * Initialize theme toggle button HTML
 * Call this function to add the toggle button to an element
 */
function createThemeToggleButton(containerId) {
  const container = document.getElementById(containerId) || document.querySelector(containerId);
  if (!container) return null;

  const button = document.createElement('button');
  button.className = 'theme-toggle';
  button.setAttribute('aria-label', 'Toggle theme');
  button.setAttribute('title', 'Toggle light/dark mode');
  button.innerHTML = `
    <span class="material-symbols-rounded icon-sun">light_mode</span>
    <span class="material-symbols-rounded icon-moon">dark_mode</span>
  `;
  button.addEventListener('click', () => themeManager.toggle());

  container.appendChild(button);
  return button;
}

// Expose the helper function
window.createThemeToggleButton = createThemeToggleButton;

/**
 * Create theme selector dropdown (for settings pages)
 */
function createThemeSelector(containerId) {
  const container = document.getElementById(containerId) || document.querySelector(containerId);
  if (!container) return null;

  const currentSetting = themeManager.getCurrentSetting();

  const html = `
    <div class="theme-selector">
      <label class="form-label">Theme Preference</label>
      <div class="theme-options d-flex gap-2">
        <button type="button" class="theme-option ${currentSetting === 'light' ? 'active' : ''}"
                data-theme="light" onclick="setTheme('light')">
          <span class="material-symbols-rounded">light_mode</span>
          <span>Light</span>
        </button>
        <button type="button" class="theme-option ${currentSetting === 'dark' ? 'active' : ''}"
                data-theme="dark" onclick="setTheme('dark')">
          <span class="material-symbols-rounded">dark_mode</span>
          <span>Dark</span>
        </button>
        <button type="button" class="theme-option ${currentSetting === 'system' ? 'active' : ''}"
                data-theme="system" onclick="setTheme('system')">
          <span class="material-symbols-rounded">contrast</span>
          <span>System</span>
        </button>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Add listener to update active state
  themeManager.addListener(() => {
    const setting = themeManager.getCurrentSetting();
    container.querySelectorAll('.theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === setting);
    });
  });

  return container;
}

window.createThemeSelector = createThemeSelector;

// Add theme selector styles
const themeSelectorStyles = document.createElement('style');
themeSelectorStyles.textContent = `
  .theme-selector {
    margin-bottom: 1rem;
  }

  .theme-options {
    display: flex;
    gap: 0.5rem;
  }

  .theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    border: 2px solid var(--border-primary);
    border-radius: 0.5rem;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 80px;
  }

  .theme-option:hover {
    border-color: var(--accent-primary);
    color: var(--text-primary);
  }

  .theme-option.active {
    border-color: var(--accent-primary);
    background: var(--accent-primary-subtle);
    color: var(--accent-primary);
  }

  .theme-option .material-symbols-rounded {
    font-size: 1.5rem;
  }

  .theme-option span:last-child {
    font-size: 0.75rem;
    font-weight: 500;
  }
`;
document.head.appendChild(themeSelectorStyles);
