const api = require('../../utils/api');
const { showToast, formatTime } = require('../../utils/util');

function statusText(s) {
  const map = { pending: '待支付', paid: '已支付', shipped: '已发货', done: '已完成', canceled: '已取消' };
  return map[s] || s;
}
Page({
  data: {
    order: null,
    loading: true
  },
  onLoad(options) {
    if (options.id) this.loadOrder(options.id);
  },
  async loadOrder(id) {
    this.setData({ loading: true });
    try {
      const order = await api.get('/api/orders/' + id);
      this.setData({ order: { ...order, _statusText: statusText(order.status), _formatTime: formatTime(order.created_at) }, loading: false });
    } catch (e) {
      showToast('加载失败');
      this.setData({ loading: false });
    }
  },
  async pay() {
    const order = this.data.order;
    if (!order) return;
    try {
      const payConfig = await api.get('/api/orders/pay/config');
      if (payConfig.enabled) {
        wx.showLoading({ title: '获取支付参数...' });
        const { code } = await wx.login();
        const payRes = await api.post('/api/orders/wxpay', { order_id: order.id, openid: code });
        wx.hideLoading();
        if (payRes.mock) {
          wx.showModal({ title: '支付提示', content: '微信支付暂不可用，使用模拟支付？', success: (r) => {
            if (r.confirm) this.mockPay(order);
          }});
        } else {
          wx.requestPayment({
            ...payRes.params,
            success: () => { showToast('支付成功', 'success'); this.loadOrder(order.id); },
            fail: () => { showToast('支付取消'); }
          });
        }
      } else {
        this.mockPay(order);
      }
    } catch (e) {
      this.mockPay(order);
    }
  },
  async mockPay(order) {
    wx.showLoading({ title: '支付中...' });
    try {
      await api.post('/api/orders/mock', { order_id: order.id });
      wx.hideLoading();
      showToast('支付成功', 'success');
      this.loadOrder(order.id);
    } catch (e) { wx.hideLoading(); showToast('支付失败'); }
  },
  async confirmReceipt() {
    wx.showLoading({ title: '确认中...' });
    try {
      await api.post('/api/orders/confirm', { order_id: this.data.order.id });
      wx.hideLoading();
      showToast('已确认收货', 'success');
      this.loadOrder(this.data.order.id);
    } catch (e) { wx.hideLoading(); showToast('操作失败'); }
  },
  copyTrackingNo(e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({ data: text, success: () => showToast('单号已复制') });
  },
  async cancelOrder() {
    wx.showLoading({ title: '取消中...' });
    try {
      await api.post('/api/orders/cancel', { order_id: this.data.order.id });
      wx.hideLoading();
      showToast('已取消', 'success');
      this.loadOrder(this.data.order.id);
    } catch (e) { wx.hideLoading(); showToast(e.message); }
  }
});
