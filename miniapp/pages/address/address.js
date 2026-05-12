const api = require('../../utils/api');
const { showToast } = require('../../utils/util');
Page({
  data: {
    addresses: [],
    selectMode: false,
    loading: false
  },
  onLoad(options) {
    if (options.select === '1') {
      this.setData({ selectMode: true });
    }
  },
  onShow() {
    this.loadAddresses();
  },
  async loadAddresses() {
    this.setData({ loading: true });
    try {
      const addresses = await api.get('/api/addresses');
      this.setData({ addresses, loading: false });
    } catch (e) { this.setData({ loading: false }); }
  },
  addAddress() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' });
  },
  editAddress(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/address-edit/address-edit?id=' + id });
  },
  selectAddress(e) {
    if (!this.data.selectMode) return;
    const id = e.currentTarget.dataset.id;
    const addr = this.data.addresses.find(a => a.id === id);
    if (addr) {
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage) {
        prevPage.setData({ selectedAddress: addr });
      }
      wx.navigateBack();
    }
  },
  async deleteAddress(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.del('/api/addresses/' + id);
            showToast('已删除');
            this.loadAddresses();
          } catch (e) { showToast('删除失败'); }
        }
      }
    });
  }
});
