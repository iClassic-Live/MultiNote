const app = getApp();

Page({
  data: {
    motto: "Make Noting Multiply",
    startBtn: "开始使用"
  },

  onLoad: function (e) {
    console.log("Home onLoad");
  },
  onShow: function (e) {
    console.log("Home onShow");
  },

/* 自定义用户交互逻辑 */
    //MultiNote开始使用按钮，当有记事时则跳转到读记事页，否则跳转到写记事页，并检测用户是否已获取微信号的头像昵称
    toNote: function () {
      if (wx.getStorageSync("note").length > 0) {
        wx.redirectTo({
          url: "../ShowNote/ShowNote"
        });
      } else {
        wx.redirectTo({
          url: "../CreateNote/CreateNote"
        });
      }
    },
})