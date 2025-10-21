# phoneVerify 手机号验证组件

## 功能说明

这是一个用于验证用户是否已填写手机号的公共组件。组件设计为无感使用，通过 slot 的方式包裹需要验证手机号的按钮或内容。

## 工作原理

1. 组件自动检查用户是否已有手机号
2. **如果用户已有手机号**：直接显示 slot 内容，点击时触发 `verified` 事件
3. **如果用户没有手机号**：用微信小程序的 `button open-type="getPhoneNumber"` 包裹 slot 内容，点击时先获取手机号，成功后再触发 `verified` 事件

## 使用方法

### 1. 在页面 JSON 中引入组件

```json
{
  "usingComponents": {
    "phone-verify": "/components/phoneVerify/phoneVerify"
  }
}
```

### 2. 在 WXML 中使用

```xml
<!-- 基础用法 -->
<phone-verify bind:verified="onVerifiedTap" bind:needLogin="onNeedLogin">
  <button class="primary-button">立即预约</button>
</phone-verify>

<!-- 包裹自定义内容 -->
<phone-verify bind:verified="onBookCourse" bind:needLogin="onNeedLogin">
  <view class="custom-button">
    <text>开始约课</text>
  </view>
</phone-verify>

<!-- 禁用状态 -->
<phone-verify disabled="{{isDisabled}}" bind:verified="onSubmit" bind:needLogin="onNeedLogin">
  <button>提交订单</button>
</phone-verify>
```

### 3. 在 JS 中处理事件

```javascript
Page({
  /**
   * 验证通过后的回调
   */
  onVerifiedTap(e) {
    const { userInfo } = e.detail;
    console.log('用户手机号已验证:', userInfo.phone);
    
    // 执行实际的业务逻辑
    this.doBookCourse();
  },
  
  /**
   * 需要登录的回调
   */
  onNeedLogin(e) {
    const { message } = e.detail;
    wx.showModal({
      title: '提示',
      content: message,
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }
      }
    });
  },
  
  doBookCourse() {
    // 执行预约课程的逻辑
    wx.navigateTo({
      url: '/pages/bookCourse/bookCourse'
    });
  }
})
```

## 组件属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| disabled | Boolean | false | 是否禁用 |

## 组件事件

| 事件名 | 说明 | 返回参数 |
|--------|------|----------|
| verified | 验证通过（用户已有手机号或刚获取手机号成功） | e.detail = { userInfo } |
| needLogin | 需要登录（用户未登录或为游客模式） | e.detail = { message } |

## 组件方法

| 方法名 | 说明 | 参数 |
|--------|------|------|
| refresh | 刷新用户信息，重新检查手机号状态 | 无 |

### 调用组件方法示例

```javascript
const phoneVerify = this.selectComponent('#phoneVerify');
phoneVerify.refresh();
```

## 使用场景

适用于需要用户手机号才能执行的关键操作，例如：
- 预约课程
- 提交订单
- 报名活动
- 绑定关系
- 其他需要联系方式的场景

## 注意事项

1. 组件会自动缓存用户信息，避免重复请求
2. 获取手机号需要用户主动授权
3. 组件样式已去除 button 的默认样式，可以自由定制 slot 内容的样式
4. 如果用户拒绝授权手机号，会显示提示，不会继续执行业务逻辑

## API 依赖

组件依赖以下 API 接口：
- `api.user.getProfile()` - 获取用户信息
- `api.user.updateProfile({ phone_code })` - 更新用户手机号

请确保这些接口已正确配置。

