import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import MapView from '@/views/MapView.vue'
import CalculatorView from '@/views/CalculatorView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomeView,
    },
    {
      path: '/map',
      name: 'Map',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: MapView,
    },
    {
      path: '/calculators',
      name: 'Calculators',
      component: CalculatorView,
    },
  ],
})

export default router
