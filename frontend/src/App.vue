<script setup lang="ts">
import Home from '@/views/Home.vue'

const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="site-header">
      <div class="page-width header-content">
        <a class="brand" href="/" aria-label="Shodan Explorer home">
          <span class="brand-mark" aria-hidden="true">S</span>
          <span>Shodan Explorer</span>
        </a>
        <span class="environment-badge">Proxy-compatible</span>
      </div>
    </header>

    <main id="main-content" class="page-width main-content">
      <Home />
    </main>

    <footer class="site-footer">
      <div class="page-width footer-content">
        <span>© {{ currentYear }} LIUWEITAO · MIT License</span>
        <a
          href="https://github.com/liuweitao/shodan-explorer"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
    </footer>
  </div>
</template>
