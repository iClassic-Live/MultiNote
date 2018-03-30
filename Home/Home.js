//获取用户本机的相对像素比
const SWT = 750 / wx.getSystemInfoSync().screenWidth;

//用于监测变换图片的滑动操作起始的标识
var lockA = true; //获取滑动起始点信息的锁
var lockB = true; //滑动达到指定值后的锁
/* 页面构造器：页面功能初始化 */

  Page({

      data: {
        //应用版本号显示
        version: getApp().globalData.version,

        //背景图切换功能初始化
        duration: 0, //背景图滑块切换的过渡时间
        current: wx.getStorageSync("bgiCurrent") || 0, //背景图所在滑块序号
        bgiQueue: getApp().globalData.bgiQueue, //背景图地址队列
      },

    /* 页面默认功能 */

      /* 生命周期函数--监听页面加载 */
      onLoad (res) {
        console.log("Home onLoad");
        var bgiCurrent = wx.getStorageSync("bgiCurrent") || 0;
        if (this.data.current !== bgiCurrent) this.setData({ current: bgiCurrent });
      },

      /* 生命周期函数--监听页面显示 */
      onShow (res){
        console.log("Home onShow");
        var bgiCurrent = wx.getStorageSync("bgiCurrent");
        if (this.data.current === bgiCurrent) {
          if (this.data.current !== 500) this.setData({ duration: 500 });
        } else this.setData({ current: bgiCurrent });
        //针对系统存在虚拟导航栏的安卓用户进行优化以避免因记事条目过多导致读记事页的检索功能失常;
        var creatingSign = [wx.getStorageSync("How Many Notes Can I Create"), null];
        if (creatingSign[0][0] === "unchanged") {
          creatingSign[1] = setInterval(() => {
            var num = Math.floor(wx.getSystemInfoSync().windowHeight * SWT * 0.85 / 73.5);
            if (creatingSign[0][1] > num) {
              wx.setStorageSync("How Many Notes Can I Create", ["changed", num]);
              clearInterval(creatingSign[1]);
            }
          });
        }
      },

      /* 生命周期函数--监听页面初次渲染完成 */
      onReady (res) {
        console.log("Home onReady");
        if (this.data.current !== 500) this.setData({ duration: 500 });
      },

      /* 生命周期函数--监听页面卸载 */
      onUnload (res) {
        console.log("Home onUnload");
      },

    /* 自定义用户交互逻辑 */
      /* 背景图切换 */
      changeBackgroundImage(res) {
        if (res.type === "touchstart") {
          this.anchor = res.touches[0].pageX
        } else if (res.type === "touchend") {
          var moveDistance = res.changedTouches[0].pageX - this.anchor;
          if (Math.abs(moveDistance) >= 750 / SWT / 3) {
            if (moveDistance < 0 && this.data.current < getApp().globalData.bgiQueue.length - 1) {
              this.setData({ current: this.data.current + 1 });
              wx.setStorageSync("bgiCurrent", this.data.current);
            } else if (moveDistance > 0 && !!this.data.current) {
              this.setData({ current: this.data.current - 1 });
              wx.setStorageSync("bgiCurrent", this.data.current);
            }
          }
        }
      },

      /* 开始使用 */
      //MultiNote开始使用按钮，当用户缓存中有记事时则跳转到读记事页，否则跳转到写记事页
      startUsing (res) {
        if (wx.getStorageSync("note").length > 0) {
          wx.showLoading({
            title: "正在进入读记事",
            mask: true
          });
          wx.redirectTo({ url: "../ShowNote/ShowNote" });
        } else {
          wx.showLoading({
            title: "正在进入写记事",
            mask: true
          });
          wx.redirectTo({ url: "../CreateNote/CreateNote" });
        }
      }

  });