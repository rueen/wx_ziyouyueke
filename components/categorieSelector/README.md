# 课程类型/卡片选择器组件

## 组件说明

`categorieSelector` 是一个用于选择课程类型或卡片的弹窗组件，提供统一的选择界面。

## 设计原则

- **高内聚**：组件内部封装了所有选择相关的UI和交互逻辑
- **低耦合**：数据由父组件传入，选择结果通过事件回调返回，不依赖外部状态
- **可复用**：可在多个页面中使用，如约课页面、课程详情页面等

## 属性 (Properties)

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|--------|------|--------|------|------|
| show | Boolean | false | 是 | 是否显示弹窗 |
| categoriesList | Array | [] | 是 | 课程类型列表 |
| cardsList | Array | [] | 是 | 卡片列表 |
| selectedCategorie | Object | null | 否 | 当前选中的课程类型 |
| selectedCard | Object | null | 否 | 当前选中的卡片 |
| title | String | '选择课程类型或卡片' | 否 | 弹窗标题 |
| emptyText | String | '暂无可用课时' | 否 | 空状态提示文本 |

## 事件 (Events)

| 事件名 | 说明 | 返回参数 |
|--------|------|----------|
| hide | 关闭弹窗 | - |
| selectcategorie | 选择课程类型 | { categorie: Object } |
| selectcard | 选择卡片 | { card: Object } |

## 数据格式

### categoriesList 数据格式
```javascript
[
  {
    id: 1,
    category: {
      id: 1,
      name: "瑜伽课程",
      desc: "初级瑜伽课程"
    },
    remaining_lessons: 10
  }
]
```

### cardsList 数据格式
```javascript
[
  {
    id: 1,
    card_name: "月卡",
    total_lessons: 30,
    available_lessons: 20,
    is_unlimited: false,
    expire_date: "2024-12-31"
  }
]
```

## 使用示例

### 1. 在页面配置中引入组件

```json
{
  "usingComponents": {
    "categorie-selector": "/components/categorieSelector/categorieSelector"
  }
}
```

### 2. 在 WXML 中使用

```xml
<categorie-selector
  show="{{showCategorieSelection}}"
  categoriesList="{{categoriesList}}"
  cardsList="{{cardsList}}"
  selectedCategorie="{{selectedCategorie}}"
  selectedCard="{{selectedCard}}"
  title="选择课程类型或卡片"
  bind:hide="onHideCategorieSelection"
  bind:selectcategorie="onSelectCategorie"
  bind:selectcard="onSelectCard"
/>
```

### 3. 在 JS 中处理事件

```javascript
Page({
  data: {
    showCategorieSelection: false,
    categoriesList: [],
    cardsList: [],
    selectedCategorie: null,
    selectedCard: null
  },

  // 显示选择器
  showSelector() {
    this.setData({
      showCategorieSelection: true
    });
  },

  // 隐藏选择器
  onHideCategorieSelection() {
    this.setData({
      showCategorieSelection: false
    });
  },

  // 选择课程类型
  onSelectCategorie(e) {
    const categorie = e.detail.categorie;
    this.setData({
      selectedCategorie: categorie,
      selectedCard: null,
      showCategorieSelection: false
    });
    // 处理选择逻辑
  },

  // 选择卡片
  onSelectCard(e) {
    const card = e.detail.card;
    this.setData({
      selectedCard: card,
      selectedCategorie: null,
      showCategorieSelection: false
    });
    // 处理选择逻辑
  }
})
```

## 使用场景

### 场景1: 约课页面 (bookCourse)

在约课页面中，用户选择教练或学员后，需要选择课程类型或卡片来预约课程。

- 数据来源：从师生关系和卡片接口获取
- 数据传递：父组件已加载好数据，直接传递给组件
- 选择处理：更新约课表单状态

### 场景2: 课程详情页面 (courseDetail)

在课程详情页面中，教练可以修改已预约课程的课程类型或卡片。

- 数据来源：点击编辑按钮时动态加载
- 数据传递：父组件加载数据后传递给组件
- 选择处理：调用编辑课程接口更新课程信息

## 注意事项

1. **数据传递原则**：如果父组件已经有 `categoriesList` 和 `cardsList` 数据，直接作为参数传递，避免在组件内部重复调用接口
2. **关注点分离**：组件只负责展示和选择交互，业务逻辑（如API调用、数据处理）由父组件处理
3. **状态管理**：选中状态由父组件维护，组件通过 props 接收当前状态
4. **事件处理**：选择结果通过事件传递给父组件，由父组件决定如何处理

## 优势

1. **代码复用**：相同的选择UI和交互逻辑只需实现一次
2. **维护简单**：样式和交互逻辑统一修改，不需要在多个页面中分别修改
3. **扩展性好**：可以通过 props 自定义标题、空状态提示等
4. **测试友好**：组件独立，易于单元测试

