const api = require('../../utils/api');
const { showToast } = require('../../utils/util');
const app = getApp();
Page({
  data: {
    items: [],
    totalPrice: 0,
    totalPriceText: '0.00',
    selectedAll: false,
    loading: false
  },
  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
  onShow() {
    if (app.globalData.token) {
      this.loadCart();
    }
  },
  async loadCart() {
    this.setData({ loading: true });
    try {
      const items = await api.get('/api/cart');
      this.setData({ items, loading: false });
      this.calcTotal();
    } catch (e) {
      this.setData({ loading: false });
    }
  },
  calcTotal() {
    let total = 0;
    let allSelected = true;
    const items = this.data.items.map(i => {
      i._subtotal = (i.price * i.quantity).toFixed(2);
      if (i.selected) {
        total += i.price * i.quantity;
      } else {
        allSelected = false;
      }
      return i;
    });
    this.setData({
      items,
      totalPrice: total,
      totalPriceText: total.toFixed(2),
      selectedAll: allSelected && this.data.items.length > 0
    });
  },
  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const items = this.data.items.map(i => {
      if (i.id === id) i.selected = !i.selected;
      return i;
    });
    this.setData({ items });
    this.calcTotal();
  },
  toggleAll() {
    const newVal = !this.data.selectedAll;
    this.setData({ items: this.data.items.map(i => ({ ...i, selected: newVal })) });
    this.calcTotal();
  },
  async changeQty(e) {
    const { id, delta } = e.currentTarget.dataset;
    const item = this.data.items.find(i => i.id === id);
    if (!item) return;
    const newQty = item.quantity + Number(delta);
    if (newQty < 1) return;
    if (newQty > item.stock) { showToast('库存不足'); return; }
    try {
      await api.put('/api/cart/' + id, { quantity: newQty });
      this.setData({ items: this.data.items.map(i => i.id === id ? { ...i, quantity: newQty } : i) });
      this.calcTotal();
    } catch (e) { showToast('更新失败'); }
  },
  async deleteItem(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await api.del('/api/cart/' + id);
      this.setData({ items: this.data.items.filter(i => i.id !== id) });
      this.calcTotal();
      showToast('已删除');
    } catch (e) { showToast('删除失败'); }
  },
  async checkout() {
    const selected = this.data.items.filter(i => i.selected);
    if (!selected.length) { showToast('请选择商品'); return; }

    const outOfStock = selected.filter(i => i.stock < i.quantity);
    if (outOfStock.length) {
      showToast(`${outOfStock[0].name} 库存不足`);
      return;
    }

    // Pass selected items to checkout page via globalData
    app.globalData.checkoutItems = selected;
    wx.navigateTo({ url: '/pages/checkout/checkout' });
  }
});
