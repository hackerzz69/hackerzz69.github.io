<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-card">
        <div class="logo-section">
          <img src="@/assets/logo.png" alt="Logo" class="logo" />
          <h1>Welcome Back</h1>
          <p>Sign in with your Discord account to continue</p>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div v-if="configStatus && !configStatus.discord_configured" class="warning-message">
          <h3>⚠️ Authentication Not Configured</h3>
          <p>Discord OAuth credentials need to be set up. Please check the setup instructions in the README.</p>
        </div>

        <button 
          @click="handleDiscordLogin" 
          class="discord-login-btn" 
          :disabled="loading || (configStatus && !configStatus.discord_configured)"
        >
          <svg viewBox="0 0 24 24" class="discord-icon">
            <path fill="currentColor" d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z"/>
          </svg>
          <span v-if="!loading && configStatus && configStatus.discord_configured">Continue with Discord</span>
          <span v-else-if="loading">Connecting...</span>
          <span v-else>Authentication Unavailable</span>
        </button>

        <div class="terms">
          <p>By signing in, you agree to our terms of service and privacy policy.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

const authStore = useAuthStore()
const route = useRoute()
const loading = ref(false)
const errorMessage = ref('')
const configStatus = ref<{ discord_configured: boolean; message: string } | null>(null)

onMounted(async () => {
  // Check authentication configuration status
  try {
    const response = await axios.get('http://localhost:3000/auth/status')
    configStatus.value = response.data
  } catch (error) {
    console.error('Failed to check auth status:', error)
  }

  // Check for error in URL params
  if (route.query.error) {
    switch (route.query.error) {
      case 'auth_failed':
        errorMessage.value = 'Authentication failed. Please try again.'
        break
      case 'not_configured':
        errorMessage.value = 'Discord authentication is not configured on the server.'
        break
      default:
        errorMessage.value = 'An error occurred during authentication.'
    }
  }
})

const handleDiscordLogin = () => {
  if (!configStatus.value?.discord_configured) {
    errorMessage.value = 'Discord authentication is not available. Please contact the administrator.'
    return
  }
  
  loading.value = true
  authStore.login()
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  text-align: center;
}

.logo-section {
  margin-bottom: 30px;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
}

.logo-section h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.logo-section p {
  color: #6b7280;
  margin-bottom: 0;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
}

.warning-message {
  background: #fefbef;
  border: 1px solid #fed7aa;
  color: #ea580c;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: left;
}

.warning-message h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.warning-message p {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.discord-login-btn {
  width: 100%;
  background: #5865f2;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.2s ease;
}

.discord-login-btn:hover:not(:disabled) {
  background: #4752c4;
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.discord-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #9ca3af;
}

.discord-icon {
  width: 24px;
  height: 24px;
}

.terms {
  margin-top: 24px;
}

.terms p {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
}
</style>
