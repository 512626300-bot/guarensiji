const api = require('../../utils/api');
const { showToast } = require('../../utils/util');
const app = getApp();
Page({
  data: {
    cartItems: [],
    addresses: [],
    selectedAddress: null,
    totalAmount: 0,
    totalAmountText: '0.00',
    remark: ''
  },
  onShow() {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    this.loadCheckoutData();
  },
  async loadCheckoutData() {
    try {
      let selected = app.globalData.checkoutItems;
      if (!selected || !selected.length) {
        const items = await api.get('/api/cart');
        selected = items.filter(i => i.selected);
      }
      if (!selected.length) { showToast('请选择商品'); wx.navigateBack(); return; }
      const addresses = await api.get('/api/addresses');
      const total = selected.reduce((s, i) => s + i.price * i.quantity, 0);
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0] || null;
      this.setData({ cartItems: selected, addresses, selectedAddress: defaultAddr, totalAmount: total, totalAmountText: total.toFixed(2) });
    } catch (e) { showToast('加载失败'); }
  },
  selectAddress() {
    wx.navigateTo({ url: '/pages/address/address?select=1' });
  },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }); },
  async createOrder() {
    if (!this.data.selectedAddress) { showToast('请选择收货地址'); return; }
    wx.showLoading({ title: '提交中...' });
    try {
      const data = await api.post('/api/orders/create', {
        items: this.data.cartItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        address_id: this.data.selectedAddress.id,
        remark: this.data.remark
      });
      this.doPayment(data.order_id, data.total_amount);
    } catch (e) {
      wx.hideLoading();
      showToast(e.message || '提交失败');
    }
  },
  async doPayment(orderId, amount) {
    try {
      const payConfig = await api.get('/api/orders/pay/config');
      if (payConfig.enabled) {
        wx.showLoading({ title: '获取支付参数...' });
        const { code } = await wx.login();
        const payRes = await api.post('/api/orders/wxpay', { order_id: orderId, openid: code });
        wx.hideLoading();
        if (payRes.mock) {
          wx.showModal({ title: '支付提示', content: '微信支付暂不可用，使用模拟支付？', success: (r) => { if (r.confirm) this.mockPay(orderId, amount); } });
        } else {
          wx.requestPayment({
            ...payRes.params,
            success: () => { showToast('支付成功', 'success'); wx.redirectTo({ url: '/pages/order-detail/order-detail?id=' + orderId }); },
            fail: () => { showToast('支付取消'); }
          });
        }
      } else {
        this.mockPay(orderId, amount);
      }
    } catch (e) {
      this.mockPay(orderId, amount);
    }
  },
  async mockPay(orderId, amount) {
    wx.hideLoading();
    wx.showModal({
      title: '模拟支付',
      content: `订单金额: ¥${amount}\n点击确定模拟支付成功`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '支付中...' });
          try {
            await api.post('/api/orders/mock', { order_id: orderId });
            wx.hideLoading();
            showToast('支付成功', 'success');
            wx.redirectTo({ url: '/pages/order-detail/order-detail?id=' + orderId });
          } catch (e) { wx.hideLoading(); showToast('支付失败'); }
        }
      }
    });
  }
});
