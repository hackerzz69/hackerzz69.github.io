<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
</script>

<template>
  <main>
    <div class="contentHolder">
      <div class="content">
        <h2>We need your support!</h2>
        <p>
          Highlite is a community-driven project that aims to provide a comprehensive and
          user-friendly experience for players of the game HighSpell. Our goal is to provide a
          RuneLite-esque experience for HighSpell, with a focus on enhancing the gameplay experience
          and providing valuable tools and resources for players. In order to develop Highlite and
          release it to the broader public, we need Dew's support. We ask that you please show your
          support on our suggestion thread.
        </p>
        <a
          href="https://discord.com/channels/936532810955620392/1370897973608976424/1370897973608976424"
          target="_blank"
        >
          <button>Support Us</button>
        </a>
      </div>
    </div>
    <div class="footer">
      <div id="copyright">
        <p>© 2025 Highlite. All rights reserved.</p>
        <p>Made with ❤️ by the Highlite Team</p>
      </div>
    </div>

    <div class="joinUs">
      <a href="https://discord.gg/SszbKF5dtm" target="_blank">
        <button>Join us on <FontAwesomeIcon :icon="faDiscord" /></button>
      </a>
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
  text-transform: uppercase;
  text-decoration: underline;
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
