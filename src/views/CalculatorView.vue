<script setup lang="ts">
import { Icon } from '@iconify/vue'
</script>

<template>
  <main>
    <div class="contentHolder">
      <h2>Coming Soon...</h2>
      <p></p>
    </div>
  </main>
</template>

<style scoped>
.joinUs {
  position: fixed;
  right: 5px;
  bottom: 5px;
}
/* Center the content */
main {
  text-align: center;
}

/* Background Image */
main::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('@/assets/homepageBackground.png');
  background-size: cover;
  background-position: center;
  z-index: -1; /* Behind the content */
  opacity: 0.25; /* Adjust opacity */
  filter: blur(5px); /* Optional: add a blur effect */
}
main {
  color: var(--theme-text-primary);
}
button {
  background-color: var(--theme-background-soft);
  color: var(--theme-text-primary);
  border: 1px solid var(--theme-border);
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}
button:hover {
  background-color: var(--theme-accent);
  color: var(--theme-text-dark);
  border-color: var(--theme-accent);
}
button:active {
  background-color: var(--theme-accent-dark);
}
.contentHolder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 120px);
  padding: 20px;
  box-sizing: border-box;
}
.contentHolder h2 {
  font-size: 2rem;
  margin-bottom: 20px;
  color: var(--theme-text-primary);
}
.contentHolder p {
  font-size: 1.2rem;
  max-width: 800px;
  margin-bottom: 20px;
  color: var(--theme-text-secondary);
}
.contentHolder a {
  text-decoration: none;
}
.content {
  background: var(--theme-background-mute);
  border: 1px solid var(--theme-border);
  border-radius: 5px;
  padding: 10px;
}
</style>
