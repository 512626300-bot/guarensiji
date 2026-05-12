function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

function statusText(status) {
  const map = {
    pending: '待支付',
    paid: '已支付',
    shipped: '已发货',
    done: '已完成',
    canceled: '已取消'
  };
  return map[status] || status;
}

function showToast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 1500 });
}

module.exports = { formatTime, statusText, showToast };
