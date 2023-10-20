<template>
  <div class="json-schema-editor">
    <el-row class="row" :gutter="10">

      <el-col :span="8" class="json-col-name" v-if="displayJsonName">
        <div :style="{marginLeft:`${20*deep}px`}" class="json-col-name-c">
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
          <el-input :disabled="disabled || root" class="json-col-name-input" @blur="onInputName"
                    v-model="pickKey"
                    :key="pickValue" />
        </div>
        <el-tooltip v-if="root">
          <template #content>{{ local['checked_all'] }}</template>
          <el-checkbox :disabled="!isObject && !isArray" class="json-col-name-required" @change="onRootCheck" />
        </el-tooltip>
        <el-tooltip v-else>
          <template #content>{{ local['required'] }}</template>
          <el-checkbox :disabled="isItem" :checked="checked" class="json-col-name-required" @change="onCheck" />
        </el-tooltip>
      </el-col>

      <el-col :span="4" class="json-col-type">
        <el-select v-model="pickValue.type" :disabled="disabledType" class="json-type-select" @change="onChangeType">
          <el-option :key="type" v-for="(type) in TYPE_NAME" :value="type">
            {{ type }}
          </el-option>
        </el-select>
      </el-col>

      <el-col :span="6" class="json-col-title">
        <el-input v-model="pickValue.title" class="json-col-title" :placeholder="local['title']" />
      </el-col>
      <el-col :span="6" class="json-col-setting">
        <el-tooltip>
          <template #content>{{ local['adv_setting'] }}</template>
          <el-button v-show="pickValue.type" link class="setting-icon" @click="onSetting">
            <template #icon>
              <el-icon>
                <Setting />
              </el-icon>
            </template>
          </el-button>
        </el-tooltip>
        <el-tooltip v-if="isObject">
          <template #content>{{ local['add_child_node'] }}</template>
          <el-button link class="plus-icon" @click="addChild" v-if="!disabledType">
            <template #icon>
              <el-icon>
                <Plus />
              </el-icon>
            </template>
          </el-button>

        </el-tooltip>
        <el-tooltip v-if="!root && !isItem">
          <template #content>{{ local['remove_node'] }}</template>
          <el-button link class="close-icon json-btn-icon-only" @click="removeNode">
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
      <json-schema-editor v-for="(item,key,index) in pickValue.properties"
                          :hide-root-name="hideRootName"
                          :value="{[key]:item}"
                          :parent="pickValue"
                          :key="index"
                          :deep="deep+1"
                          :root="false"
                          class="children"
                          :lang="lang"
                          :custom="custom" />
    </template>
    <template v-if="isArray">
      <json-schema-editor :value="{items:pickValue.items}"
                          :hide-root-name="hideRootName"
                          :deep="deep+1"
                          disabled
                          isItem
                          :root="false"
                          class="children"
                          :lang="lang"
                          :custom="custom" />
    </template>
    <el-dialog v-model="advanceModalVisible"
               v-if="advanceModalVisible"
               :title="local['adv_setting']"
               :close-on-click-modal="false"
               width="800px"
               modal-class="json-schema-editor-advanced-modal">
      <template #footer>

        <el-button @click="advanceModalVisible=false">{{ local['cancel'] }}</el-button>
        <el-button type="primary" @click="submitAdvanceJson">
          {{ local['ok'] }}
        </el-button>
      </template>
      <div class="json-title">{{ local['base_setting'] }}</div>
      <el-form :model="advancedValue" class="json-advanced-search-form">
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
      <div>
        <div class="json-title" v-show="custom">{{ local['add_custom'] }}</div>
        <el-form class="json-advanced-search-form" v-show="custom">
          <el-row :gutter="6" class="custom-property" :align="'middle'">
            <el-col :span="8" v-for="item in customProps" :key="item.key">
              <el-form-item :label="item.key" style="margin-bottom: 0;">
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
              <el-form-item style="margin-bottom: 0;">
                <template #label>
                  <el-input v-model="addProp.key" style="width:100px" />
                </template>
                <el-input v-model="addProp.value" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <div>
                <el-button link @click="confirmAddCustomNode(null)" v-if="addingCustom">
                  <template #icon>
                    <el-icon>
                      <Check />
                    </el-icon>
                  </template>
                </el-button>
                <el-tooltip :content="local['add_custom']" v-else>
                  <el-button link @click="addCustomNode">
                    <template #icon>
                      <el-icon>
                        <Plus />
                      </el-icon>
                    </template>
                  </el-button>
                </el-tooltip>
              </div>
            </el-col>
          </el-row>
        </el-form>
      </div>
      <div class="json-preview">
        <div class="json-title">{{ local['preview'] }}</div>
        <pre class="json-preview-pre">{{ completeNodeValue }}</pre>
      </div>
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
    // 隐藏根节点的json-name，只显示 type title setting
    hideRootName: {
      type: Boolean,
      default: false
    },
    value: {
      type: Object,
      required: true
    },
    //name不可编辑，根节点name不可编辑,数组元素name不可编辑
    disabled: {
      type: Boolean,
      default: false
    },
    //禁用类型选择
    disabledType: {
      type: Boolean,
      default:
          false
    },
    //是否数组元素
    isItem: {
      type: Boolean,
      default:
          false
    },
    // 节点深度，根节点deep=0
    deep: {
      type: Number,
      default:
          0
    },
    //是否root节点
    root: {
      type: Boolean,
      default:
          true
    },
    //父节点
    parent: {
      type: Object,
      default:
          null
    },
    //enable custom properties
    custom: {
      type: Boolean,
      default:
          false
    },
    // i18n language
    lang: {
      type: String,
      default:
          'zh_CN'
    }
  }
  ,
  computed: {
    pickValue() {
      return Object.values(this.value)[0]
    },
    pickKey() {
      return Object.keys(this.value)[0]
    },
    isObject() {
      return this.pickValue.type === 'object'
    },
    isArray() {
      return this.pickValue.type === 'array'
    },
    checked() {
      return this.parent && this.parent.required && this.parent.required.indexOf(this.pickKey) >= 0
    },
    advanced() {
      return TYPE[this.pickValue.type]
    },
    advancedAttr() {
      return TYPE[this.pickValue.type].attr
    },
    ownProps() {
      return ['type', 'title', 'properties', 'items', 'required', ...Object.keys(this.advancedAttr)]
    },
    advancedNotEmptyValue() {
      const jsonNode = Object.assign({}, this.advancedValue);
      for (let key in jsonNode) {
        isNull(jsonNode[key]) && delete jsonNode[key]
      }
      return jsonNode
    },
    completeNodeValue() {
      const t = {}
      const basicValue = {...this.pickValue}
      for (const item of this.customProps) {
        t[item.key] = item.value
      }
      this._pickDiffKey().forEach(key => delete basicValue[key])
      return Object.assign({}, basicValue, t, this.advancedNotEmptyValue)
    },
    displayJsonName() {
      if (!this.root) {
        return true
      }
      return !this.hideRootName;
    }
  }
  ,
  data() {
    return {
      TYPE_NAME,
      hidden: false,
      countAdd: 1,
      advanceModalVisible: false,
      advancedValue: {},
      addProp: {},// 自定义属性
      customProps: [],
      addingCustom: false,
      local: LocalProvider(this.lang)
    }
  }
  ,
  methods: {
    handleEnum(ev) {
      if (!ev) return ''
      if (!ev.length) return ''
      return ev.join('\n')
    },
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
    },
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
    },
    onCheck(e) {
      console.log(e)
      this._checked(e.target?.checked, this.parent)
    },
    onRootCheck(e) {
      this._deepCheck(e.target?.checked, this.pickValue)
    },
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
    },
    _deepCheck(checked, node) {
      if (node.type === 'object' && node.properties) {
        checked ? node['required'] = Object.keys(node.properties) : (delete node['required'])
        Object.keys(node.properties).forEach(key => this._deepCheck(checked, node.properties[key]))
      } else if (node.type === 'array' && node.items.type === 'object') {
        checked ? node.items['required'] = Object.keys(node.items.properties) : (delete node.items['required'])
        Object.keys(node.items.properties).forEach(key => this._deepCheck(checked, node.items.properties[key]))
      }
    },
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
    },
    addChild() {
      const name = this._joinName()
      const type = 'string'
      const node = this.pickValue
      node.properties || (node['properties'] = {}) // this.$set(node,'properties',{})
      const props = node.properties
      props[name] = {type: type} //this.$set(props,name,{type: type})
    },
    parseCustomProps() {
      const ownProps = this.ownProps
      Object.keys(this.pickValue).forEach(key => {
        if (ownProps.indexOf(key) === -1) {
          this.confirmAddCustomNode({key: key, value: this.pickValue[key]})
          // this.$delete(this.pickValue,key)
        }
      })
    },
    addCustomNode() {
      // this.$set(this.addProp,'key',this._joinName())
      // this.$set(this.addProp,'value','')
      this.addProp['key'] = this._joinName()
      this.addProp['value'] = ''
      this.addingCustom = true
    },
    removeCustomNode(key) {
      this.customProps.forEach((item, index) => {
        if (item.key === key) {
          this.customProps.splice(index, 1)
        }
      })
    },
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
      this.addingCustom = false
    },
    removeNode() {
      const {properties, required} = this.parent
      delete properties[this.pickKey]
      if (required) {
        const pos = required.indexOf(this.pickKey)
        pos >= 0 && required.splice(pos, 1)
        required.length === 0 && (delete this.parent['required'])
      }
    },
    _joinName() {
      return `field_${this.deep}_${this.countAdd++}`
    },
    onSetting() {
      this.advanceModalVisible = true
      this.advancedValue = {...this.advanced.value}
      for (const k in this.advancedValue) {
        if (this.pickValue[k]) {
          this.advancedValue[k] = this.pickValue[k]
        }
      }
      this.parseCustomProps()
    },
    submitAdvanceJson() {
      this.advanceModalVisible = false
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
    },
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

.json-schema-editor .row .json-col-name {
  display: flex;
  align-items: center;
}

.json-schema-editor .row .json-col-name .json-col-name-c {
  display: flex;
  align-items: center;
}

.json-schema-editor .row .json-col-name .json-col-name-required {
  flex: 0 0 24px;
  text-align: center;
  padding-left: 5px;
}

.json-schema-editor .row .json-type-select {
  width: 100%;
}

.json-schema-editor .row .json-col-setting {
  display: flex;
  align-items: center;
  justify-content: flex-start;
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

.json-schema-editor-advanced-modal {
  color: rgba(0, 0, 0, 0.65);
  min-width: 600px;
}

.json-schema-editor .json-title, .json-schema-editor-advanced-modal .json-title {
  display: block;
  font-size: 20px;
  font-weight: bold;
  font-family: initial;
}

.json-schema-editor-advanced-modal .custom-property {
  margin-top: 16px;
}

.json-schema-editor-advanced-modal .json-preview {
  font-family: monospace;
  height: 100%;
  overflow-y: auto;
  border-radius: 4px;

}

.json-schema-editor-advanced-modal .json-preview-pre {
  padding: 12px;
  margin-top: 16px;
  font-family: monospace;
  height: 100%;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
</style>
