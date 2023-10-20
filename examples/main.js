import { createApp } from 'vue'
import App from './App.vue'
import JsonSchemaEditor from '../packages/index'
import { ElDialog} from 'element-plus'
import 'element-plus/dist/index.css';
createApp(App).use(JsonSchemaEditor).use(ElDialog).mount('#app')
