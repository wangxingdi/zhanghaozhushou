Component({
  methods: {
    onTap() {
      const info = wx.getAccountInfoSync()
      const { appId } = info.miniProgram
      wx.navigateToMiniProgram({
        appId: 'wx91b33705face3bc5',
        path: '/pages/index/index',
        extraData: { appId, source: 'customerMiniProgram' } // 来源客户小程序
      })
    },
  },
})
