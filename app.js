console.clear();
App({

  globalData: {
    version: "MultiNote 1.16.5", //版本号
    current: wx.getStorageSync("bgiCurrent") || 0, //当前背景图序号
    bgiQueue: [ //背景图地址队列
      "../images/bgi1.jpg",
      "../images/bgi2.jpg",
      "../images/bgi3.gif",
      "../images/bgi4.jpg",
      "../images/bgi5.jpg",
      "../images/bgi6.gif"
    ]
  },

  /**
   * 当小程序初始化完成时，会触发 onLaunch（全局只触发一次）
   */
  onLaunch: function (res) {
    console.log("MultiNote onLaunch");
    //针对系统存在虚拟导航栏的安卓用户进行优化以避免因记事条目过多导致读记事页的检索功能失常;
    if (wx.getStorageInfoSync().keys.indexOf("How Many Notes Can I Create") === -1) {
      var num = Math.floor(wx.getSystemInfoSync().windowHeight * (750 / wx.getSystemInfoSync().windowWidth) * 0.85 / 73.5);
      wx.setStorageSync("How Many Notes Can I Create", ["unchanged", num]);
    };
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
