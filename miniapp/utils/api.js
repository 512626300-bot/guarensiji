const app = getApp();

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const token = app.globalData.token || wx.getStorageSync('token') || '';
    wx.request({
      url: app.globalData.apiBase + path,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? 'Bearer ' + token : ''
      },
      success(res) {
        if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.navigateTo({ url: '/pages/login/login' });
          reject(new Error('未登录'));
          return;
        }
        if (res.statusCode >= 400) {
          reject(new Error(res.data.error || '请求失败'));
          return;
        }
        resolve(res.data);
      },
      fail(err) {
        reject(new Error('网络错误: ' + err.errMsg));
      }
    });
  });
}

module.exports = {
  get(path) { return request('GET', path); },
  post(path, data) { return request('POST', path, data); },
  put(path, data) { return request('PUT', path, data); },
  del(path, data) { return request('DELETE', path, data); }
};
