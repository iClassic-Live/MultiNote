// CreateNote/CreateNote/CreateNote.js

/* 写记事页面初始化 */

//用于监测变换图片的滑动操作起始的标识
var lockA = true;
var lockB = true;
var current = wx.getStorageSync("bgiCurrent");

//用于监测是否已开启相关权限的标识初始化
var getRecordAccess = true; //录音权限的标识，默认权限开启
var getCameraAccess = true; //相机权限的标识，默认权限开启
var getAlbumAccess = true; //存图到相册权限的标识，默认权限开启

//跨域传值载体初始化
var toShowNoteCargo; //向读记事页发送数据的载体
var fromShowNoteCargo; //接收读记事页发送的数据的载体

//记事保存初始化
var scanning; //用于监测当前是否可以保存记事和相关记事是否超出限定数目的定时器标识

//语音记事初始化
const recorderManager = wx.getRecorderManager(); //获取全局唯一的录音管理器 recorderManager
const innerAudioContext = wx.createInnerAudioContext(); //创建并返回内部audio上下文 innerAudioContext 对象
var interval, timerA, timerB; //承接呼吸效果方法定时器和计时器的标识
var canIRecord = true; //用于监测当前是否正在进行语音记事的标识
var recordTimer; //使语音记事结束的定时器
var startRecord; //启动语音记事的定时器，防止因点击语音按钮导致出错

var shootTimer;

/* 页面构造器：页面功能初始化 */
Page({

  /* 页面默认功能 */

  /* 页面的初始数据 */
  data: {

    current: getApp().globalData.current,
    duration: 0,
    bgiQueue: getApp().globalData.bgiQueue,

    //主功能区、相机组件、视频记事预览组件、图片记事预览组件切换功能初始化，默认主功能区启动，其他功能区待命
    mainFnDisplay: true,
    cameraFnDisplay: false,
    videoDisplay: false,
    photoDisplay: false,

    //主功能区功能初始化
    upperMaskHeight: 0, //上部蒙层高度
    bottomMaskHeight: 0, //下部蒙层高度

    //记事标题功能初始化
    titleDefault: "记事标题", //标题文本为空时的字样，默认为记事标题

    //文本记事功能初始化
    textDefault: "记事文本", //记事文本为空时的字样，默认为记事文本
    ifFontSet: false,
    font: [["超小号", "小号", "默认", "大号", "超大号"], ["轻盈", "默认", "粗壮"], ["默认", "中国红", "罗兰紫", "深空蓝", "森林绿", "巧克力棕"]],
    fontIndex: [2, 1, 0],
    fontSize: "100%",
    fontWeight: "normal",
    fontColor: "#000",

    //语音记事功能初始化
    recordAccess: false, //语音记事权限，默认false，权限关闭
    playbackAccess: false, //语音记事返听权限，默认false，权限关闭
    playback: [], //语音记事播放缓存

    //图片记事功能初始化
    photoPreviewAccess: false, //图片记事预览权限，默认false，权限关闭
    img: [], //图片记事预览缓存

    //记事保存功能初始化
    save_cancel: "取消记事", //保存/取消按钮的字样

    flash: "off",
    flashSet: "../images/notflash.png",
    shootSign: 0,
    cameraSet: "../images/photo.png",
    changeMode: "../images/shoot.png",
    shootNow: false,
    qualitySet: "Normal"

  },

  /* 生命周期函数--监听页面加载 */
  onLoad: function (options) {
    console.log("CreateNote onLoad");
    this.setData({
      screenWidth: wx.getSystemInfoSync().screenWidth,
      current: wx.getStorageSync("bgiCurrent") || 0
    });
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
            complete(e) {
              if (!res.authSetting["scope.camera"]) scopeCamera();
            }
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
            complete(e) {
              if (!res.authSetting["scope.writePhotosAlbum"]) scopeAlbum();
            }
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
        wx.showModal({
          title: "写记事",
          content: "无法检测相关权限获取情况！",
          showCancel: false,
          complete(res) {
            if (!!wx.getStorageSync("note")) {
              wx.redirectTo({ url: "../ShowNote/ShowNote" });
            } else wx.redirectTo({ url: "../Home/Home" });
          }
        });
      }
    });
    //监测当前是修改记事还是新建记事，并相应地为接下来的记事存储做准备
    if (wx.getStorageSync("editNote")) {
      toShowNoteCargo = wx.getStorageSync("editNote");
      console.log("用户开始修改记事", toShowNoteCargo);
      this.setData({
        title: toShowNoteCargo.note.title,
        text: toShowNoteCargo.note.text,
        playback: toShowNoteCargo.note.record,
        img: toShowNoteCargo.note.photo,
        fontSize: toShowNoteCargo.style.fontSize,
        fontWeight: toShowNoteCargo.style.fontWeight,
        fontColor: toShowNoteCargo.style.fontColor,
        fontIndex: toShowNoteCargo.info.fontIndex
      });
      console.log("fontIndex" ,this.data.fontIndex);
      console.log("各项记事存储情况如下",
        "\n记事标题：" + this.data.title,
        "\n记事文本：" + this.data.title,
        "\n语音记事：" + toShowNoteCargo.note.record,
        "\n图片记事：" + toShowNoteCargo.note.photo,
        "\n视频记事：" + toShowNoteCargo.note.video);
    } else {
      console.log("用户开始新建记事");
      //初始化向写记事页发送数据的载体
      toShowNoteCargo = {
        note: {
          title: "",
          text: "",
          record: [],
          photo: [],
          video: ""
        },
        style: {
          opacity: 1,
          fontSize: "100%",
          fontWeight: "normal",
          fontColor: "#000"
        },
        info: { fontIndex: [2, 1, 0] }
      }
      console.log("toShowNoteCargo初始化情况", toShowNoteCargo);
    }
    //定时器扫描监测当前是否可以保存记事和相关记事的数目是否超出限定
    scanning = setInterval(() => {
      //监测当前是否可以保存记事
      var title = toShowNoteCargo.note.title;
      var text = toShowNoteCargo.note.text.trim();
      var record = toShowNoteCargo.note.record;
      var photo = toShowNoteCargo.note.photo;
      var video = toShowNoteCargo.note.video;
      if (!!title) { //只有在已写标题的情况下才可以保存记事，否则不允许保存
        if (((!text && record.length === 0) && photo.length === 0) && !video) { //当有任意一种记事时可以保存记事，否则不允许保存
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
      toShowNoteCargo.note.record.length > 5 ?
        toShowNoteCargo.note.record.splice(6, toShowNoteCargo.note.record.length - 5) : "";
      toShowNoteCargo.note.photo.length > 3 ?
        toShowNoteCargo.note.photo.splice(4, toShowNoteCargo.note.photo.length - 3) : "";
    }, 10);
  },

  /* 生命周期函数--监听页面显示 */
  onShow: function (res) {
    console.log("CreateNote onShow");
    this.setData({ duration: 500 });
  },

  /* 生命周期函数--监听页面初次渲染完成 */
  onReady: function (res) {
    console.log("CreateNote onReady");
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

  /* 变换背景图 */
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

  /* 记事标题 */
  //记事标题的创建
  titleContent(res) {
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
    if (res.type === "input") {
      if (res.detail.value.length <= 30) {
        if (/\s/g.test(res.detail.value.split("")[0])) {
          this.setData({ title: toShowNoteCargo.note.title });
          wx.showToast({
            title: "首字符不能为空",
            image: "../images/warning.png"
          });
        } else toShowNoteCargo.note.title = res.detail.value;
      } else {
        this.setData({ title: res.detail.value.split("").slice(0, 30).join("") });
        wx.showToast({
          title: "标题最长三十字",
          image: "../images/warning.png"
        });
      }
    }
  },

  /* 文本记事 */
  //文本记事的创建
  textContent(res) {
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
    if (res.type === "input") {
      toShowNoteCargo.note.text = res.detail.value;
    } else if (res.type === "blur") {
      if (res.detail.value.split("").length > 0 && !res.detail.value.trim()) {
        toShowNoteCargo.note.text = "";
        this.setData({ text: "" });
        wx.showToast({
          title: "不能全输入空格",
          image: "../images/warning.png"
        });
      }
    }
  },
  getFontSet(res) {
    console.log("getFontSet");
    this.setData({ ifFontSet: true });
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
  },
  changeFont(res) {
    if (res.detail.column === 0) {
      var fontSize;
      if (res.detail.value === 0) fontSize = "50%";
      if (res.detail.value === 1) fontSize = "75%";
      if (res.detail.value === 2) fontSize = "100%";
      if (res.detail.value === 3) fontSize = "150%";
      if (res.detail.value === 4) fontSize = "200%";
      this.setData({ fontSize: fontSize });
      toShowNoteCargo.style.fontSize = fontSize;
    }else if (res.detail.column === 1) {
      var fontWeight;
      if (res.detail.value === 0) fontWeight = "lighter";
      if (res.detail.value === 1) fontWeight = "normal";
      if (res.detail.value === 2) fontWeight = "bolder";
      this.setData({ fontWeight: fontWeight });
      toShowNoteCargo.style.fontWeight = fontWeight;
    }else if (res.detail.column === 2) {
      var fontColor;
      if (res.detail.value === 0) fontColor = "#000";
      if (res.detail.value === 1) fontColor = "#F00";
      if (res.detail.value === 2) fontColor = "#8A2BE2";
      if (res.detail.value === 3) fontColor = "#00BFFF";
      if (res.detail.value === 4) fontColor = "#228B22";
      if (res.detail.value === 5) fontColor = "#D2691E";
      this.setData({ fontColor: fontColor });
      toShowNoteCargo.style.fontColor = fontColor;
    }
    var fontIndex = this.data.fontIndex;
    fontIndex[res.detail.column] = res.detail.value;
    this.setData({ fontIndex: fontIndex });
    toShowNoteCargo.info.fontIndex = fontIndex;
  },

  /* 语音记事 */
  //语音记事与返听功能权限的开启与关闭
  getRecordFn(res) {
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
    if (getRecordAccess) {
      if (toShowNoteCargo.note.record.length === 0) {
        this.data.recordAccess ?
          this.setData({ recordAccess: false }) :
          this.setData({ recordAccess: true });
      } else if (toShowNoteCargo.note.record.length < 5) {
        var that = this;
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
              if (res.tapIndex === 0) {
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
      if (toShowNoteCargo.note.record.length > 0) {
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
          duration: 1200000,
          sampleRate: 44100,
          numberOfChannels: 2,
          encodeBitRate: 192000,
          format: "aac",
          frameSize: 50
        });
        recorderManager.onStart((res) => {
          canIRecord = false;
          //创建呼吸效果动画
          console.log("动画：创建并实例化按钮的呼吸动画效果");
          that.animation = wx.createAnimation({ duration: 1000 });
          that.animation.backgroundColor("#FF0000").step();
          that.setData({ breathingEffection: that.animation.export() });
          timerA = setTimeout(function () {
            that.animation.backgroundColor("#F5F5DC").step();
            that.setData({ breathingEffection: that.animation.export() });
          }, 1000);
          interval = setInterval(function () {
            that.animation.backgroundColor("#FF0000").step();
            that.setData({ breathingEffection: that.animation.export() });
            timerB = setTimeout(function () {
              that.animation.backgroundColor("#F5F5DC").step();
              that.setData({ breathingEffection: that.animation.export() });
            }, 1000);
          }, 2000);
          console.log("动画：按钮呼吸效果创建成功");
          wx.showToast({
            title: "第" + (toShowNoteCargo.note.record.length + 1) + "条语音记事",
            icon: "none"
          });
        });
        recordTimer = setTimeout(() => {
          recorderManager.stop();
          recorderManager.onStop((res) => {
            console.log("用户成功进行语音记事");
            var length = toShowNoteCargo.note.record.length;
            var logs = { record_index: length, url: res.tempFilePath, opacity: 1 };
            toShowNoteCargo.note.record.push(logs);
            canIRecord = true;
            console.log("语音记事暂存，路径为", toShowNoteCargo.note.record[length].url);
            that.setData({ playback: toShowNoteCargo.note.record });
            //截停呼吸效果动画
            clearInterval(interval);
            clearTimeout(timerA);
            clearTimeout(timerB);
            that.animation = wx.createAnimation({ duration: 0 });
            that.animation.backgroundColor("#F5F5DC").step();
            that.setData({ breathingEffection: that.animation.export() });
            console.log("动画：按钮呼吸状态成功截停");
            wx.showModal({
              title: "语音记事",
              content: "每条语音记事最长为两分钟",
              showCancel: false
            });
            if (toShowNoteCargo.note.record.length >= 5) {
              that.animation = wx.createAnimation({ duration: 1000 });
              that.animation.backgroundColor("#FF0000").step();
              that.setData({ breathingEffection: that.animation.export() });
              wx.showToast({
                title: "语音记事已满",
                image: "../images/warning.png",
                mask: true
              });
              wx.vibrateLong();
              setTimeout(() => {
                that.setData({ recordAccess: false });
              }, 1000);
            } else {
              wx.vibrateShort();
            }
          });
        }, 12000);
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
        var length = toShowNoteCargo.note.record.length;
        var logs = { record_index: length, url: res.tempFilePath, opacity: 1 };
        toShowNoteCargo.note.record.push(logs);
        canIRecord = true;
        console.log("语音记事暂存，路径为", toShowNoteCargo.note.record[length].url);
        that.setData({ playback: toShowNoteCargo.note.record });
        //截停呼吸效果动画
        clearInterval(interval);
        clearTimeout(timerA);
        clearTimeout(timerB);
        that.animation = wx.createAnimation({ duration: 0 });
        that.animation.backgroundColor("#F5F5DC").step();
        that.setData({ breathingEffection: that.animation.export() });
        console.log("动画：按钮呼吸状态成功截停");
        if (toShowNoteCargo.note.record.length >= 5) {
          that.animation = wx.createAnimation({ duration: 1000 });
          that.animation.opacity(0).step();
          that.setData({ breathingEffection: that.animation.export() });
          wx.showToast({
            title: "语音记事已满",
            image: "../images/warning.png",
            mask: true
          });
          wx.vibrateLong();
          setTimeout(() => {
            that.setData({ recordAccess: false });
          }, 1000);
        } else {
          wx.vibrateShort();
        }
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
    var index = res.currentTarget.id;
    index = index.split("")[index.split("").length - 1];
    if (res.type === "tap") {
      innerAudioContext.autoplay = true;
      innerAudioContext.src = toShowNoteCargo.note.record[index].url;
      that.data.playback[index].opacity = 0.5
      that.setData({ playback: that.data.playback });
      setTimeout(() => {
        that.data.playback[index].opacity = 1
        that.setData({ playback: that.data.playback });
        setTimeout(() => {
          that.data.playback[index].opacity = 0.5
          that.setData({ playback: that.data.playback });
          setTimeout(() => {
            that.data.playback[index].opacity = 1
            that.setData({ playback: that.data.playback });
          }, 250);
        }, 250);
      }, 250);
    } else if (res.type === "longpress") {
      wx.showModal({
        title: "语音记事",
        content: "是否删除本条语音",
        success(res) {
          if (res.confirm) {
            toShowNoteCargo.note.record.splice(index, 1);
            if (toShowNoteCargo.note.record.length > 0) {
              toShowNoteCargo.note.record.forEach((ele, index, origin) => {
                if (ele.record_index !== "rec_" + index) {
                  ele.record_index = "rec_" + index;
                }
              });
            }
            wx.showToast({
              title: "删除成功！",
              image: "../images/success.png",
              mask: true
            });
            interval = setInterval(() => {
              that.data.playback[index].opacity -= 0.1
              that.setData({ playback: that.data.playback });
            }, 50);
            setTimeout(() => {
              clearInterval(interval);
              that.setData({ playback: toShowNoteCargo.note.record });
              if (toShowNoteCargo.note.record.length === 0) {
                that.setData({
                  playback: [],
                  playbackAccess: false
                });
              }
            }, 500);
          }
        }
      });
    }
  },

  /* 图片记事 */
  //图片记事的创建及查看功能权限的开启与关闭
  getPhotoFn(res) {
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    var that = this;
    if (getCameraAccess) {
      if (toShowNoteCargo.note.photo.length === 0) {
        wx.showActionSheet({
          itemList: ["拍照", "从手机相册获取图片"],
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
                changeMode: "../images/shoot.png"
              });
            } else {
              wx.chooseImage({
                count: 3 - toShowNoteCargo.note.photo.length,
                sourceType: ["album"],
                success: function (res) {
                  var logs;
                  res.tempFiles.forEach((ele, index, origin) => {
                    logs = { photo_index: index, url: ele.path, opacity: 1 };
                    toShowNoteCargo.note.photo.push(logs);
                    that.data.img.push(logs);
                    that.setData({ img: that.data.img });
                  });
                  that.setData({ photoPreviewAccess: true });
                },
              });
            }
          }
        });
      } else if (toShowNoteCargo.note.photo.length < 3) {
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
                if (!toShowNoteCargo.note.video) {
                  that.setData({ changeMode: "../images/shoot.png" });
                } else that.setData({ changeMode: "../images/null.png" });
              } else if (res.tapIndex === 1) {
                wx.chooseImage({
                  count: 3 - toShowNoteCargo.note.photo.length,
                  sourceType: ["album"],
                  success: function (res) {
                    var logs;
                    res.tempFiles.forEach((ele, index, origin) => {
                      logs = { photo_index: index, url: ele.path, opacity: 1 };
                      toShowNoteCargo.note.photo.push(logs);
                      that.data.img.push(logs);
                      that.setData({ img: that.data.img });
                    });
                    that.setData({ photoPreviewAccess: true });
                  },
                });
              } else {
                if (!that.data.img === toShowNoteCargo.note.photo) {
                  that.setData({ img: toShowNoteCargo.note.photo });
                };
                that.setData({ photoPreviewAccess: true });
              }
            }
          });
        } else this.setData({ photoPreviewAccess: false });
      } else {
        if (!this.data.img === toShowNoteCargo.note.photo) {
          this.setData({ img: toShowNoteCargo.note.photo });
        }
        this.data.photoPreviewAccess ?
          this.setData({ photoPreviewAccess: false }) :
          this.setData({ photoPreviewAccess: true });
      }
    } else {
      if (toShowNoteCargo.note.photo.length === 0) {
        wx.showModal({
          title: "图片记事",
          content: "无相机权限，只能从手机相册获取图片",
          success(res) {
            if (res.confirm) {
              wx.chooseImage({
                count: 3,
                sourceType: ["album"],
                success: function (res) {
                  var logs;
                  res.tempFiles.forEach((ele, index, origin) => {
                    logs = { photo_index: index, url: ele.path, opacity: 1 };
                    toShowNoteCargo.note.photo.push(logs);
                    that.data.img.push(logs);
                    that.setData({ img: that.data.img });
                  });
                  that.setData({ photoPreviewAccess: true });
                },
              });
            }
          }
        });
      } else if (toShowNoteCargo.note.photo.length < 3) {
        if (!this.data.photoPreviewAccess) {
          wx.showToast({
            title: "无相机权限",
            image: "../images/warning.png"
          });
          wx.showActionSheet({
            itemList: ["从手机相册获取图片", "预览图片"],
            success(res) {
              if (res.tapIndex === 0) {
                wx.chooseImage({
                  count: 3 - toShowNoteCargo.note.photo.length,
                  sourceType: ["album"],
                  success: function (res) {
                    var logs;
                    res.tempFiles.forEach((ele, index, origin) => {
                      logs = { photo_index: index, url: ele.path, opacity: 1 };
                      toShowNoteCargo.note.photo.push(logs);
                      that.data.img.push(logs);
                      that.setData({ img: that.data.img });
                    });
                    that.setData({ photoPreviewAccess: true });
                  },
                });
              } else {
                if (!that.data.img === toShowNoteCargo.note.photo) {
                  that.setData({ img: toShowNoteCargo.note.photo });
                };
                that.setData({ photoPreview: true });
              }
            }
          });
        } else this.setData({ photoPreviewAccess: false });
      } else {
        if (!this.data.img === toShowNoteCargo.note.photo) {
          this.setData({ img: toShowNoteCargo.note.photo });
        }
        this.data.photoPreviewAccess ?
          this.setData({ photoPreviewAccess: false }) :
          this.setData({ photoPreviewAccess: true });
      }
    }
  },
  //图片记事全屏查看、保存到手机相册与删除
  check_deletePhoto(res) {
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    var index = res.currentTarget.id;
    index = index.split("")[index.split("").length - 1];
    if (res.type === "tap") {
      this.setData({
        mainFnDisplay: false,
        photoDisplay: true,
        img: toShowNoteCargo.note.photo,
        current: index
      });
    } else if (res.type === "longpress") {
      var that = this;
      function deletePhoto() {
        toShowNoteCargo.note.photo.splice(index, 1);
        if (toShowNoteCargo.note.photo.length > 0) {
          toShowNoteCargo.note.photo.forEach((ele, index, origin) => {
            if (ele.photo_index !== "photo_" + index) {
              ele.photo_index = "photo_" + index;
            }
          });
        }
        wx.showToast({
          title: "删除成功！",
          image: "../images/success.png",
          mask: true
        });
        interval = setInterval(() => {
          that.data.img[index].opacity -= 0.1
          that.setData({ img: that.data.img });
        }, 50);
        setTimeout(() => {
          clearInterval(interval);
          that.setData({ img: toShowNoteCargo.note.photo });
          if (toShowNoteCargo.note.photo.length === 0) that.setData({ photoPreviewAccess: false });
        }, 500);
      }
      if (getAlbumAccess) {
        wx.showActionSheet({
          itemList: ["保存图片到手机相册", "删除本张图片"],
          success(res) {
            if (res.tapIndex === 0) {
              wx.saveImageToPhotosAlbum({
                filePath: toShowNoteCargo.note.photo[index].url,
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
            } else {
              deletePhoto();
            }
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
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
    var that = this;
    if (getCameraAccess) {
      if (!toShowNoteCargo.note.video) {
        wx.showActionSheet({
          itemList: ["录像", "从手机相册获取视频"],
          success(res) {
            if (res.tapIndex === 0) {
              that.setData({
                mainFnDisplay: false,
                cameraFnDisplay: true,
                ifPhoto: false,
                camSet: "back",
                cameraSet: "../images/shoot.png"
              });
              if (toShowNoteCargo.note.photo.length < 3) {
                that.setData({ changeMode: "../images/photo.png" });
              } else that.setData({ changeMode: "../images/null.png" });
            } else {
              wx.chooseVideo({
                sourceType: ["album"],
                camera: "back",
                success(res) {
                  toShowNoteCargo.note.video = res.tempFilePath;
                }
              });
            }
          }
        });
      } else {
        this.setData({
          mainFnDisplay: false,
          videoDisplay: true,
          videoSrc: toShowNoteCargo.note.video
        });
      }
    } else {
      if (!!toShowNoteCargo.note.video) {
        wx.showModal({
          title: "视频记事",
          content: "无相机权限，只能查看已有视频记事",
          showCancel: false,
          success(res) {
            if (res.confirm) {
              this.setData({
                videoDisplay: true,
                videoSrc: toShowNoteCargo.note.video
              });
            }
          }
        });
      } else {
        wx.showModal({
          title: "视频记事",
          content: "无相机权限，只能从手机相册获取视频",
          success(res) {
            if (res.confirm) {
              wx.chooseVideo({
                sourceType: ["album"],
                success(res) {
                  toShowNoteCargo.note.video = res.tempFilePath;
                }
              });
            }
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
        const videoControl = wx.createVideoContext(that.data.videoSrc);
        if (res.tapIndex === 0) {
          videoControl.pause();
          that.setData({
            mainFnDisplay: true,
            videoDisplay: false,
            videoSrc: ""
          });
        } else if (res.tapIndex === 1) {
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
          videoControl.pause();
          toShowNoteCargo.note.video = null;
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
      }
    });
  },

  /* 保存和取消记事区 */
  //记事保存与取消
  save_cancel(res) {
    console.log("用户试图保存或取消当前记事");
    console.log("toShowNoteCargo的记事存储状态", toShowNoteCargo);
    //操作记事保存与取消时关闭已开启的所有记事的全新以免误操作
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
    if (this.data.save_cancel === "保存记事") { //记事可以被保存时的操作
      console.log("用户试图保存当前记事");
      wx.showModal({
        title: "保存记事",
        content: "是否保存当前记事？",
        success(res) {
          if (res.confirm) {
            console.log("MultiNote开始保存当前记事");
            //为当前记事创建同步缓存并跳转到读记事页
            if (!wx.getStorageSync("editNote")) {
              wx.setStorageSync("newNote", toShowNoteCargo);
            } else {
              console.log("toShowNoteCargo", toShowNoteCargo);
              wx.setStorageSync("editNote", toShowNoteCargo);
              console.log("需要修改的记事", wx.getStorageSync("editNote"));
            }
            if (!!wx.getStorageSync("newNote") || !!wx.getStorageSync("editNote")) {
              console.log("用户记事保存成功");
              console.log("toShowNoteCargo的记事存储状态", toShowNoteCargo);
              wx.showToast({
                title: "记事保存成功！",
                image: "../images/success.png",
                mask: true
              });
              setTimeout(() => {
                wx.redirectTo({
                  url: "../ShowNote/ShowNote",
                });
              }, 1000);
            } else {
              console.log("用户保存记事失败，重大故障：全局崩溃!");
              wx.showToast({
                title: "记事保存出错!",
                image: "../images/error.png",
                mask: true
              });
            }
          } else {
            console.log("用户试图继续当前记事");
            wx.showModal({
              title: "保存记事",
              content: "是否继续当前记事？",
              success(res) {
                if (res.cancel) {
                  if (!!wx.getSystemInfoSync("note")) {
                    wx.redirectTo({ url: "../ShowNote/ShowNote" });
                  } else wx.redirectTo({ url: "../Home/Home" });
                }
              }
            });
          }
        }
      });
    } else { //记事不能被保存时的操作
      if (wx.getStorageSync("note").length === 0) {
        wx.showModal({
          title: "写记事",
          content: "缓存中没有任何记事，仍然取消记事?",
          success(res) {
            if (res.confirm) wx.redirectTo({ url: "../Home/Home" });
          }
        });
      } else {
        var that = this;
        wx.showModal({
          title: "取消记事",
          content: "是否取消当前记事？",
          success(res) {
            if (res.confirm) wx.redirectTo({ url: "../ShowNote/ShowNote" });
          }
        });
      }
    }
  },

  /* 相机组件 */
  goback(res) {
    this.setData({
      cameraFnDisplay: false,
      mainFnDisplay: true
    });
  },
  camSet(res) {
    if (this.data.camSet === "front") {
      this.setData({ camSet: "back" });
      if (this.data.flash === "on") {
        this.setData({ flashSet: "../images/flash.png" });
      } else this.setData({ flashSet: "../images/notflash.png" });
    } else {
      this.setData({
        camSet: "front",
        flashSet: "../images/null.png"
      });
    }
    this.setData({ camSign: 0 });
    setTimeout(() => {
      this.setData({ camSign: 1 });
    }, 500);
  },
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
  preview(res) {
    if (toShowNoteCargo.note.photo.length > 0) {
      this.setData({
        cameraFnDisplay: false,
        photoDisplay: true,
        ifFromCamera: true,
        img: toShowNoteCargo.note.photo,
        current: toShowNoteCargo.note.photo.length - 1
      });
    } else {
      wx.showToast({
        title: "图片记事为空",
        image: "../images/warning.png"
      });
    }
  },
  cameraSet(res) {
    const camera = wx.createCameraContext();
    var that, cameraSet;
    that = this;
    cameraSet = this.data.cameraSet;
    function failure() {
      wx.showToast({
        title: "相机组件崩溃！",
        image: "../images/error.png",
        mask: true,
        success(res) {
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
    if (cameraSet === "../images/photo.png") {
      var quality = this.data.qualitySet;
      if (quality === "Normal") {
        quality = "normal";
      }else if (quality === "High") {
        quality = "high";
      }else if (quality === "Low") {
        quality = "Low";
      }
      camera.takePhoto({
        quality: quality,
        success(res) {
          var logs = {
            photo_index: toShowNoteCargo.note.photo.length,
            url: res.tempImagePath, opacity: 1
          };
          toShowNoteCargo.note.photo.push(logs);
          that.setData({
            preview: logs.url,
            img: toShowNoteCargo.note.photo
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
                if (!toShowNoteCargo.note.video && that.data.img.length >= 3) {
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
                }
              }, 1000);
            }
          });
        },
        fail(res) {
          failure();
        }
      });
    }else if (cameraSet === "../images/shoot.png") {
      function stopShoot () {
        camera.stopRecord({
          success(res) {
            clearTimeout(shootTimer);
            clearInterval(interval);
            clearTimeout(timerA);
            clearTimeout(timerB);
            if (that.data.shootSign === 1) that.setData({ shootSign: 0 });
            toShowNoteCargo.note.video = res.tempVideoPath;
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
                    videoSrc: toShowNoteCargo.note.video
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
              wx.showToast({
                title: "录像限时两分钟",
                images: "../images/warning.png",
                mask: false,
                success(res) {
                  stopShoot();
                }
              });
            }, 120000);
          },
          fail(res) {
            failure();
          }
        });
      }else stopShoot();
    }
  },
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
  qualitySet(res) {
    if (this.data.qualitySet === "Normal") {
      this.setData({ qualitySet: "High" });
    } else if (this.data.qualitySet === "High") {
      this.setData({ qualitySet: "Low" });
    } else this.setData({ qualitySet: "Normal" });
  }

});