var lockA = true;
var lockB = true;

/* 页面构造器：页面功能初始化 */

  Page({

      data: {
        version: getApp().globalData.version,
        current: getApp().globalData.current,
        bgiQueue: getApp().globalData.bgiQueue
      },

    /* 页面默认功能 */

      /* 生命周期函数--监听页面加载 */
      onLoad (res) {
        console.log("Home onLoad");
        this.setData({
          screenWidth: wx.getSystemInfoSync().screenWidth,
          current: wx.getStorageSync("bgiCurrent") || 0
        });
      },

      /* 生命周期函数--监听页面显示 */
      onShow (res){
        console.log("Home onShow");
        this.setData({ duration: 500 });
      },

      /* 生命周期函数--监听页面初次渲染完成 */
      onReady (res) {
        console.log("Home onReady");
      },

      /* 生命周期函数--监听页面卸载 */
      onUnload (res) {
        console.log("Home onUnload");
      },

    /* 自定义用户交互逻辑 */
      /* 背景图切换 */
      tapEnd(res) {
        lockA = true;
        lockB = true;
        wx.setStorageSync("bgiCurrent", this.data.current);
        getApp().globalData.current = this.data.curent;
      },
      changeBackgroundImage(res) {
        if (lockA) {
          lockA = false;
          this.setData({ anchor: res.changedTouches[0].pageX });
        }
        var moveDistance = res.changedTouches[0].pageX - this.data.anchor;
        if (!lockA && lockB && Math.abs(moveDistance) >= this.data.screenWidth / 3) {
          lockB = false;
          if (moveDistance < 0 && this.data.current < getApp().globalData.bgiQueue.length - 1) {
            this.setData({ current: this.data.current + 1 });
          } else if (moveDistance > 0 && this.data.current !== 0) {
            this.setData({ current: this.data.current - 1 });
          }
        }
      },

      /* 开始使用 */
      //MultiNote开始使用按钮，当用户缓存中有记事时则跳转到读记事页，否则跳转到写记事页
      startUsing (res) {
        if (wx.getStorageSync("note").length > 0) {

          wx.redirectTo({ url: "../ShowNote/ShowNote" });

        } else wx.redirectTo({ url: "../CreateNote/CreateNote" });
      }

  });