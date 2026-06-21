/**
 * 头像相关工具函数
 */

const DEFAULT_AVATAR_URL = 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png';

/** 文字头像可选底色 */
const AVATAR_COLORS = [
  '#5B8FF9',
  '#5AD8A6',
  '#5D7092',
  '#F6BD16',
  '#E8684A',
  '#6DC8EC',
  '#9270CA',
  '#FF9D4D',
  '#269A99',
  '#FF99C3'
];

/**
 * 判断是否为默认头像或未设置头像
 * @param {string} avatarUrl 头像地址
 * @returns {boolean}
 */
function isDefaultAvatar(avatarUrl) {
  if (!avatarUrl || !String(avatarUrl).trim()) {
    return true;
  }
  return String(avatarUrl).trim() === DEFAULT_AVATAR_URL;
}

/**
 * 获取姓名后两个字
 * @param {string} name 姓名
 * @returns {string}
 */
function getNameSuffix(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.length <= 2 ? trimmed : trimmed.slice(-2);
}

/**
 * 根据姓名生成稳定的头像底色
 * @param {string} name 姓名
 * @returns {string}
 */
function getAvatarColor(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return AVATAR_COLORS[0];
  }

  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * 解析学员头像展示方式
 * @param {Object} options 参数
 * @param {string} [options.avatarUrl] 头像地址
 * @param {string} [options.studentName] 教练设置的学员姓名
 * @returns {{ mode: 'image'|'text'|'default', imageUrl?: string, text?: string, bgColor?: string }}
 */
function resolveStudentAvatar({ avatarUrl, studentName } = {}) {
  const name = (studentName || '').trim();

  if (!isDefaultAvatar(avatarUrl)) {
    return {
      mode: 'image',
      imageUrl: avatarUrl
    };
  }

  const suffix = getNameSuffix(name);
  if (suffix) {
    return {
      mode: 'text',
      text: suffix,
      bgColor: getAvatarColor(name)
    };
  }

  return {
    mode: 'default',
    imageUrl: DEFAULT_AVATAR_URL
  };
}

module.exports = {
  DEFAULT_AVATAR_URL,
  isDefaultAvatar,
  getNameSuffix,
  getAvatarColor,
  resolveStudentAvatar
};
