const app = getApp()

Page({
  data: {
    isAccountAssistant: app.globalData.isAccountAssistant
  },
  onLoad() {

  },
  init() {

  },
  onShareAppMessage() {
    return {
      title: '您手中的小小密码本',
      path: '/pages/index/index',
      imageUrl: '/images/share.png',
    }
  },
})