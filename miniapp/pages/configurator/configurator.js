const api = require('../../utils/api');
const { showToast } = require('../../utils/util');
Page({
  data: {
    step: 1,
    blades: [],
    rubbers: [],
    glues: [],
    cases: [],
    selected: {
      blade: null,
      fh_rubber: null,
      bh_rubber: null,
      glue: null,
      case: null
    },
    total: 0,
    totalText: '0.00',
    loading: false
  },
  onLoad() {
    this.loadProducts();
  },
  async loadProducts() {
    this.setData({ loading: true });
    try {
      const [blades, rubbers, glues, cases] = await Promise.all([
        api.get('/api/products?category=1&size=20'),
        api.get('/api/products?category=2&size=20'),
        api.get('/api/products?category=3&size=20'),
        api.get('/api/products?category=4&size=20')
      ]);
      this.setData({
        blades: blades.list,
        rubbers: rubbers.list,
        glues: glues.list,
        cases: cases.list,
        loading: false
      });
    } catch (e) {
      showToast('加载失败');
      this.setData({ loading: false });
    }
  },
  selectItem(e) {
    const { type, id } = e.currentTarget.dataset;
    const listMap = { blade: 'blades', fh_rubber: 'rubbers', bh_rubber: 'rubbers', glue: 'glues', case: 'cases' };
    const list = this.data[listMap[type]];
    const item = list.find(p => p.id == id);
    if (!item) return;
    const key = `selected.${type}`;
    // Toggle: if same item clicked, deselect
    if (this.data.selected[type] && this.data.selected[type].id == id) {
      this.setData({ [key]: null });
    } else {
      this.setData({ [key]: item });
    }
    this.calcTotal();
  },
  calcTotal() {
    const s = this.data.selected;
    let total = 0;
    if (s.blade) total += s.blade.price;
    if (s.fh_rubber) total += s.fh_rubber.price;
    if (s.bh_rubber) total += s.bh_rubber.price;
    if (s.glue) total += s.glue.price;
    if (s.case) total += s.case.price;
    this.setData({ total, totalText: total.toFixed(2) });
  },
  async addToCart() {
    const s = this.data.selected;
    if (!s.blade) { showToast('请选择底板'); return; }
    if (!s.fh_rubber) { showToast('请选择正手胶皮'); return; }

    const items = [];
    if (s.blade) items.push(api.post('/api/cart', { product_id: s.blade.id, quantity: 1 }));
    if (s.fh_rubber) items.push(api.post('/api/cart', { product_id: s.fh_rubber.id, quantity: 1 }));
    if (s.bh_rubber) items.push(api.post('/api/cart', { product_id: s.bh_rubber.id, quantity: 1 }));
    if (s.glue) items.push(api.post('/api/cart', { product_id: s.glue.id, quantity: 1 }));
    if (s.case) items.push(api.post('/api/cart', { product_id: s.case.id, quantity: 1 }));

    wx.showLoading({ title: '添加中...' });
    try {
      await Promise.all(items);
      wx.hideLoading();
      wx.showModal({
        title: '已加入购物车',
        content: `¥${this.data.total.toFixed(2)}，去购物车结算？`,
        success: (res) => {
          if (res.confirm) wx.switchTab({ url: '/pages/cart/cart' });
        }
      });
    } catch (e) {
      wx.hideLoading();
      showToast('添加失败，请先登录');
    }
  },
  reset() {
    this.setData({
      selected: { blade: null, fh_rubber: null, bh_rubber: null, glue: null, case: null },
      total: 0,
      totalText: '0.00'
    });
  },
  goCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  }
});
