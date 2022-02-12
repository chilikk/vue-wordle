import { createApp } from 'vue'
import { VueCookieNext } from 'vue-cookie-next'
import { VueClipboard } from '@soerenmartius/vue3-clipboard'
import Game from './Game.vue'
import './game.css'

// resize for scaling the board size
window.addEventListener('resize', onResize)
// set size on startup
onResize()

function onResize() {
  // get actual vh on mobile
  document.body.style.setProperty('--vh', window.innerHeight + 'px')
}

const app = createApp(Game)
app.use(VueCookieNext)
app.use(VueClipboard)
app.mount('#app')
