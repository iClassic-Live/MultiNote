Page({
  data: {
    motto: "Make Noting Multiply",
    startBtn: "开始使用"
  },

  onLoad (res) {
    console.log("Home onLoad");
  },

/* 自定义用户交互逻辑 */
  //MultiNote开始使用按钮，当用户缓存中有记事时则跳转到读记事页，否则跳转到写记事页
  startUsing (res) {
    if (wx.getStorageSync("note").length > 0) {
      wx.redirectTo({
        url: "../ShowNote/ShowNote"
      });
    } else {
      wx.redirectTo({
        url: "../CreateNote/CreateNote"
      });
    }
  }
});
