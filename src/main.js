import Vue from 'vue'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import mavonEditor from 'mavon-editor'
import 'mavon-editor/dist/css/index.css'
import App from './App.vue'

Vue.use(ElementUI);
Vue.use(mavonEditor)

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
