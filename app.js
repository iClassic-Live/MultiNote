console.clear();
App({

  globalData: {
    current: wx.getStorageSync("bgiCurrent") || 0,
    bgiQueue: [
      "../images/bgi1.jpg",
      "../images/bgi2.jpg",
      "../images/bgi3.jpg",
      "../images/bgi4.gif",      
      "../images/bgi5.gif"
    ]
  },

  /**
   * 当小程序初始化完成时，会触发 onLaunch（全局只触发一次）
   */
  onLaunch: function (res) {
    console.log("MultiNote onLaunch");
    if (!wx.getStorageSync("note")) wx.setStorageSync("", []);
  },

  /**
   * 当小程序启动，或从后台进入前台显示，会触发 onShow
   */
  onShow: function (res) {
    console.log("MultiNote onShow");
  },

  /**
   * 当小程序从前台进入后台，会触发 onHide
   */
  onHide: function (res) {
    console.log("MultiNote onHide");
  },

  onUnload: function (res) {
    console.log("MultiNote onUnload");
  },

  /**
   * 当小程序发生脚本错误，或者 api 调用失败时，会触发 onError 并带上错误信息
   */
  onError: function (msg) {
    console.log("MultiNote onError", msg);
  }
});
