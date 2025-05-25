<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
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
  color: white;
}
button {
  background-color: #222121;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}
button:hover {
  background-color: #444343;
}
button:active {
  background-color: #373737;
}
.contentHolder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}
.contentHolder h2 {
  font-size: 2rem;
  margin-bottom: 20px;
}
.contentHolder p {
  font-size: 1.2rem;
  max-width: 800px;
  margin-bottom: 20px;
}
.contentHolder a {
  text-decoration: none;
}
main {
  padding-top: 0px;
  padding-bottom: 0px;
  margin-top: -120px;
}
.content {
  background: #00000096;
  border-radius: 5px;
  padding: 10px;
}
</style>
