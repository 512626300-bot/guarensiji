const api = require('../../utils/api');
const { showToast } = require('../../utils/util');
Page({
  data: {
    product: null,
    quantity: 1,
    loading: true
  },
  onLoad(options) {
    this.loadProduct(options.id);
  },
  async loadProduct(id) {
    this.setData({ loading: true });
    try {
      const product = await api.get('/api/products/' + id);
      this.setData({ product, loading: false });
    } catch (e) {
      showToast('加载失败');
      this.setData({ loading: false });
    }
  },
  decrease() {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 });
    }
  },
  increase() {
    if (this.data.quantity < this.data.product.stock) {
      this.setData({ quantity: this.data.quantity + 1 });
    }
  },
  async addToCart() {
    if (!this.data.product) return;
    try {
      await api.post('/api/cart', { product_id: this.data.product.id, quantity: this.data.quantity });
      showToast('已加入购物车', 'success');
    } catch (e) {
      showToast(e.message || '添加失败');
    }
  },
  async buyNow() {
    if (!this.data.product) return;
    try {
      await api.post('/api/cart', { product_id: this.data.product.id, quantity: this.data.quantity });
      wx.switchTab({ url: '/pages/cart/cart' });
    } catch (e) {
      showToast(e.message || '操作失败');
    }
  }
});
