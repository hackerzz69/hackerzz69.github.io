<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <div id="logo">
      <img width="32px" src="https://www.pngrepo.com/png/25812/512/highlighter.png" />
      <h2 id="logoText">Highlite</h2>
    </div>
    <nav>
      <RouterLink to="/" class="navItem">Home</RouterLink>
      <RouterLink to="/map" class="navItem">Map</RouterLink>
      <RouterLink to="/calculators" class="navItem">Calculators</RouterLink>
      <!-- Drop Down Menu -->
    </nav>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #222121;
}

/* Navbar Dropdown Element */
nav {
  display: flex;
  gap: 1rem;
}
nav .navItem {
  color: #fff;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}
nav .navItem:hover {
  background-color: #444343;
  transition: background-color 0.3s ease;
}
nav .router-link-active {
  background-color: #373737;
}

#logo {
  display: flex;
  align-items: center;
}

#logo h2 {
  margin-left: 0.5rem;
  color: #fff;

  /* Highlight Effect */
  text-shadow:
    0 0 5px rgba(242, 255, 0, 0.8),
    0 0 10px rgba(210, 208, 75, 0.6),
    0 0 15px rgba(199, 193, 23, 0.4),
    0 0 20px rgba(186, 238, 15, 0.2);
  font-size: 1.5rem;
  font-weight: bold;
  text-transform: uppercase;
}
</style>
