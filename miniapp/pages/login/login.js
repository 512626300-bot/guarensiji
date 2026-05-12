const api = require('../../utils/api');
const { showToast } = require('../../utils/util');
const app = getApp();
Page({
  data: {
    username: 'user',
    password: 'user123',
    isRegister: false,
    loading: false
  },
  onUsernameInput(e) { this.setData({ username: e.detail.value }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },
  toggleMode() {
    this.setData({ isRegister: !this.data.isRegister });
  },
  async submit() {
    if (!this.data.username || !this.data.password) {
      showToast('请输入用户名和密码');
      return;
    }
    this.setData({ loading: true });
    try {
      const endpoint = this.data.isRegister ? '/api/user/register' : '/api/user/login';
      const data = await api.post(endpoint, {
        username: this.data.username,
        password: this.data.password
      });
      app.globalData.token = data.token;
      app.globalData.userInfo = data.user;
      wx.setStorageSync('token', data.token);
      wx.setStorageSync('userInfo', data.user);
      showToast(this.data.isRegister ? '注册成功' : '登录成功', 'success');
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (e) {
      showToast(e.message || '操作失败');
    } finally {
      this.setData({ loading: false });
    }
  }
});
