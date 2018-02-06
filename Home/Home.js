/* 页面构造器：页面功能初始化 */
  Page({

    /* 页面默认功能 */

      /* 生命周期函数--监听页面加载 */
      onLoad (res) {
        console.log("Home onLoad");
      },

      /* 生命周期函数--监听页面显示 */
      onShow (res){
        console.log("Home onShow");
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
      /* 开始使用 */
      //MultiNote开始使用按钮，当用户缓存中有记事时则跳转到读记事页，否则跳转到写记事页
      startUsing (res) {
        if (wx.getStorageSync("note").length > 0) {

          wx.redirectTo({ url: "../ShowNote/ShowNote" });

        } else wx.redirectTo({ url: "../CreateNote/CreateNote" });
      }

  });