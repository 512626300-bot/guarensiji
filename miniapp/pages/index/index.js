const api = require('../../utils/api');
Page({
  data: {
    groups: [
      { id: 1, name: '乒乓球底板', icon: '🏓', desc: '专业底板', categories: '1', color: '#1a73e8' },
      { id: 2, name: '乒乓球胶皮', icon: '🔴', desc: '正手/反手胶皮', categories: '2', color: '#e4393c' },
      { id: 3, name: '胶水·拍套', icon: '🧴', desc: '胶水及拍套配件', categories: '3,4', color: '#34a853' },
      { id: 4, name: '乒乓球服饰', icon: '👕', desc: '服饰球鞋', categories: '5,6', color: '#fbbc04' }
    ],
    activeGroup: null,
    products: [],
    loading: false,
    page: 1,
    hasMore: true
  },
  onLoad() {
    this.loadProducts();
  },
  onPullDownRefresh() {
    this.data.page = 1;
    this.data.hasMore = true;
    this.setData({ products: [], activeGroup: null });
    this.loadProducts().then(() => wx.stopPullDownRefresh());
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.data.page++;
      this.loadProducts();
    }
  },
  selectGroup(e) {
    const g = e.currentTarget.dataset.group;
    if (!g) return;
    this.setData({ activeGroup: g.id, products: [], page: 1, hasMore: true });
    this.loadProducts(g.categories);
  },
  clearFilter() {
    this.setData({ activeGroup: null, products: [], page: 1, hasMore: true });
    this.loadProducts();
  },
  async loadProducts(categories) {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const cat = categories || '';
      const params = `page=${this.data.page}&size=10${cat ? '&categories=' + cat : ''}`;
      const data = await api.get('/api/products?' + params);
      this.setData({
        products: this.data.page === 1 ? data.list : [...this.data.products, ...data.list],
        hasMore: data.list.length >= 10,
        loading: false
      });
    } catch (e) { this.setData({ loading: false }); }
  },
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/product/product?id=' + id });
  },
  goConfigurator() {
    wx.navigateTo({ url: '/pages/configurator/configurator' });
  }
});
