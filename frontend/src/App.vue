<template>
  <div id="app">
    <nav class="navbar is-primary">
      <div class="container">
        <div class="navbar-brand">
          <a class="navbar-item" href="/">
            Shodan Explorer
          </a>
        </div>
        <div class="navbar-end">
          <div class="navbar-item">
            <a class="button is-light" href="/admin">
              Admin
            </a>
          </div>
        </div>
      </div>
    </nav>
    <div class="main-content">
      <div class="container is-fluid">
        <router-view></router-view>
      </div>
    </div>
    <footer class="footer">
      <div class="container">
        <div class="content has-text-centered">
          <p>
            © {{ currentYear }} by LIUWEITAO. The source code is licensed MIT.
            <a href="https://github.com/liuweitao/shodan-explorer" target="_blank">View on GitHub</a>
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      currentYear: new Date().getFullYear()
    }
  }
}
</script>

<style>
@import "~bulma/css/bulma.min.css";

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem 0;
}

.footer {
  margin-top: auto;
  padding: 1rem 0;
}

.container.is-fluid {
  max-width: none;
  width: 95%;
  margin: 0 auto;
}

@media screen and (min-width: 1408px) {
  .container.is-fluid {
    max-width: 1344px;
  }
}
</style>