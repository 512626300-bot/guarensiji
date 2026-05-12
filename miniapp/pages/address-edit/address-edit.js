const api = require('../../utils/api');
const { showToast } = require('../../utils/util');
Page({
  data: {
    id: 0,
    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    is_default: false
  },
  onLoad(options) {
    if (options.id) {
      this.setData({ id: Number(options.id) });
      this.loadAddress(options.id);
      wx.setNavigationBarTitle({ title: '编辑地址' });
    }
  },
  async loadAddress(id) {
    try {
      const addr = await api.get('/api/addresses');
      const target = addr.find(a => a.id === Number(id));
      if (target) {
        this.setData({
          name: target.name,
          phone: target.phone,
          province: target.province,
          city: target.city,
          district: target.district,
          detail: target.detail,
          is_default: !!target.is_default
        });
      }
    } catch (e) {}
  },
  inputHandler(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },
  toggleDefault() {
    this.setData({ is_default: !this.data.is_default });
  },
  async save() {
    if (!this.data.name || !this.data.phone || !this.data.detail) {
      showToast('请填写完整信息');
      return;
    }
    try {
      const body = {
        name: this.data.name,
        phone: this.data.phone,
        province: this.data.province,
        city: this.data.city,
        district: this.data.district,
        detail: this.data.detail,
        is_default: this.data.is_default ? 1 : 0
      };
      if (this.data.id) {
        await api.put('/api/addresses/' + this.data.id, body);
      } else {
        await api.post('/api/addresses', body);
      }
      showToast('保存成功', 'success');
      wx.navigateBack();
    } catch (e) {
      showToast(e.message || '保存失败');
    }
  }
});
