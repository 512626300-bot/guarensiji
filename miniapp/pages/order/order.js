const api = require('../../utils/api');
Page({
  data: {
    orders: [],
    loading: false,
    status: '',
    page: 1,
    hasMore: true
  },
  onShow() {
    this.data.page = 1;
    this.data.hasMore = true;
    this.setData({ orders: [] });
    this.loadOrders();
  },
  statusText(s) {
    const map = { pending: '待支付', paid: '已支付', shipped: '已发货', done: '已完成', canceled: '已取消' };
    return map[s] || s;
  },
  async loadOrders() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const data = await api.get(`/api/orders?status=${this.data.status}&page=${this.data.page}&size=10`);
      this.setData({
        orders: (this.data.page === 1 ? data : [...this.data.orders, ...data]).map(o => ({ ...o, _statusText: this.statusText(o.status) })),
        hasMore: data.length >= 10,
        loading: false
      });
    } catch (e) { this.setData({ loading: false }); }
  },
  switchTab(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ status, orders: [], page: 1, hasMore: true });
    this.loadOrders();
  },
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id });
  }
});
