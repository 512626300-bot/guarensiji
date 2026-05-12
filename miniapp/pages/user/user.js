const api = require('../../utils/api');
const app = getApp();
Page({
  data: {
    userInfo: null,
    orderCounts: { pending: 0, shipped: 0, done: 0 }
  },
  onShow() {
    const token = app.globalData.token || wx.getStorageSync('token') || '';
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || null;
    this.setData({ userInfo });
    if (token) this.loadOrderCounts();
  },
  async loadOrderCounts() {
    try {
      const orders = await api.get('/api/orders?page=1&size=999');
      const pending = orders.filter(o => o.status === 'pending').length;
      const shipped = orders.filter(o => o.status === 'shipped').length;
      const done = orders.filter(o => o.status === 'done').length;
      this.setData({ orderCounts: { pending, shipped, done } });
    } catch (e) {}
  },
  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },
  goOrders(e) {
    const status = e.currentTarget.dataset.status || '';
    wx.switchTab({ url: '/pages/order/order' });
  },
  goAddress() {
    wx.navigateTo({ url: '/pages/address/address' });
  },
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success(res) {
        if (res.confirm) {
          app.globalData.token = '';
          app.globalData.userInfo = null;
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.reLaunch({ url: '/pages/index/index' });
        }
      }
    });
  }
});
