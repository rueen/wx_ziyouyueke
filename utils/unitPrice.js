/**
 * 课单价相关工具函数
 */

/**
 * 解析课单价输入
 * @param {string|number} value 输入值
 * @returns {number|null|NaN} null 表示未设置；NaN 表示无效
 */
function parseUnitPriceInput(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return null;
  }

  const num = parseFloat(trimmed);
  if (Number.isNaN(num) || num < 0) {
    return NaN;
  }
  return num;
}

/**
 * 格式化课单价展示
 * @param {number|null|undefined} value 单价
 * @param {string} [fallback='未设置'] 空值文案
 * @returns {string}
 */
function formatUnitPrice(value, fallback = '未设置') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return `${value} 元/课时`;
}

/**
 * 获取有效课单价（覆盖值优先，其次默认值）
 * @param {number|null|undefined} overridePrice 覆盖单价
 * @param {number|null|undefined} defaultPrice 默认单价
 * @returns {number|null}
 */
function getEffectiveUnitPrice(overridePrice, defaultPrice) {
  if (overridePrice !== null && overridePrice !== undefined && overridePrice !== '') {
    return overridePrice;
  }
  if (defaultPrice !== null && defaultPrice !== undefined && defaultPrice !== '') {
    return defaultPrice;
  }
  return null;
}

module.exports = {
  parseUnitPriceInput,
  formatUnitPrice,
  getEffectiveUnitPrice
};
