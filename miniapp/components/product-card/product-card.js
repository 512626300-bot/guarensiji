// components/product-card/product-card.js
Component({
  properties: {
    product: Object
  },
  methods: {
    goDetail() {
      wx.navigateTo({
        url: '/pages/product/product?id=' + this.properties.product.id
      });
    }
  }
});
