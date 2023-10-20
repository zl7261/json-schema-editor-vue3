<template>
  <div class="json-schema-editor">
    <el-row class="row" :gutter="10">
      <el-col :span="8" class="ant-col-name">
        <div :style="{marginLeft:`${20*deep}px`}" class="ant-col-name-c">
          <el-button v-if="pickValue.type==='object'" link style="color:rgba(0,0,0,.65)"
                     @click="hidden = !hidden">
            <template #icon>
              <el-icon>
                <CaretRight v-if="hidden" />
                <CaretBottom v-else />
              </el-icon>
            </template>
          </el-button>
          <span v-else style="width:32px;display:inline-block"></span>
          <el-input :disabled="disabled || root" class="ant-col-name-input" @blur="onInputName"
                    v-model="pickKey"
                    :key="pickValue" />
        </div>
        <el-tooltip v-if="root">
          <template #content>{{ local['checked_all'] }}</template>
          <el-checkbox :disabled="!isObject && !isArray" class="ant-col-name-required" @change="onRootCheck" />
        </el-tooltip>
        <el-tooltip v-else>
          <template #content>{{ local['required'] }}</template>
          <el-checkbox :disabled="isItem" :checked="checked" class="ant-col-name-required" @change="onCheck" />
        </el-tooltip>
      </el-col>
      <el-col :span="4">
        <el-select v-model="pickValue.type" :disabled="disabledType" class="ant-col-type" @change="onChangeType">
          <el-option :key="type" v-for="(type) in TYPE_NAME" :value="type">
            {{ type }}
          </el-option>
        </el-select>
      </el-col>
      <el-col :span="6">
        <el-input v-model="pickValue.title" class="ant-col-title" :placeholder="local['title']" />
      </el-col>
      <el-col :span="6" class="ant-col-setting">
        <el-tooltip>
          <template #content>{{ local['adv_setting'] }}</template>
          <el-button link class="setting-icon" @click="onSetting">
            <template #icon>
              <el-icon>
                <Setting />
              </el-icon>
            </template>
          </el-button>
        </el-tooltip>
        <el-tooltip v-if="isObject">
          <template #content>{{ local['add_child_node'] }}</template>
          <el-button link class="plus-icon" @click="addChild">
            <template #icon>
              <el-icon>
                <Plus />
              </el-icon>
            </template>
          </el-button>

        </el-tooltip>
        <el-tooltip v-if="!root && !isItem">
          <template #content>{{ local['remove_node'] }}</template>
          <el-button link class="close-icon ant-btn-icon-only" @click="removeNode">
            <template #icon>
              <el-icon>
                <Close />
              </el-icon>
            </template>
          </el-button>
        </el-tooltip>
      </el-col>
    </el-row>
    <template v-if="!hidden&&pickValue.properties && !isArray">
      <json-schema-editor v-for="(item,key,index) in pickValue.properties" :value="{[key]:item}" :parent="pickValue"
                          :key="index" :deep="deep+1" :root="false" class="children" :lang="lang" :custom="custom" />
    </template>
    <template v-if="isArray">
      <json-schema-editor :value="{items:pickValue.items}" :deep="deep+1" disabled isItem :root="false"
                          class="children"
                          :lang="lang" :custom="custom" />
    </template>
    <el-dialog v-model="modalVisible" v-if="modalVisible" :title="local['adv_setting']" :maskClosable="false"
               :okText="local['ok']" :cancelText="local['cancel']" width="800px" @ok="handleOk"
               wrapClassName="json-schema-editor-advanced-modal">
      <h3>{{ local['base_setting'] }}</h3>
      <el-form :model="advancedValue" class="ant-advanced-search-form">
        <el-row :gutter="6">
          <el-col :span="8" v-for="(item,key) in advancedValue" :key="key">
            <el-form-item>
              <span>{{ local[key] }}</span>
              <el-input-number v-model="advancedValue[key]"
                               v-if="advancedAttr[key].type === 'integer' || advancedAttr[key].type === 'number'"
                               style="width:100%" :placeholder="key" />
              <span v-else-if="advancedAttr[key].type === 'boolean'" style="display:inline-block;width:100%">
                  <el-switch v-model="advancedValue[key]" />
                </span>
              <el-input :model-value="this.advancedValue['enum']"
                        @update:model-value="ev=>this.advancedValue['enum']=handleEnum(ev)"
                        type="textarea"
                        @blur="changeEnumValue" :rows="2"
                        v-else-if="key === 'enum'"
                        :placeholder="local['enum_msg']" />
              <el-select v-else-if="advancedAttr[key].type === 'array'" v-model="advancedValue[key]"
                         style="width:100%"
                         :placeholder="local[key]"
              >
                <el-option value="">{{ local['nothing'] }}</el-option>
                <el-option :key="t" v-for="t in advancedAttr[key].enums" :value="t">
                  {{ t }}
                </el-option>
              </el-select>
              <el-input v-model="advancedValue[key]" v-else style="width:100%" :placeholder="key" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <h3 v-show="custom">{{ local['add_custom'] }}</h3>
      <el-form class="ant-advanced-search-form" v-show="custom">
        <el-row :gutter="6">
          <el-col :span="8" v-for="item in customProps" :key="item.key">
            <el-form-item :label="item.key">
              <el-input v-model="item.value" style="width:calc(100% - 30px)" />
              <el-button link
                         style="width:30px"
                         @click="removeCustomNode(item.key)"
              >
                <template #icon>
                  <el-icon>
                    <Close />
                  </el-icon>
                </template>
              </el-button>
            </el-form-item>
          </el-col>
          <el-col :span="8" v-show="addProp.key !== undefined">
            <el-form-item>
              <template #label>
                <el-input v-model="addProp.key" style="width:100px" />
              </template>
              <el-input v-model="addProp.value" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item>
              <el-button link @click="confirmAddCustomNode(null)" v-if="customing">
                <template #icon>
                  <el-icon>
                    <Check />
                  </el-icon>
                </template>
              </el-button>
              <el-tooltip :title="local['add_custom']" v-else>
                <el-button link @click="addCustomNode">
                  <template #icon>
                    <el-icon>
                      <Plus />
                    </el-icon>
                  </template>
                </el-button>
              </el-tooltip>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <h3>{{ local['preview'] }}</h3>
      <pre style="width:100%">{{ completeNodeValue }}</pre>
    </el-dialog>
  </div>
</template>
<script>
import {isNull, renamePropertyAndKeepKeyPrecedence} from './util'
import {TYPE, TYPE_NAME} from './type/type'
import {
  ElButton,
  ElCheckbox,
  ElCol,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRow,
  ElSelect,
  ElSwitch,
  ElTooltip
} from 'element-plus'
import {CaretBottom, CaretRight, Check, Close, Plus, Setting} from '@element-plus/icons-vue';
import LocalProvider from './LocalProvider'

export default {
  name: 'JsonSchemaEditor',
  components: {
    Close,
    ElRow,
    ElCol,
    ElButton,
    ElInput,
    ElInputNumber,
    ElCheckbox,
    ElSelect,
    ElOption,
    ElTooltip,
    ElDialog,
    ElForm,
    ElFormItem,
    ElSwitch,
    Check,
    CaretRight,
    CaretBottom,
    Setting,
    Plus
  },
  props: {
    value: {
      type: Object,
      required:
          true
    }
    ,
    disabled: { //name不可编辑，根节点name不可编辑,数组元素name不可编辑
      type: Boolean,
      default:
          false
    }
    ,
    disabledType: { //禁用类型选择
      type: Boolean,
      default:
          false
    }
    ,
    isItem: { //是否数组元素
      type: Boolean,
      default:
          false
    }
    ,
    deep: { // 节点深度，根节点deep=0
      type: Number,
      default:
          0
    }
    ,
    root: { //是否root节点
      type: Boolean,
      default:
          true
    }
    ,
    parent: { //父节点
      type: Object,
      default:
          null
    }
    ,
    custom: { //enable custom properties
      type: Boolean,
      default:
          false
    }
    ,
    lang: { // i18n language
      type: String,
      default:
          'zh_CN'
    }
  }
  ,
  computed: {
    pickValue() {
      return Object.values(this.value)[0]
    }
    ,
    pickKey() {
      return Object.keys(this.value)[0]
    }
    ,
    isObject() {
      return this.pickValue.type === 'object'
    }
    ,
    isArray() {
      return this.pickValue.type === 'array'
    }
    ,
    checked() {
      return this.parent && this.parent.required && this.parent.required.indexOf(this.pickKey) >= 0
    }
    ,
    advanced() {
      return TYPE[this.pickValue.type]
    }
    ,
    advancedAttr() {
      return TYPE[this.pickValue.type].attr
    }
    ,
    ownProps() {
      return ['type', 'title', 'properties', 'items', 'required', ...Object.keys(this.advancedAttr)]
    }
    ,
    advancedNotEmptyValue() {
      const jsonNode = Object.assign({}, this.advancedValue);
      for (let key in jsonNode) {
        isNull(jsonNode[key]) && delete jsonNode[key]
      }
      return jsonNode
    }
    ,
    completeNodeValue() {
      const t = {}
      const basicValue = {...this.pickValue}
      for (const item of this.customProps) {
        t[item.key] = item.value
      }
      this._pickDiffKey().forEach(key => delete basicValue[key])
      return Object.assign({}, basicValue, t, this.advancedNotEmptyValue)
    }
    ,
  }
  ,
  data() {
    return {
      TYPE_NAME,
      hidden: false,
      countAdd: 1,
      modalVisible: false,
      advancedValue: {},
      addProp: {},// 自定义属性
      customProps: [],
      customing: false,
      local: LocalProvider(this.lang)
    }
  }
  ,
  methods: {
    handleEnum(ev) {
      if (!ev) return ''
      if (!ev.length) return ''
      return ev.join('\n')
    }
    ,
    onInputName(e) {
      const oldKey = this.pickKey
      const newKey = e.target.value


      if (oldKey === newKey) return

      // const nodeValue = this.parent.properties[oldKey]

      // 替换key名
      // delete this.parent.properties[oldKey]
      // eslint-disable-next-line vue/no-mutating-props
      // this.parent.properties[newKey] = nodeValue
      renamePropertyAndKeepKeyPrecedence(this.parent.properties, [oldKey, newKey])

      // required重新设置
      const requireds = this.parent.required || []
      const oldIndex = requireds.indexOf(oldKey)
      if (requireds.length > 0 && oldIndex > -1) {
        requireds.splice(oldIndex, 1)
        requireds.push(newKey)
        // eslint-disable-next-line vue/no-mutating-props
        this.parent['required'] = [...new Set(requireds)]
      }
    }
    ,
    onChangeType() {
      this.parseCustomProps()
      // 删除自定义属性
      this.customProps.forEach(item => {
        delete this.pickValue[item.key]
      });
      this.customProps = [];

      delete this.pickValue['properties']
      delete this.pickValue['items']
      delete this.pickValue['required']
      delete this.pickValue['format']
      delete this.pickValue['enum']

      if (this.isArray) {
        this.pickValue['items'] = {type: 'string'}
      }
    }
    ,
    onCheck(e) {
      console.log(e)
      this._checked(e.target?.checked, this.parent)
    }
    ,
    onRootCheck(e) {
      this._deepCheck(e.target?.checked, this.pickValue)
    }
    ,
    changeEnumValue(e) {
      const pickType = this.pickValue.type
      const value = e.target.value
      var arr = value.split('\n')

      if (pickType === 'string') {
        this.advancedValue.enum = arr.map(item => item);
      } else {
        if (arr.length === 0 || (arr.length === 1 && arr[0] === '')) {
          this.advancedValue.enum = null
        } else {
          this.advancedValue.enum = arr.map(item => +item);
        }
      }
    }
    ,
    _deepCheck(checked, node) {
      if (node.type === 'object' && node.properties) {
        checked ? node['required'] = Object.keys(node.properties) : (delete node['required'])
        Object.keys(node.properties).forEach(key => this._deepCheck(checked, node.properties[key]))
      } else if (node.type === 'array' && node.items.type === 'object') {
        checked ? node.items['required'] = Object.keys(node.items.properties) : (delete node.items['required'])
        Object.keys(node.items.properties).forEach(key => this._deepCheck(checked, node.items.properties[key]))
      }
    }
    ,
    _checked(checked, parent) {
      let required = parent.required
      if (checked) {
        // eslint-disable-next-line vue/no-mutating-props
        required || (this.parent['required'] = [])

        required = this.parent.required
        required.indexOf(this.pickKey) === -1 && required.push(this.pickKey)
      } else {
        const pos = required.indexOf(this.pickKey)
        pos >= 0 && required.splice(pos, 1)
      }
      required.length === 0 && (delete parent['required'])
    }
    ,
    addChild() {
      const name = this._joinName()
      const type = 'string'
      const node = this.pickValue
      node.properties || (node['properties'] = {}) // this.$set(node,'properties',{})
      const props = node.properties
      props[name] = {type: type} //this.$set(props,name,{type: type})
    }
    ,
    parseCustomProps() {
      const ownProps = this.ownProps
      Object.keys(this.pickValue).forEach(key => {
        if (ownProps.indexOf(key) === -1) {
          this.confirmAddCustomNode({key: key, value: this.pickValue[key]})
          // this.$delete(this.pickValue,key)
        }
      })
    }
    ,
    addCustomNode() {
      // this.$set(this.addProp,'key',this._joinName())
      // this.$set(this.addProp,'value','')
      this.addProp['key'] = this._joinName()
      this.addProp['value'] = ''
      this.customing = true
    }
    ,
    removeCustomNode(key) {
      this.customProps.forEach((item, index) => {
        if (item.key === key) {
          this.customProps.splice(index, 1)
        }
      })
    }
    ,
    confirmAddCustomNode(prop) {
      const p = prop || this.addProp
      let existKey = false
      this.customProps.forEach(item => {
        if (item.key === p.key) {
          existKey = true
        }
      })
      if (existKey) return
      this.customProps.push(p)
      this.addProp = {}
      this.customing = false
    }
    ,
    removeNode() {
      const {properties, required} = this.parent
      delete properties[this.pickKey]
      if (required) {
        const pos = required.indexOf(this.pickKey)
        pos >= 0 && required.splice(pos, 1)
        required.length === 0 && (delete this.parent['required'])
      }
    }
    ,
    _joinName() {
      return `field_${this.deep}_${this.countAdd++}`
    }
    ,
    onSetting() {
      this.modalVisible = true
      this.advancedValue = {...this.advanced.value}
      for (const k in this.advancedValue) {
        if (this.pickValue[k]) {
          this.advancedValue[k] = this.pickValue[k]
        }
      }
      this.parseCustomProps()
    }
    ,

    handleOk() {
      this.modalVisible = false
      for (const key in this.advancedValue) {
        if (isNull(this.advancedValue[key])) {
          delete this.pickValue[key]
        } else {
          this.pickValue[key] = this.advancedValue[key]
        }
      }
      const diffKey = this._pickDiffKey()
      diffKey.forEach(key => delete this.pickValue[key])
      for (const item of this.customProps) {
        this.pickValue[item.key] = item.value
      }
    }
    ,
    _pickDiffKey() {
      const keys = Object.keys(this.pickValue)
      return keys.filter(item => this.ownProps.indexOf(item) === -1)
    }
  }
}
</script>
<style scoped>
.json-schema-editor .row {
  display: flex;
  margin: 12px;
}

.json-schema-editor .row .ant-col-name {
  display: flex;
  align-items: center;
}

.json-schema-editor .row .ant-col-name .ant-col-name-c {
  display: flex;
  align-items: center;
}

.json-schema-editor .row .ant-col-name .ant-col-name-required {
  flex: 0 0 24px;
  text-align: center;
  padding-left: 5px;
}

.json-schema-editor .row .ant-col-type {
  width: 100%;
}

.json-schema-editor .row .ant-col-setting {
  display: inline-block;
}

.json-schema-editor .row .setting-icon {
  color: rgba(0, 0, 0, 0.45);
  border: none;
}

.json-schema-editor .row .plus-icon {
  border: none;
}

.json-schema-editor .row .close-icon {
  color: #888;
  border: none;
}
</style>
<style>
.json-schema-editor-advanced-modal {
  color: rgba(0, 0, 0, 0.65);
  min-width: 600px;
}

.json-schema-editor-advanced-modal pre {
  font-family: monospace;
  height: 100%;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 12px;
  width: 50%;
}


</style>
