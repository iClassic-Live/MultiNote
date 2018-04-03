// CreateNote/CreateNote/CreateNote.js

/* 写记事页面初始化 */

//获取用户本机的相对像素比
const SWT = 750 / wx.getSystemInfoSync().screenWidth;

//用于监测是否已开启相关权限的标识初始化
var getRecordAccess = true; //录音权限的标识，默认权限开启
var getCameraAccess = true; //相机权限的标识，默认权限开启
var getAlbumAccess = true; //存图到相册权限的标识，默认权限开启

//记录当前记事的全局载体
var item;

//记事保存初始化
var scanning; //用于监测当前是否可以保存记事和相关记事是否超出限定数目的定时器标识

//语音记事初始化
const recorderManager = wx.getRecorderManager(); //获取全局唯一的录音管理器 recorderManager
const innerAudioContext = wx.createInnerAudioContext(); //创建并返回内部audio上下文 innerAudioContext 对象
var interval, timerA, timerB; //承接呼吸效果方法定时器和计时器的标识
var canIRecord = true; //用于监测当前是否正在进行语音记事的标识
var recordTimer; //使语音记事结束的定时器
var startRecord; //启动语音记事的定时器，防止因点击语音按钮导致出错

var shootTimer; //录像时长计时器的标识
/* 页面构造器：页面功能初始化 */
Page({

  /* 页面默认功能 */
  /* 页面的初始数据 */
  data: {

    //背景图切换功能初始化
    duration: 0, //背景图滑块切换的过渡时间
    current: wx.getStorageSync("bgiCurrent") || 0, //背景图所在滑块序号
    bgiQueue: getApp().globalData.bgiQueue, //背景图地址队列

    //主功能区、相机组件、视频记事预览组件、图片记事预览组件切换功能初始化，默认主功能区启动，其他功能区待命
    mainFnDisplay: true,
    cameraFnDisplay: false,
    videoDisplay: false,
    photoDisplay: false,

    //记事标题功能初始化
    titleDefault: "记事标题", //标题文本为空时的字样，默认为记事标题

    //文本记事功能初始化
    textDefault: "记事文本", //记事文本为空时的字样，默认为记事文本
    text: {}, //记事文本信息
    font: [["超小号", "小号", "默认", "大号", "超大号"], ["轻盈", "默认", "粗壮"], ["默认", "中国红", "罗兰紫", "深空蓝", "森林绿", "巧克力棕"]], //字体样式选择器相应选择项的提示序列

    //语音记事功能初始化
    recordAccess: false, //语音记事权限，默认false，权限关闭
    playbackAccess: false, //语音记事返听权限，默认false，权限关闭
    playback: [], //语音记事播放缓存

    //图片记事功能初始化
    photoPreviewAccess: false, //图片记事预览权限，默认false，权限关闭
    img: [], //图片记事预览缓存

    //记事保存功能初始化
    save_cancel: "取消记事", //保存/取消按钮的字样

    //相机组件功能初始化
    flash: "off", //闪光灯设置，默认关闭
    flashSet: "../images/notflash.png", //闪光灯标识设定
    shootSign: 0, //录像进行时闪动标识
    camSign: 1, //摄像头反转图标的透明度设置
    camChoice: "../images/backCam.png", //摄像头前后置的图标设定
    cameraSet: "../images/photo.png", //拍摄按钮标识设定
    changeMode: "../images/shoot.png", //拍摄类型切换标识设定
    shootNow: false, //录像进行时标识，录像未进行时为false
    qualitySet: "Normal" //照片质量设定，默认为普通

  },

  /* 生命周期函数--监听页面加载 */
  onLoad: function (options) {
    console.log("CreateNote onLoad");
    wx.hideLoading();
    var bgiCurrent = wx.getStorageSync("bgiCurrent") || 0;
    if (this.data.current !== bgiCurrent) this.setData({ current: bgiCurrent });
    //监测是否获取了设备的录音权限、相机权限和保存到相册的权限
    wx.getSetting({
      success(res) {
        function scopeRecord() {
          wx.authorize({
            scope: "scope.record",
            fail(e) {
              getRecordAccess = false;
              wx.showToast({
                title: "未获取录音权限",
                image: "../images/warning.png",
                mask: true
              });
            },
            complete(e) { if (!res.authSetting["scope.camera"]) scopeCamera(); }
          });
        }
        function scopeCamera() {
          wx.authorize({
            scope: "scope.camera",
            fail(e) {
              getCameraAccess = false;
              wx.showToast({
                title: "未获取相机权限",
                image: "../images/warning.png",
                mask: true
              });
            },
            complete(e) { if (!res.authSetting["scope.writePhotosAlbum"]) scopeAlbum(); }
          });
        }
        function scopeAlbum() {
          wx.authorize({
            scope: "scope.writePhotosAlbum",
            fail(res) {
              getAlbumAccess = false;
              wx.showToast({
                title: "无法存图到相册",
                image: "../images/warning.png",
                mask: true
              });
            }
          });
        }
        if (!res.authSetting["scope.record"]) {
          scopeRecord();
        } else if (!res.authSetting["scope.camera"]) {
          scopeCamera();
        } else if (!res.authSetting["scope.writePhotosAlbum"]) scopeAlbum();
      },
      fail(res) {
        var note = wx.getStorageSync("note");
        if (note instanceof Array && !!note.length) {
          var content = "将返回读记事页！"
        } else var content = "将返回启动页！"
        wx.showModal({
          title: "写记事",
          content: "无法检测相关权限获取情况，" + content,
          showCancel: false,
          complete(res) {
            if (note instanceof Array && !!note.length) {
              wx.redirectTo({ url: "../ShowNote/ShowNote" });
            } else wx.redirectTo({ url: "../Home/Home" });
          }
        });
      }
    });
    //监测当前是修改记事还是新建记事，并相应地为接下来的记事存储做准备
    var note = wx.getStorageSync("note");
    if (wx.getStorageInfoSync().keys.indexOf("item_to_edit") !== -1) {
      var index = wx.getStorageSync("item_to_edit")
      item = note[index];
      delete item.note["style"];
      console.log("修改前的记事存储情况如下：",
        "\n记事标题：", item.note.title,
        "\n记事文本：", item.note.text,
        "\n语音记事：", item.note.record,
        "\n图片记事：", item.note.photo,
        "\n视频记事：", item.note.video);
      console.log("用户开始修改记事");
    } else {
      console.log("用户开始新建记事");
      //初始化向写记事页发送数据的载体
      item = {
        id: note.length,
        note: {
          title: "",
          text: {
            content: "",
            fontSize: "100%",
            fontWeight: "normal",
            fontColor: "#000",
            fontIndex: [2, 1, 0]
          },
          record: [],
          photo: [],
          video: ""
        }
      }
      console.log("当前记事内容初始化情况", item);
    }
    this.setData({
      title: item.note.title,
      text: item.note.text,
      playback: item.note.record,
      img: item.note.photo,
    });
    //定时器扫描监测当前是否可以保存记事和相关记事的数目是否超出限定
    var sign;
    scanning = setInterval(() => {
      //监测当前是否可以保存记事
      var title = item.note.title.length > 0;
      var text = item.note.text.content.trim().length > 0;
      var record = item.note.record.length > 0;
      var photo = item.note.photo.length > 0;
      var video = item.note.video.length > 0;
      if (title && !sign) { //只有在已写标题且当前记事条目未达上限的情况下才可以保存记事，否则不允许保存
        if (((!text && !record) && !photo) && !video) { //当有任意一种记事时可以保存记事，否则不允许保存
          this.data.save_cancel === "取消记事" ? "" : this.setData({ save_cancel: "取消记事" });
        } else {
          this.data.save_cancel === "保存记事" ? "" : this.setData({ save_cancel: "保存记事" })
        }
      } else {
        this.data.save_cancel === "取消记事" ? "" : this.setData({ save_cancel: "取消记事" });
      };
      //进行语音记事时不能同时进行照相记事的操作
      if (this.data.recordAccess || this.data.playbackAccess) {
        this.data.photoPreviewAccess ? this.setData({ photoPreviewAccess: false }) : "";
      } else if (this.data.photoPreviewAccess) {
        this.data.recordAccess ? this.setData({ recordAccess: false }) : "";
        this.data.playbackAccess ? this.setData({ playbackAccess: false }) : "";
      };
      //出错扫描，若因记事出错导致相应记事的条目数目大于限定值则裁掉限定数目以后的记事
      item.note.record.length > 5 ?
        item.note.record.splice(6, item.note.record.length - 5) : "";
      item.note.photo.length > 3 ?
        item.note.photo.splice(4, item.note.photo.length - 3) : "";
    }, 10);
  },

  /* 生命周期函数--监听页面显示 */
  onShow: function (res) {
    console.log("CreateNote onShow");
    var bgiCurrent = wx.getStorageSync("bgiCurrent");
    if (this.data.current === bgiCurrent) {
      if (this.data.duration !== 500) this.setData({ duration: 500 });
    } else this.setData({ current: bgiCurrent });
    //针对系统存在虚拟导航栏的安卓用户进行优化以避免因记事条目过多导致读记事页的检索功能失常;
    var num = wx.getStorageSync("How Many Notes Can I Create");
    if (num[0] === "unchanged") {
      var length = wx.getStorageSync("note").length;
      var ifCreatingNote = true;
      if (wx.getStorageInfoSync().keys.indexOf("item_to_edit") !== -1) ifCreatingNote = false;
      var timer = setInterval(() => {
        var Num = Math.floor(wx.getSystemInfoSync().windowHeight * (750 / wx.getSystemInfoSync().windowWidth) * 0.85 / 73.5);
        if (num[1] > Num) {
          wx.setStorageSync("How Many Notes Can I Create", ["changed", Num]);
          if (length >= Num) {
            if (ifCreatingNote) {
              sign = true; //检测到应用视口高度发生变化导致记事条目已达上限
              var content = "当前记事将不能保存，";
            } else var content = "";
            wx.showModal({
              title: "写记事",
              content: "警告：发现由于系统虚拟导航栏因在应用使用过程中被拉起导致应用视口高度发生变化，为保证应用功能正常，" + content + "您需要在目前基础上再删除" + (length - Num + 1) + "条记事才能创建新的记事，不便之处请您谅解！"
            });
            clearInterval(timer);
          }
        }
      }, 10);
    }
  },

  /* 生命周期函数--监听页面初次渲染完成 */
  onReady: function (res) {
    console.log("CreateNote onReady");
    if (this.data.duration !== 500) this.setData({ duration: 500 });
  },

  /* 生命周期函数--监听页面隐藏 */
  onHide: function (res) {
    console.log("CreateNote onHide");
  },

  /* 生命周期函数--监听页面卸载 */
  onUnload: function (res) {
    console.log("CreateNote onUnload");
    clearInterval(scanning);
  },

  /* 自定义用户交互逻辑处理: 写记事  */

  /* 背景图 */
  //背景图滑动切换
  changeBackgroundImage(res) {
    if (res.type === "touchstart" && this.data.mainFnDisplay) {
      this.anchor = res.touches[0].pageX;
    } else if (res.type === "touchend" && this.data.mainFnDisplay) {
      var moveDistance = res.changedTouches[0].pageX - this.anchor;
      if (Math.abs(moveDistance) >= 750 / SWT / 3) {
        if (moveDistance < 0 && this.data.current < getApp().globalData.bgiQueue.length - 1) {
          this.setData({ current: this.data.current + 1 });
          wx.setStorageSync("bgiCurrent", this.data.current);
        } else if (moveDistance > 0 && this.data.current !== 0) {
          this.setData({ current: this.data.current - 1 });
          wx.setStorageSync("bgiCurrent", this.data.current);
        }
      }
    }
  },

  /* 记事标题 */
  //记事标题的创建
  titleContent(res) {
    if (res.type === "focus") {
      //编辑标题时关闭其他所有正在进行的事件类型的读写权限
      for (let prop in this.data) {
        if (/Access/g.test(prop) && this.data[prop]) this.setData({ [prop]: false });
      } 
    } else if (res.type === "input") {
      var value = res.detail.value;
      if (/\s+/.test(value)) {
        value = value.replace(/\s+/, "");
        this.setData({ title: value });
        if (value.length > 20) {
          value = value.substring(0, 20);
          item.note.title = value;
          this.setData({ title: item.note.title });
          wx.showModal({
            title: "标题",
            content: "警告：首字符不能为空格，且标题最长为二十字，相应空格已删除，且删除相应空格后超出的字符已删除",
            showCancel: false
          });
        } else {
          item.note.title = value;
          this.setData({ title: item.note.title });
          wx.showModal({
            title: "标题",
            content: "警告：首字符不能为空格，相应空格已删除",
            showCancel: false
          });
        }
      } else if (value.length > 20) {
        value = value.substring(0, 20);
        item.note.title = value;
        this.setData({ title: item.note.title });
        wx.showModal({
          title: "标题",
          content: "警告：标题最长为三十字，超出的字符已删除",
          showCancel: false
        });
      } else item.note.title = value;
    } else if (res.type === "blur") this.setData({ title: item.note.title });
  },

  /* 文本记事 */
  //文本记事的创建
  textContent(res) {
    if (res.type === "focus") {
       //编辑文本内容时关闭其他所有正在进行的事件类型的读写权限
      for (let prop in this.data) {
        if (/Access/g.test(prop) && this.data[prop]) this.setData({ [prop]: false });
      }
    }else if (res.type === "input") {
      item.note.text.content = res.detail.value;
      this.setData({ text: item.note.text });
    } else if (res.type === "blur") {
      if (res.detail.value.length > 0 && !res.detail.value.trim()) {
        item.note.text.content = "";
        this.setData({ text: item.note.text });
        wx.showToast({
          title: "不能全输入空格",
          image: "../images/warning.png"
        });
      }
    }
  },
  //获取字体样式修改功能
  setFontStyle(res) {
    var that = this;
    if (res.type === "tap") { //获取字体样式修改功能
      var fontStyle = new Object();
      //编辑字体样式时关闭其他所有正在进行的事件类型的读写权限
      for (let prop in this.data) {
        if (/Access/.test(prop) && this.data[prop]) this.setData({ [prop]: false });
      }
      //获取当前字体样式的设定信息
      for (let prop in item.note.text) fontStyle[prop] = item.note.text[prop];
      delete fontStyle["content"];
      this.fontStyle = fontStyle; //在this中存入当前字体样式的设定信息以供取消时恢复当前字体样式
      console.log("修改前的字体样式信息如下：", this.fontStyle);
    } else if (res.type === "columnchange") { //字体样式的展示
      switch (res.detail.column) {
        case 0: { //字体大小的设定；
          switch (res.detail.value) {
            case 0: { that.data.text.fontSize = "50%" }; break;
            case 1: { that.data.text.fontSize = "75%" }; break;
            case 2: { that.data.text.fontSize = "100%" }; break;
            case 3: { that.data.text.fontSize = "150%" }; break;
            case 4: { that.data.text.fontSize = "200%" }; break;
          }
        }; break;
        case 1: { //字体粗细的设定
          switch (res.detail.value) {
            case 0: { that.data.text.fontWeight = "lighter" }; break;
            case 1: { that.data.text.fontWeight = "normal" }; break;
            case 2: { that.data.text.fontWeight = "bolder" }; break;
          }
        }; break;
        case 2: { //字体颜色的设定
          switch (res.detail.value) {
            case 0: { that.data.text.fontColor = "#000"; }; break;
            case 1: { that.data.text.fontColor = "#F00"; }; break;
            case 2: { that.data.text.fontColor = "#8A2BE2"; }; break;
            case 3: { that.data.text.fontColor = "#00BFFF"; }; break;
            case 4: { that.data.text.fontColor = "#228B22"; }; break;
            case 5: { that.data.text.fontColor = "#D2691E"; }; break;
          }
        }; break;
      }
      this.data.text.fontIndex[res.detail.column] = res.detail.value;
      this.setData({ text: this.data.text });
    } else if (res.type === "change") { //确认字体样式的设定
      for (let prop in this.data.text) item.note["text"][prop] = this.data.text[prop];
      item.note.text.fontIndex = res.detail.value;
    } else if (res.type === "cancel") { //取消字体样式的设定
      for (let prop in this.fontStyle) this.data.text[prop] = this.fontStyle[prop];
      this.setData({ text: this.data.text });
    } else if (res.type === "longpress") { //重设字体到默认样式
      var style = new Object();
      for (let prop in item.note["text"]) style[prop] = item.note["text"][prop];
      delete style["content"];
      var origin = { fontSize: "100%", fontWeight: "normal", fontColor: "#000", fontIndex: [2, 1, 0] };
      if (JSON.stringify(style) !== JSON.stringify(origin)) {
        wx.showModal({
          title: "写记事",
          content: "是否重设字体到默认样式？",
          success(res) {
            if (res.confirm) {
              for (let prop in origin) {
                item.note.text[prop] = origin[prop];
                that.setData({ text: item.note.text });
              }
            }
          }
        });
      }
    }
  },


  /* 语音记事 */
  //语音记事与返听功能权限的开启与关闭
  getRecordFn(res) {
    var that = this;
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
    if (this.timerQueue instanceof Array) {
      innerAudioContext.stop();
      for (let i = this.timerQueue.length - 1; i > 0; i--) clearTimeout(this.timerQueue[i]);
      this.data.playback.forEach((ele, id, origin) => {
        if (ele.opacity !== 1) ele.opacity = 1;
      });
      this.setData({ playback: that.data.playback });
    }
    if (getRecordAccess) {
      if (!item.note.record.length) {
        this.data.recordAccess ?
          this.setData({ recordAccess: false }) :
          this.setData({ recordAccess: true });
      } else if (item.note.record.length < 5) {
        if (this.data.recordAccess) {
          wx.showModal({
            title: "语音记事",
            content: "是否要返听语音？",
            success(res) {
              if (res.confirm) that.setData({ playbackAccess: true });
              that.setData({ recordAccess: false });
            }
          });
        } else if (this.data.playbackAccess) {
          wx.showModal({
            title: "语音记事",
            content: "是否要进行记事？",
            success(res) {
              if (res.confirm) that.setData({ recordAccess: true });
              that.setData({ playbackAccess: false });
            }
          });
        } else {
          wx.showActionSheet({
            itemList: ["录音", "返听语音"],
            success(res) {
              if (!res.tapIndex) {
                if (that.data.playbackAccess) that.setData({ playbackAccess: false });
                that.data.recordAccess ?
                  that.setData({ recordAccess: false }) :
                  that.setData({ recordAccess: true });
              } else {
                if (that.data.recordAccess) that.setData({ recordAccess: false });
                that.data.playbackAccess ?
                  that.setData({ playbackAccess: false }) :
                  that.setData({ playbackAccess: true });
              }
            }
          });
        }
      } else {
        this.data.playbackAccess ?
          this.setData({ playbackAccess: false }) :
          this.setData({ playbackAccess: true });
      }
    } else {
      if (item.note.record.length > 0) {
        var that = this;
        if (this.data.playbackAccess) {
          wx.showModal({
            title: "语音记事",
            content: "无录音权限，只能查看已有语音记事",
            success(res) {
              if (res.confirm) {
                that.setData({ playbackAccess: true });
              }
            }
          });
        } else this.setData({ playbackAccess: false });
      } else {
        wx.showToast({
          title: "无录音权限！",
          image: "../images.error.png",
          mask: true
        });
      }
    }
  },
  //开始语音记事
  startRecord(res) {
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
    var that = this;
    if (canIRecord) {
      startRecord = setTimeout(() => {
        recorderManager.start({
          duration: 120000,
          sampleRate: 44100,
          numberOfChannels: 2,
          encodeBitRate: 192000,
          format: "aac",
          frameSize: 50
        });
        recorderManager.onStart((res) => {
          canIRecord = false;
          that.recordDuration = new Date().getTime();
          //创建呼吸效果动画
          that.breathingEffection("start");
          wx.showToast({
            title: "第" + (item.note.record.length + 1) + "条语音记事",
            icon: "none"
          });
        });
        recordTimer = setTimeout(() => {
          recorderManager.stop();
          recorderManager.onStop((res) => {
            console.log("用户成功进行语音记事");
            var length = item.note.record.length;
            var logs = { record_index: length, url: res.tempFilePath, duration: 120000 };
            item.note.record.push(logs);
            console.log("语音记事暂存，路径为", item.note.record[length].url);
            that.data.playback = JSON.parse(JSON.stringify(item.note.record));
            that.data.playback.forEach(ele => { ele["opacity"] = 1; });
            that.setData({ playback: that.data.playback });
            //真的不明白这个opacity属性是怎么从别的值溜进来的
            item.note.record.forEach(ele => { delete ele["opacity"] });
            canIRecord = true;
            //截停呼吸效果动画
            that.breathingEffection("stop");
            wx.vibrateLong();
            wx.showModal({
              title: "语音记事",
              content: "每条语音记事最长为两分钟",
              showCancel: false,
              complete(res) {
                if (item.note.record.length >= 5) {
                  that.animation = wx.createAnimation({ duration: 1000 });
                  that.animation.opacity(0).step();
                  that.setData({ breathingEffection: that.animation.export() });
                  wx.showToast({
                    title: "语音记事已满",
                    image: "../images/warning.png",
                    mask: true
                  });
                  setTimeout(() => {
                    that.setData({ recordAccess: false });
                  }, 1000);
                }
              }
            });
          });
        }, 120000);
      }, 200);
    }
  },
  //停止语音记事
  stopRecord(res) {
    var that = this;
    clearTimeout(startRecord);
    if (!canIRecord) {
      clearTimeout(recordTimer);
      recorderManager.stop();
      recorderManager.onStop((res) => {
        console.log("用户成功进行语音记事");
        var length = item.note.record.length;
        var logs = {
          record_index: length, url: res.tempFilePath,
          duration: new Date().getTime() - that.recordDuration
        };
        item.note.record.push(logs);
        console.log("语音记事暂存，路径为", item.note.record[length].url);
        that.data.playback = JSON.parse(JSON.stringify(item.note.record));
        console.log(that.data.playback, item.note.record);
        that.data.playback.forEach(ele => { ele["opacity"] = 1; });
        console.log(that.data.playback, item.note.record);
        that.setData({ playback: that.data.playback });
        canIRecord = true;
        //截停呼吸效果动画
        that.breathingEffection("stop");
        if (item.note.record.length >= 5) {
          that.animation = wx.createAnimation({ duration: 1000 });
          that.animation.opacity(0).step();
          that.setData({ breathingEffection: that.animation.export() });
          wx.vibrateLong();
          wx.showToast({
            title: "语音记事已满",
            image: "../images/warning.png",
            mask: true
          });
          setTimeout(() => {
            that.setData({ recordAccess: false });
          }, 1000);
        } else wx.vibrateShort();
      })
    } else {
      wx.showModal({
        title: "语音记事",
        content: "长按开始录音，松手完成录音",
        showCancel: false
      });
    }
  },
  //语音记事的返听与删除
  playback_delete(res) {
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
    var that = this;
    var index = res.currentTarget.id.match(/\d+/g)[0];
    if (res.type === "tap") {
      console.log(this.data.playback[index]);
      innerAudioContext.autoplay = true;
      innerAudioContext.src = this.data.playback[index].url;
      var duration = this.data.playback[index].duration;
      if (!duration || duration > 12000) duration = 500;
      var flag = true;
      var timeStamp = new Date().getTime();
      if (!this.timerQueue) that.timerQueue = [];
      for (let i = this.timerQueue.length - 1; i > 0; i--) clearTimeout(this.timerQueue[i]);
      this.data.playback.forEach((ele, id, origin) => {
        if (ele.opacity !== 1) ele.opacity = 1;
      });
      this.setData({ playback: that.data.playback });
      (function breathingEffection() {
        if (that.data.playback[index].opacity < 0.3) flag = false;
        if (that.data.playback[index].opacity > 1) flag = true;
        if (flag) {
          that.data.playback[index].opacity -= 0.025;
          that.setData({ playback: that.data.playback });
        } else {
          that.data.playback[index].opacity += 0.025;
          that.setData({ playback: that.data.playback });
        }
        var timeout = setTimeout(() => {
          if (new Date().getTime() - timeStamp < duration - 35) {
            breathingEffection();
          } else {
            console.log("breathingEffection 误差: "
              + Math.abs(new Date().getTime() - timeStamp - duration));
            that.data.playback[index].opacity = 1;
            that.setData({ playback: that.data.playback });
          }
        }, 35);
        that.timerQueue.push(timeout);
      })()
    } else if (res.type === "longpress") {
      wx.showModal({
        title: "语音记事",
        content: "警告：删除操作将无法撤回，仍然删除本语音？",
        success(res) {
          if (res.confirm) {
            //相应语音的移除函数
            function deleteRecord() {
              that.data.playback[index].opacity -= 0.1;
              that.setData({ playback: that.data.playback });
              setTimeout(() => {
                if (that.data.playback[index].opacity <= 0) {
                  wx.hideLoading();
                  item.note.record.splice(index, 1);
                  if (item.note.record.length > 0) {
                    item.note.record.forEach((ele, id, origin) => { ele.record_index = id; });
                    that.setData({ playback: item.note.record });
                  } else {
                    that.setData({
                      playback: [],
                      playbackAccess: false
                    });
                  }
                  wx.showToast({
                    title: "删除成功！",
                    image: "../images/success.png",
                    mask: true
                  });
                } else deleteRecord();
              }, 50)
            }
            wx.showLoading({
              title: "正在删除本语音",
              mask: true
            });
            if (/store/g.test(item.note.record[index].url)) {
              wx.removeSavedFile({
                filePath: item.note.record[index].url,
                complete(res) {
                  deleteRecord();
                  var note = wx.getStorageSync("note");
                  note[item.id] = item;
                  wx.setStorageSync("note", note);
                }
              });
            } else deleteRecord();
          }
        }
      });
    }
  },
  //当前页API：呼吸效果启动与截停
  breathingEffection(tag) {
    if (tag === "start") {
      console.log("动画：循环创建并实例化按钮的呼吸动画效果");
      var animation = wx.createAnimation({ duration: 1000 });
      animation.backgroundColor("#FF0000").step();
      this.setData({ breathingEffection: animation.export() });
      var that = this;
      timerA = setTimeout(() => {
        animation.backgroundColor("#F5F5DC").step();
        that.setData({ breathingEffection: animation.export() });
      }, 1000);
      timerB = setTimeout(() => {
        this.breathingEffection("start");
      }, 2000)
    } else if (tag === "stop") {
      clearTimeout(timerA);
      clearTimeout(timerB);
      var animation = wx.createAnimation({ duration: 0 });
      animation.backgroundColor("#F5F5DC").step();
      this.setData({ breathingEffection: animation.export() });
      console.log("动画：按钮呼吸状态成功截停");
    }
  },

  /* 图片记事 */
  //图片记事的创建及查看功能权限的开启与关闭
  getPhotoFn(res) {
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    var that = this;
    function selectImage(length) {
      wx.chooseImage({
        count: length,
        sourceType: ["album"],
        success(res) {
          res.tempFiles.forEach((ele, index, origin) => {
            var logs = { photo_index: item.note.photo.length, url: ele.path };
            item.note.photo.push(logs);
          });
          that.data.img = JSON.parse(JSON.stringify(item.note.photo));
          that.data.img.forEach(ele => { ele["opacity"] = 1; });
          that.setData({
            img: that.data.img,
            photoPreviewAccess: true
          });
        },
      });
    }
    if (getCameraAccess) {
      if (!item.note.photo.length) {
        wx.showActionSheet({
          itemList: ["拍照", "从手机相册获取图片"],
          success(res) {
            if (!res.tapIndex) {
              that.setData({
                mainFnDisplay: false,
                cameraFnDisplay: true,
                ifPhoto: true,
                camSet: "back",
                flash: "off",
                flashSet: "../images/notflash.png",
                qualitySet: "Normal",
                cameraSet: "../images/photo.png",
                changeMode: "../images/shoot.png"
              });
            } else selectImage(3 - item.note.photo.length);
          }
        });
      } else if (item.note.photo.length < 3) {
        if (!this.data.photoPreviewAccess) {
          wx.showActionSheet({
            itemList: ["拍照", "从手机相册获取图片", "预览图片"],
            success(res) {
              if (res.tapIndex === 0) {
                that.setData({
                  mainFnDisplay: false,
                  cameraFnDisplay: true,
                  ifPhoto: true,
                  camSet: "back",
                  flash: "off",
                  flashSet: "../images/notflash.png",
                  qualitySet: "Normal",
                  cameraSet: "../images/photo.png",
                  preview: that.data.img[that.data.img.length - 1].url
                });
                if (!item.note.video) {
                  that.setData({ changeMode: "../images/shoot.png" });
                } else that.setData({ changeMode: "../images/null.png" });
              } else if (res.tapIndex === 1) {
                selectImage(3 - item.note.photo.length);
              } else {
                if (!that.data.img === item.note.photo) {
                  that.setData({ img: item.note.photo });
                };
                that.setData({ photoPreviewAccess: true });
              }
            }
          });
        } else this.setData({ photoPreviewAccess: false });
      } else {
        if (!this.data.img === item.note.photo) {
          this.setData({ img: item.note.photo });
        }
        this.data.photoPreviewAccess ?
          this.setData({ photoPreviewAccess: false }) :
          this.setData({ photoPreviewAccess: true });
      }
    } else {
      if (item.note.photo.length === 0) {
        wx.showModal({
          title: "图片记事",
          content: "无相机权限，只能从手机相册获取图片",
          success(res) {
            if (res.confirm) {
              selectImage(3);
            }
          }
        });
      } else if (item.note.photo.length < 3) {
        if (!this.data.photoPreviewAccess) {
          wx.showToast({
            title: "无相机权限",
            image: "../images/warning.png"
          });
          wx.showActionSheet({
            itemList: ["从手机相册获取图片", "预览图片"],
            success(res) {
              if (res.tapIndex === 0) {
                selectImage(3 - item.note.photo.length);
              } else {
                if (!that.data.img === item.note.photo) {
                  that.setData({ img: item.note.photo });
                };
                that.setData({ photoPreview: true });
              }
            }
          });
        } else this.setData({ photoPreviewAccess: false });
      } else {
        if (!this.data.img === item.note.photo) {
          this.setData({ img: item.note.photo });
        }
        this.data.photoPreviewAccess ?
          this.setData({ photoPreviewAccess: false }) :
          this.setData({ photoPreviewAccess: true });
      }
    }
  },
  //图片记事全屏查看、保存到手机相册与删除
  check_deletePhoto(res) {
    var that = this;
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    var index = res.currentTarget.id.match(/\d+/g)[0];
    if (res.type === "tap") {
      this.setData({
        mainFnDisplay: false,
        photoDisplay: true,
        img: item.note.photo,
        imgCurrent: index
      });
    } else if (res.type === "longpress") {
      //相应照片的移除函数
      function deletePhoto() {
        function deletion() {
          that.data.img[index].opacity -= 0.025
          that.setData({ img: that.data.img });
          setTimeout(() => {
            if (that.data.img[index].opacity <= 0) {
              clearInterval(interval);
              wx.hideLoading();
              item.note.photo.splice(index, 1);
              if (item.note.photo.length > 0) {
                item.note.photo.forEach((ele, id, origin) => { ele.photo_index = id; });
              }
              that.setData({ img: item.note.photo });
              if (item.note.photo.length === 0) {
                that.setData({ photoPreviewAccess: false });
              }
              wx.showToast({
                title: "删除成功！",
                image: "../images/success.png",
                mask: true
              });
              that.hasSomethingDeleted = true;
            } else deletion();
          }, 12.5);
        }
        wx.showModal({
          title: "图片记事",
          content: "警告：删除操作将无法撤回，仍然删除本图片？",
          success(res) {
            if (res.confirm) {
              wx.showLoading({
                title: "正在删除本图片",
                mask: true
              });
              if (/store/g.test(item.note.photo[index].url)) {
                wx.removeSavedFile({
                  filePath: item.note.photo[index].url,
                  complete(res) {
                    deletion();
                    var note = wx.getStorageSync("note");
                    note[item.id] = item;
                    wx.setStorageSync("note", note);
                  }
                });
              } else deletion();
            }
          }
        });
      }
      if (getAlbumAccess) {
        wx.showActionSheet({
          itemList: ["保存图片到手机相册", "删除本张图片"],
          success(res) {
            if (!res.tapIndex) {
              wx.saveImageToPhotosAlbum({
                filePath: item.note.photo[index].url,
                success(res) {
                  wx.showToast({
                    title: "保存操作成功！",
                    image: "../images/success.png",
                    mask: true
                  });
                },
                fail(res) {
                  wx.showToast({
                    title: "保存操作失败！",
                    image: "../images/error.png",
                    mask: true
                  });
                }
              });
            } else deletePhoto();
          }
        });
      } else {
        wx.showModal({
          title: "图片记事",
          content: "是否删除本张图片",
          success(res) {
            if (res.confirm) deletePhoto();
          }
        });
      }
    }
  },
  //应用视口内照片全屏查看时的退出操作：返回进入此功能的界面
  photoFn(res) {
    this.setData({ photoDisplay: false });
    if (this.data.ifFromCamera) {
      this.setData({
        cameraFnDisplay: true,
        ifFromCamera: false
      });
    } else this.setData({ mainFnDisplay: true });
  },

  /* 视频记事 */
  //视频记事尚的创建及查看功能权限的开启
  getShootFn(res) {
    var that = this;
    for (let prop in this.data) {
      if (/Access/.test(prop) && this.data[prop]) this.setData({ [prop]: false });
    }
    function selectVideo() {
      wx.chooseVideo({
        sourceType: ["album"],
        camera: "back",
        success(res) {
          item.note.video = res.tempFilePath;
          wx.showModal({
            title: "视频记事",
            content: "是否即刻预览视频？",
            success(res) {
              if (res.confirm) {
                that.setData({
                  mainFnDisplay: false,
                  videoDisplay: true,
                  videoSrc: item.note.video
                });
              }
            }
          });
        }
      });
    }
    if (getCameraAccess) {
      if (!item.note.video) {
        wx.showActionSheet({
          itemList: ["录像", "从手机相册获取视频"],
          success(res) {
            if (!res.tapIndex) {
              that.setData({
                mainFnDisplay: false,
                cameraFnDisplay: true,
                ifPhoto: false,
                camSet: "back",
                cameraSet: "../images/shoot.png"
              });
              if (item.note.photo.length < 3) {
                that.setData({ changeMode: "../images/photo.png" });
              } else that.setData({ changeMode: "../images/null.png" });
            } else selectVideo();
          }
        });
      } else {
        this.setData({
          mainFnDisplay: false,
          videoDisplay: true,
          videoSrc: item.note.video
        });
      }
    } else {
      if (!!item.note.video) {
        wx.showModal({
          title: "视频记事",
          content: "无相机权限，只能查看已有视频记事",
          showCancel: false,
          success(res) {
            if (res.confirm) {
              this.setData({
                videoDisplay: true,
                videoSrc: item.note.video
              });
            }
          }
        });
      } else {
        wx.showModal({
          title: "视频记事",
          content: "无相机权限，只能从手机相册获取视频",
          success(res) {
            if (res.confirm) selectVideo();
          }
        });
      }
    }
  },
  //视频记事查看功能的退出、保存到手机相册与删除
  videoPreview(res) {
    var that = this;
    wx.showActionSheet({
      itemList: ["退出预览", "保存视频到手机相册", "删除视频"],
      success(res) {
        if (!res.tapIndex) {
          that.setData({
            mainFnDisplay: true,
            videoDisplay: false,
            videoSrc: ""
          });
        } else if (res.tapIndex === 1) {
          const videoControl = wx.createVideoContext(that.data.videoSrc);
          videoControl.pause();
          wx.saveVideoToPhotosAlbum({
            filePath: that.data.videoSrc,
            success(res) {
              wx.showToast({
                title: "保存操作成功！",
                image: "../images/succes.png",
                mask: true
              });
            },
            fail(res) {
              wx.showToast({
                title: "保存操作失败！",
                image: "../images/error.png",
                mask: true
              });
            }
          });
        } else {
          wx.showModal({
            title: "视频记事",
            content: "警告：删除操作将不可撤回，仍然删除本视频？",
            success(res) {
              if (res.confirm) {
                function deleteVideo() {
                  item.note.video = "";
                  that.setData({
                    mainFnDisplay: true,
                    videoDisplay: false,
                    videoSrc: ""
                  });
                  wx.showToast({
                    title: "删除成功",
                    image: "../images/success.png",
                    mask: true
                  });
                }
                if (/store/g.test(item.note.video)) {
                  wx.removeSavedFile({
                    filePath: item.note.video,
                    complete(res) {
                      deleteVideo();
                      var note = wx.getStorageSync("note");
                      note[item.id] = item;
                      wx.setStorageSync("note", note);
                    }
                  });
                } else deleteVideo();
              }
            }
          })
        }
      }
    });
  },

  /* 保存和取消记事区 */
  //记事保存与取消
  save_cancel(res) {
    console.log("用户试图保存或取消当前记事");
    console.log("保存前的记事存储状态：",
      "\n记事标题：", item.note.title,
      "\n记事文本：", item.note.text,
      "\n语音记事：", item.note.record,
      "\n图片记事：", item.note.photo,
      "\n视频记事：", item.note.video);
    var that = this;
    //操作记事保存与取消时关闭已开启的所有记事的权限以免误操作
    for (let prop in this.data) {
      if (/Access/.test(prop) && this.data[prop]) this.setData({ [prop]: false });
    }
    if (this.data.save_cancel === "保存记事") {
      wx.showModal({
        title: "写记事",
        content: "是否保存当前记事？",
        success(res) {
          if (res.confirm) {
            wx.showLoading({
              title: "正在保存记事！",
              mask: true
            });
            var tag = 0;
            if (item.note.record.length > 0) {
              item.note.record.forEach((ele, index, origin) => {
                if (/tmp/g.test(ele.url)) {
                  console.log("开始保存第" + (index + 1) + "条语音");
                  wx.saveFile({
                    tempFilePath: ele.url,
                    success(res) {
                      ele.url = res.savedFilePath;
                      console.log("第" + (index + 1) + "条语音保存成功");
                    },
                    fail(res) {
                      wx.showToast({
                        title: "语音" + (index + 1) + "保存失败",
                        image: "../images/error.png"
                      });
                    },
                    complete(res) { if (index === item.note.record.length - 1) tag += 1; }
                  });
                } else if (index === item.note.record.length - 1) tag += 1;
              });
            } else tag += 1;
            if (item.note.photo.length > 0) {
              item.note.photo.forEach((ele, index, origin) => {
                if (/tmp/g.test(ele.url)) {
                  console.log("开始保存第" + (index + 1) + "张图片");
                  wx.saveFile({
                    tempFilePath: ele.url,
                    success(res) {
                      ele.url = res.savedFilePath;
                      console.log("第" + (index + 1) + "张图片保存成功");
                    },
                    fail(res) {
                      wx.showToast({
                        title: "图片" + (index + 1) + "保存失败",
                        image: "../images/error.png"
                      });
                    },
                    complete(res) { if (index === item.note.photo.length - 1) tag += 1; }
                  });
                } else if (index === item.note.photo.length - 1) tag += 1;
              });
            } else tag += 1;
            if (item.note.video.length > 0 && /tmp/g.test(item.note.video)) {
              console.log("开始保存视频");
              wx.saveFile({
                tempFilePath: item.note.video,
                success(res) {
                  item.note.video = res.savedFilePath;
                  console.log("视频保存成功");
                },
                fail(res) {
                  wx.showToast({
                    title: "视频保存失败！",
                    image: "../images/error.png"
                  });
                },
                complete(res) { tag += 1; }
              })
            } else tag += 1;
            (function save_jump() {
              if (tag < 3) {
                setTimeout(() => {
                  console.log("API wx.saveFile() 调用未完成,");
                  save_jump();
                }, 10);
              } else {
                wx.hideLoading();
                var note = wx.getStorageSync("note");
                note[item.id] = item;
                wx.setStorageSync("note", note);
                console.log("成功保存当前记事并合并到总目录！");
                wx.showToast({
                  title: "记事保存成功！",
                  image: "../images/success.png",
                  mask: true,
                  success(res) {
                    setTimeout(() => {
                      wx.showLoading({
                        title: "正在进入读记事",
                        mask: true,
                      });
                      wx.redirectTo({ url: "../ShowNote/ShowNote" });
                    }, 1500);
                  }
                });
              }
            })()
          } else {
            wx.showModal({
              title: "写记事",
              content: "是否继续当前记事？",
              success(res) {
                if (res.cancel) {
                  if (wx.getStorageSync("note").length > 0) {
                    wx.showLoading({
                      title: "正在进入读记事",
                      mask: true,
                    });
                    wx.redirectTo({ url: "../ShowNote/ShowNote" });
                  } else {
                    wx.showLoading({
                      title: "正在返回启动页",
                      mask: true,
                    });
                    wx.redirectTo({ url: "../Home/Home" });
                  }
                }
              }
            })
          }
        }
      });
    } else {
      wx.showModal({
        title: "写记事",
        content: "是否取消当前记事？",
        success(res) {
          if (res.confirm) {
            if (wx.getStorageSync("note").length > 0) {
              wx.showLoading({
                title: "正在进入读记事",
                mask: true,
              });
              wx.redirectTo({ url: "../ShowNote/ShowNote" });
            } else {
              wx.showLoading({
                title: "正在返回启动页",
                mask: true,
              });
              wx.redirectTo({ url: "../Home/Home" });
            }
          }
        }
      })
    }
  },

  /* 相机组件 */
  //退出相机组件
  goback(res) {
    this.setData({
      cameraFnDisplay: false,
      mainFnDisplay: true
    });
  },
  //摄像头前后置设定
  camSet(res) {
    var that = this;
    if (this.data.camSet === "front") {
      this.setData({ camSet: "back" });
      if (that.data.flash === "on") {
        this.setData({ flashSet: "../images/flash.png" });
      } else this.setData({ flashSet: "../images/notflash.png" });
    } else this.setData({
      camSet: "front",
      flashSet: "../images/null.png"
    });
    that.setData({ camSign: 0 });
    setTimeout(() => {
      that.setData({ camSign: 1 });
    }, 500);
  },
  //闪光灯设定
  flashSet(res) {
    if (this.data.camSet === "back") {
      if (this.data.flash === "off") {
        this.setData({
          flash: "on",
          flashSet: "../images/flash.png"
        });
        wx.showToast({
          title: "闪光灯开启",
          icon: "none"
        });
      } else {
        this.setData({
          flash: "off",
          flashSet: "../images/notflash.png"
        });
        wx.showToast({
          title: "闪光灯关闭",
          icon: "none"
        });
      }
    }
  },
  //照片预览
  preview(res) {
    if (item.note.photo.length > 0) {
      this.setData({
        cameraFnDisplay: false,
        photoDisplay: true,
        ifFromCamera: true,
        img: item.note.photo,
        current: item.note.photo.length - 1
      });
    } else {
      wx.showToast({
        title: "图片记事为空",
        image: "../images/warning.png"
      });
    }
  },
  //主按钮设定：拍照、开始录像、停止录像
  cameraSet(res) {
    const camera = wx.createCameraContext();
    var that = this;
    //出错警告函数：重大故障，相机组件崩溃！
    function failure() {
      wx.showToast({
        title: "相机组件崩溃！",
        image: "../images/error.png",
        mask: true,
        complete(res) {
          if (that.data.shootNow) {
            clearTimeout(shootTimer);
            clearInterval(interval);
            clearTimeout(timerA);
            clearTimeout(timerB);
            if (that.data.shootSign === 1) that.setData({ shootSign: 0 });
            that.setData({ shootNow: false });
            camera.stopRecord();
          }
          setTimeout(() => {
            that.setData({
              cameraFnDisplay: false,
              mainFnDisplay: true
            });
          }, 1500);
        }
      });
    }
    if (this.data.cameraSet === "../images/photo.png") { //拍照模式
      var quality = this.data.qualitySet.toLowerCase();
      camera.takePhoto({
        quality: quality,
        success(res) {
          var logs = {
            photo_index: item.note.photo.length,
            url: res.tempImagePath
          };
          item.note.photo.push(logs);
          that.data.img = JSON.parse(JSON.stringify(item.note.photo));
          that.data.img.forEach(ele => { ele["opacity"] = 1; });
          that.setData({
            preview: logs.url,
            img: that.data.img
          });
          wx.showToast({
            title: "第" + that.data.img.length + "张图片记事",
            icon: "none",
            duration: 500,
            success(res) {
              that.setData({
                cameraFnDisplay: false,
                photoDisplay: true,
                ifFromCamera: true
              });
              setTimeout(() => {
                that.setData({
                  cameraFnDisplay: true,
                  photoDisplay: false,
                  ifFromCamera: false
                });
                if (!item.note.video && that.data.img.length >= 3) {
                  wx.showModal({
                    title: "图片记事",
                    content: "图片记事已满，仍然可以以录像方式进行视频记事，是否进入录像模式？",
                    success(res) {
                      if (res.confirm) {
                        that.setData({
                          cameraSet: "../images/shoot.png",
                          changeMode: "../images/null.png",
                          ifPhoto: false
                        });
                      } else {
                        that.setData({
                          cameraFnDisplay: false,
                          mainFnDisplay: true
                        });
                      }
                    }
                  });
                } else if (that.data.img.length >= 3) {
                  that.setData({
                    cameraFnDisplay: false,
                    mainFnDisplay: true
                  });
                }
              }, 1000);
            }
          });
        },
        fail(res) {
          failure();
        }
      });
    } else if (this.data.cameraSet === "../images/shoot.png") { //录像模式
      function stopShoot() {
        camera.stopRecord({
          success(res) {
            clearTimeout(shootTimer);
            clearInterval(interval);
            clearTimeout(timerA);
            clearTimeout(timerB);
            if (that.data.shootSign === 1) that.setData({ shootSign: 0 });
            item.note.video = res.tempVideoPath;
            wx.showToast({
              title: "视频记事成功！",
              image: "../images/success.png",
              mask: true,
              success(res) {
                wx.vibrateLong();
                that.setData({ shootNow: false });
                setTimeout(() => {
                  that.setData({
                    cameraFnDisplay: false,
                    videoDisplay: true,
                    videoSrc: item.note.video
                  });
                }, 1500);
              }
            })
          },
          fail(res) {
            if (that.data.shootNow) {
              that.setData({ shootNow: false });
              camera.stopRecord();
            }
            failure();
          }
        });
      }
      if (!that.data.shootNow) {
        camera.startRecord({
          success(res) {
            that.setData({
              shootNow: true,
              shootSign: 1
            });
            timerA = setTimeout(() => {
              that.setData({ shootSign: 0 });
            }, 500);
            interval = setInterval(() => {
              that.setData({ shootSign: 1 });
              timerB = setTimeout(() => {
                that.setData({ shootSign: 0 });
              }, 500);
            }, 1000);
            wx.vibrateShort();
            shootTimer = setTimeout(() => {
              stopShoot();
              wx.showToast({
                title: "录像限时两分钟",
                images: "../images/warning.png",
                mask: false
              });
            }, 120000);
          },
          fail(res) { failure(); }
        });
      } else stopShoot();
    }
  },
  //更换设想模式：拍照、录像
  changeMode(res) {
    if (this.data.changeMode === "../images/shoot.png") {
      this.setData({
        cameraSet: "../images/shoot.png",
        changeMode: "../images/photo.png",
        ifPhoto: false
      });
    } else if (this.data.changeMode === "../images/photo.png") {
      this.setData({
        cameraSet: "../images/photo.png",
        changeMode: "../images/shoot.png",
        ifPhoto: true
      });
    }
  },
  //照片拍摄质量设定
  qualitySet(res) {
    if (this.data.qualitySet === "Normal") {
      this.setData({ qualitySet: "High" });
    } else if (this.data.qualitySet === "High") {
      this.setData({ qualitySet: "Low" });
    } else this.setData({ qualitySet: "Normal" });
  }

});