// apiBase: 开发工具里用 localhost，真机预览改成本机局域网 IP
App({
  globalData: {
    userInfo: null,
    token: '',
    apiBase: 'http://localhost:3000'
  },
  onLaunch() {
    const token = wx.getStorageSync('token') || '';
    const userInfo = wx.getStorageSync('userInfo') || null;
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
  }
});
