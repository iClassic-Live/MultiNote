const app = getApp();
var getUserInfoSuccessfully = false;

Page({
  data: {
    motto: "Make Noting Multiply",
    startBtn: "开始使用",
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse("button.open-type.getUserInfo"),

    img: [
      {url: "../images/background-image.jpg"},
      {},
      {},
      {}]
  },

  onLoad: function (e) {
    console.log("Home onLoad");
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse) {
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }
  },
  onShow: function (e) {
    console.log("Home onShow");
    if (app.globalData.userInfo !== null && app.globalData.userInfo !== undefined) {
      getUserInfoSuccessfully = true;
      this.setData({
        BtnColor: "black",
      })
    }
  },

  /* 自定义用户交互逻辑 */
    getUserInfo: function (e) {
      console.log(e);
      console.log("Home getUserInfo: successful");
      app.globalData.userInfo = e.detail.userInfo
      this.setData({
        userInfo: e.detail.userInfo,
        hasUserInfo: true
      })
    },
    toNote: function () {
      function startup () {
        if (wx.getStorageSync("note").length > 0) {
          wx.redirectTo({
            url: "../ShowNote/ShowNote"
          })
        } else {
          wx.redirectTo({
            url: "../CreateNote/CreateNote"
          })
        }
      }
      if (!this.data.hasUserInfo && this.data.canIUse) {
        wx.showToast({
          title: "离线使用",
          image: "../images/warning.png"
        });
        setTimeout(() => {
          startup();
        }, 2000);
      }else {
        startup();
      }
    },
})