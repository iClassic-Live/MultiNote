// CreateNote/CreateNote/CreateNote.js

//记事撰写页面初始化

//创建用于监测是否已开启相机权限的标识
var getRecordAccess = true;
var getCameraAccess = true;

//跨域传值载体初始化
var toShowNoteCargo; //创建向读记事页发送数据的载体
var fromShowNoteCargo; //创建接收读记事页发送的数据的载体

//语音记事区与拍摄记事公用动画组件
var interval, timerA, timerB; //创建承接呼吸效果方法定时器和计时器的标识

//语音记事初始化
const recorderManager = wx.getRecorderManager(); //获取全局唯一的录音管理器 recorderManager
const innerAudioContext = wx.createInnerAudioContext(); //创建并返回内部audio上下文 innerAudioContext对象
var canIRecord = true; //创建用于监测当前是否正在进行语音记事的标识
var recordTimer; //使语音记事结束的定时器

//相机组件初始化
var tapTime; //监测相机按钮按下时长的标识
var lock = true; //录像记事创建状态的监测标识，若未在创建则为false，否则为true
var shootTimer; //使录像记事结束的计时器
var cameraUse; //扫描视口高度并实时改变camera元素高度的定时器

//用于监测是否可以保存记事或正在进行某种记事的定时器的标识
var canISave;





Page({
  /* 页面的初始数据 */
  data: {
    height: null,

    //主功能区、拍摄记事相机组件、录像记事预览组件切换功能初始化，默认主功能区启动，其他功能区待命
    mainFnDisplay: true,
    cameraFnDisplay: false,
    videoPreviewFnDisplay: false,

    //相机组件功能初始化
    cameraSetting: null,
    Quality: ["高清画质", "普通画质", "低清画质"],
    Flash: ["强制闪光", "自动闪光", "关闭闪光"],
    Cam: ["后置摄像", "前置摄像"],
    quality: null,
    cam: null,
    flash: null,
    cameraSet: null,
    indicatotr: null,

    //录像记事预览组件功能初始化
    videoSrc: null, //视频播放地址，默认为空;

    //主功能区功能初始化
    upperMaskHeight: 0, //上部蒙层高度
    bottomMaskHeight: 0, //下部蒙层高度

    titleDefault: "记事标题", //标题文本为空时的字样，默认为记事标题

    textDefault: "记事文本", //记事文本为空时的字样，默认为记事文本
    isDisabled: false, //由于textarea层级优先度过高，当其他记事功能正在使用时要使其失效

    recordAccess: false, //语音记事权限，默认false，权限关闭
    breathingEffection: null, //录音按钮的呼吸效果，默认无效果
    playbackAccess: false, //语音记事返听权限，默认false，权限关闭
    playback: null,

    photoPreviewAccess: false,
    img: null,

    save_cancel: "取消记事", //保存/取消按钮的字样
  },

  /* 生命周期函数--监听页面加载 */
  onLoad: function (options) {
    console.log("CreateNote onLoad");
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: "scope.record",
            fail(res) {
              getRecordAccess = false;
              wx.showModal({
                title: "写记事",
                content: "获取录音权限失败",
                showCancel: false
              });
            }
          });
        } else {
          getRecordAccess = true;
        }
        if (!res.authSetting['scope.camera']) {
          wx.authorize({
            scope: "scope.camera",
            fail(res) {
              getCameraAccess = false
              wx.showModal({
                title: "写记事",
                content: "获取相机权限失败",
                showCancel: false
              });
            }
          });
        } else {
          getCameraAccess = true
        }
      }
    });
    if (wx.getStorageSync("editNote")) {
      toShowNoteCargo = wx.getStorageSync("editNote");
      wx.removeStorageSync("editNote");
      console.log("用户开始修改记事", toShowNoteCargo);
      this.setData({
        title: toShowNoteCargo.note.title,
        text: toShowNoteCargo.note.text,
        playback: toShowNoteCargo.note.record,
        img: toShowNoteCargo.note.photo
      });
      console.log("各项记事存储情况如下",
        "\n记事标题：" + this.data.title,
        "\n记事文本：" + this.data.title,
        "\n语音记事：" + toShowNoteCargo.note.recordPath,
        "\n拍照记事: " + toShowNoteCargo.note.photo,
        "\n录像记事：" + toShowNoteCargo.note.video);
    } else {
      console.log("用户开始新建记事");
      //初始化向写记事页发送数据的载体
      toShowNoteCargo = {
        id: wx.getStorageSync("note").length,
        info: {
          noteType: null,
          timeStamp: null,
          marginTop: wx.getStorageSync("note").length * 9,
          opacity: 1,
          pullOutdelete: -18,
          pullOutMenu: -40
        },
        note: {
          title: null,
          text: null,
          record: [],
          photo: [],
          video: null
        }
      }
      console.log("toShowNoteCargo初始化情况", toShowNoteCargo);
    }
  },

  /* 生命周期函数--监听页面初次渲染完成 */
  onReady: function (res) {
    console.log("CreateNote onReady");
  },

  /* 生命周期函数--监听页面显示 */
  onShow: function (res) {
    console.log("CreateNote onShow");
    canISave = setInterval(() => {
      var title = toShowNoteCargo.note.title;
      var text = toShowNoteCargo.note.text;
      var record = toShowNoteCargo.note.record;
      var photo = toShowNoteCargo.note.photo;
      var video = toShowNoteCargo.note.video;
      if (!!title) {
        if (((!text && record.length === 0) && photo.length === 0) && !video) {
          this.data.save_cancel === "取消记事" ? "" : this.setData({ save_cancel: "取消记事" });
        } else {
          this.data.save_cancel === "保存记事" ? "" : this.setData({ save_cancel: "保存记事" })
        }
      } else {
        this.data.save_cancel === "取消记事" ? "" : this.setData({ save_cancel: "取消记事" });
      };
      if (this.data.recordAccess || this.data.playbackAccess) {
        this.data.photoPreviewAccess ? this.setData({ photoPreviewAccess: false }) : "";
      } else if (this.data.photoPreviewAccess) {
        this.data.recordAccess ? this.setData({ recordAccess: false }) : "";
        this.data.playbackAccess ? this.setData({ playbackAccess: false }) : "";
      };
      if (toShowNoteCargo.note.record.length > 5) {
        toShowNoteCargo.note.record.splice(6, toShowNoteCargo.note.record.length - 5);
      }
      if (toShowNoteCargo.note.photo.length > 3) {
        toShowNoteCargo.note.photo.splice(4, toShowNoteCargo.note.photo.length - 3);
      }
    }, 10);
  },

  /* 生命周期函数--监听页面隐藏 */
  onHide: function (res) {
    console.log("CreateNote onHide");
  },

  /* 生命周期函数--监听页面卸载 */
  onUnload: function (res) {
    console.log("CreateNote onUnload");
    clearInterval(canISave);
    toShowNoteCargo = null;
  },

  /* 页面相关事件处理函数--监听用户下拉动作 */
  onPullDownRefresh: function (res) {
    console.log("CreateNote onPullDownRefresh");
  },

  /* 页面上拉触底事件的处理函数 */
  onReachBottom: function (res) {
    console.log("CreateNote onReachBottom");
  },

  /* 用户点击右上角分享 */
  onShareAppMessage: function (res) {
    console.log("CreateNote onShareAppMessage");
  },

  /* 自定义用户交互逻辑处理: 写记事  */

  /* 记事标题 */
  titleContent(res) {
    this.data.recordAccess ? this.setData({ recordAccess: false }) : "";
    this.data.playbackAccess ? this.setData({ playbackAccess: false }) : "";
    this.data.photoPreviewAccess ? this.setData({ photoPreviewAccess: false }) : "";
    res.type === "input" ? toShowNoteCargo.note.title = res.detail.value : ""
  },

  /* 文本记事 */
  textContent(res) {
    this.data.recordAccess ? this.setData({ recordAccess: false }) : "";
    this.data.playbackAccess ? this.setData({ playbackAccess: false }) : "";
    this.data.photoPreviewAccess ? this.setData({ photoPreviewAccess: false }) : "";
    res.type === "input" ? toShowNoteCargo.note.text = res.detail.value : "";
  },

  /* 语音记事 */
  getRecordFn(res) {
    if (getRecordAccess) {
      if (res.type === "tap") {
        if (toShowNoteCargo.note.record.length < 5) {
          if (!this.data.playbackAccess) {
            this.data.recordAccess ?
              this.setData({ recordAccess: false }) :
              this.setData({ recordAccess: true });
          } else {
            this.setData({
              playbackAccess: false,
              recordAccess: true
            });
          }
        } else {
          wx.showModal({
            title: "语音记事",
            content: "语音记事条目已达上限",
            showCancel: false
          });
        }
      } else if (res.type === "longpress") {
        if (toShowNoteCargo.note.record.length !== 0) {
          if (!this.data.recordAccess) {
            this.data.playbackAccess ?
              this.setData({ playbackAccess: false }) :
              this.setData({ playbackAccess: true });
          } else {
            this.setData({
              recordAccess: false,
              playbackAccess: true
            });
          }
        } else {
          wx.showToast({
            title: "没有语音记事",
            image: "../images/warning.png",
            mask: true
          });
          this.data.recordAccess ? this.setData({ recordAccess: false }) : "";
        }
      }
    } else {
      wx.showModal({
        title: "语音记事",
        content: "无录音权限，无法进行语音记事",
        showCancel: false
      });
    }
  },
  startRecord(res) {
    var that = this;
    if (canIRecord && toShowNoteCargo.note.record.length < 5) {
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
          })
          if (toShowNoteCargo.note.record.length >= 5) {
            that.animation = wx.createAnimation({ duration: 1000 });
            that.animation.opacity(0).step();
            that.setData({ breathingEffection: that.animation.export() });
            wx.vibrateLong();
            setTimeout(() => {
              that.setData({ recordAccess: false });
              wx.showModal({
                title: "语音记事",
                content: "温馨提醒：语音记事条目已达上限",
                showCancel: false
              });
            }, 1000)
          } else {
            wx.vibrateShort();
          }
        });
      }, 12000);
    } else if (!canIRecord && toShowNoteCargo.note.record.length < 5) {
      //截停呼吸效果动画
      clearInterval(interval);
      clearTimeout(timerA);
      clearTimeout(timerB);
      that.animation = wx.createAnimation({ duration: 0 });
      that.animation.backgroundColor("#F5F5DC").step();
      that.setData({ breathingEffection: that.animation.export() });
      console.log("动画：按钮呼吸状态成功截停");
      wx.vibrateLong();
      wx.showToast({
        title: "语音记事出错!",
        image: "../images/error.png",
        mask: true
      });
    }
  },
  stopRecord(res) {
    var that = this;
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
          wx.vibrateLong();
          setTimeout(() => {
            that.setData({ recordAccess: false });
            wx.showModal({
              title: "语音记事",
              content: "温馨提醒：语音记事条目已达上限",
              showCancel: false
            });
          }, 1000)
        } else {
          wx.vibrateShort();
        }
      })
    } else if (toShowNoteCargo.note.record.length < 5) {
      //截停呼吸效果动画
      clearInterval(interval);
      clearTimeout(timerA);
      clearTimeout(timerB);
      that.animation = wx.createAnimation({ duration: 0 });
      that.animation.backgroundColor("#C0C0C0").step();
      that.setData({ breathingEffection: that.animation.export() });
      console.log("动画：按钮呼吸状态成功截停");
      wx.vibrateLong();
      wx.showToast({
        title: "语音记事出错!",
        image: "../images/error.png",
        mask: true
      });
    }
  },
  playback_delete(res) {
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
                  playback: null,
                  playbackAccess: false
                });
              }
            }, 500);
          }
        }
      });
    }
  },

  /* 拍照记事 */
  getCameraFn(res) {
    var that = this;
    if (getCameraAccess) {
      if (res.type === "tap") {
        if (toShowNoteCargo.note.photo.length < 3) {
          that.setData({
            mainFnDisplay: false,
            cameraFnDisplay: true,
            cameraSetting: [1, 1, 0],
            quality: "normal",
            flash: "auto",
            cam: "back",
            cameraSet: "拍\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0照",
            ifPhoto: true,
            indicator: "indicatorA"
          });
          cameraUse = setInterval(() => {
            var res = wx.getSystemInfoSync();
            var height = res.windowHeight * 750 / res.screenWidth;
            this.data.height !== height ? this.setData({ height: height }) : "";
          }, 50);
        } else {
          wx.showModal({
            title: "拍照记事",
            content: "拍照记事条目已达上限",
            showCancel: false
          })
        }
      } else if (res.type === "longpress") {
        if (toShowNoteCargo.note.photo.length !== 0) {
          this.setData({ img: toShowNoteCargo.note.photo });
          this.data.photoPreviewAccess ?
            this.setData({ photoPreviewAccess: false }) :
            this.setData({ photoPreviewAccess: true });
        } else {
          wx.showToast({
            title: "没有拍照记事",
            image: "../images/warning.png",
            mask: true
          });
        }
      }
    } else {
      wx.showModal({
        title: "拍照记事",
        content: "无相机权限，无法进行拍照记事",
        showCancel: false
      });
    }
  },
  check_deletePhoto(res) {
    var index = res.currentTarget.id;
    index = index.split("")[index.split("").length - 1];
    if (res.type === "tap") {
      wx.previewImage({
        urls: [toShowNoteCargo.note.photo[index].url],
      });
    } else if (res.type === "longpress") {
      var that = this;
      wx.showModal({
        title: "拍照记事吧",
        content: "是否删除本张照片",
        success(res) {
          if (res.confirm) {
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
              toShowNoteCargo.note.photo.length === 0 ?
                that.setData({ photoPreviewAccess: false }) : "";
            }, 500);
          }
        }
      });
    }
  },

  /* 录像记事 */
  getShootFn(res) {
    var that = this;
    this.data.recordAccess ? this.setData({ recordAccess: false }) : "";
    this.data.playbackAccess ? this.setData({ playbackAccess: false }) : "";
    this.data.photoPreviewAccess ? this.setData({ photoPreviewAccess: false }) : "";
    if (getCameraAccess) {
      if (!toShowNoteCargo.note.video) {
        this.setData({
          mainFnDisplay: false,
          cameraFnDisplay: true,
          cameraSetting: [0],
          cam: "back",
          cameraSet: "录\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0像",
          indicator: "indicatorB"
        });
        cameraUse = setInterval(() => {
          var res = wx.getSystemInfoSync();
          var height = res.windowHeight * 750 / res.screenWidth;
          this.data.height !== height ? this.setData({ height: height }) : "";
        }, 50);
      } else {
        this.setData({
          mainFnDisplay: false,
          videoPreviewFnDisplay: true,
          videoSrc: toShowNoteCargo.note.video
        });
      }
    } else {
      wx.showModal({
        title: "录像记事",
        content: "无相机权限，无法进行录像记事",
        showCancel: false
      });
    }
  },

  /* 保存和取消记事区 */
  save_cancel(res) {
    console.log("用户试图保存或取消当前记事");
    console.log("toShowNoteCargo的记事存储状态", toShowNoteCargo);
    //保存记事点击事件：保存当前记事数据并向显示页发送当前记事数据
    if (this.data.save_cancel === "保存记事") {
      console.log("用户试图保存当前记事");
      wx.showModal({
        title: "保存记事",
        content: "是否保存当前记事？",
        success(res) {
          if (res.confirm) {
            console.log("MultiNote开始保存当前记事");
            //为当前记事创建同步缓存并跳转到记事显示页
            var ifSaveSuccessfully = false;
            if (toShowNoteCargo.info.noteType !== "edit") {
              toShowNoteCargo.info.noteType = "new";
              toShowNoteCargo.info.timeStamp = new Date().getTime();
              wx.setStorageSync("newNote", toShowNoteCargo);
              ifSaveSuccessfully = !!wx.getStorageSync("newNote");
              console.log("MultiNote为当前记事创建时间戳并记录当前记事记录状态");
              console.log("当前记事的时间戳为 " + toShowNoteCargo.timeStamp);
              console.log("当前记事的记录状态为 " + toShowNoteCargo.info.noteType);
            } else {
              console.log("toShowNoteCargo", toShowNoteCargo);
              wx.setStorageSync("editNote", toShowNoteCargo);
              console.log("需要修改的记事", wx.getStorageSync("editNote"));
              ifSaveSuccessfully = !!wx.getStorageSync("editNote");
              console.log("MultiNote记录当前记事记录状态，记录状态为 " +
                toShowNoteCargo.info.noteType);
            }
            if (ifSaveSuccessfully) {
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
            console.log("用户试图继续进行当前记事");
            wx.showModal({
              title: "保存记事",
              content: "是否继续当前记事？",
              success(res) {
                if (res.cancel) {
                  wx.redirectTo({
                    url: "../ShowNote/ShowNote",
                  });
                  toShowNoteCargo = null;
                }
              }
            });
          }
        }
      });
    } else {
      if (wx.getStorageSync("note").length === 0) {
        wx.showModal({
          title: "写记事",
          content: "当前没有任何记事，是否继续写记事?",
          success(res) {
            if (res.cancel) {
              wx.showModal({
                title: "写记事",
                content: "MultiNote将返回启动页",
                showCancel: true
              });
              setTimeout(() => {
                wx.redirectTo({
                  url: "../Home/Home",
                });
              }, 2000);
            }
          }
        });
      } else {
        var that = this;
        wx.showModal({
          title: "取消记事",
          content: "是否取消当前记事？",
          success(res) {
            res.confirm ? wx.redirectTo({
              url: "../ShowNote/ShowNote",
            }) : "";
          }
        });
      }
    }
  },

  /* 组件区 */
  /* 相机组件 */
  cameraSetting(res) {
    var cameraSetting = res.detail.value;
    if (this.data.ifPhoto) {
      if (cameraSetting[0] === 0) {
        this.setData({ quality: "high" });
      } else if (cameraSetting[0] === 1) {
        this.setData({ quality: "normal" });
      } else if (cameraSetting[0] === 2) {
        this.setData({ quality: "low" });
      }
      if (cameraSetting[1] === 0) {
        this.setData({ flash: "on" });
      } else if (cameraSetting[1] === 1) {
        this.setData({ flash: "auto" });
      } else if (cameraSetting[1] === 2) {
        this.setData({ flash: "off" });
      }
      if (cameraSetting[2] === 0) {
        this.setData({ cam: "back" });
      } else if (cameraSetting[2] === 1) {
        this.setData({ cam: "front" });
      }
      console.log("拍照画质为" + this.data.quality,
        "闪光类型为" + this.data.flash,
        "摄像头选择" + this.data.cam);
    } else if (!this.data.ifPhoto) {
      if (cameraSetting[0] === 0) {
        this.setData({ cam: "back" });
      } else if (cameraSetting[0] === 1) {
        this.setData({ cam: "front" });
      }
    }
  },
  tapStart(res) {
    tapTime = new Date().getTime();
  },
  tapEnd(res) {
    tapTime = new Date().getTime() - tapTime;
  },
  cameraSet(res) {
    var that = this;
    const camera = wx.createCameraContext(); //创建并返回camera上下文cameraContect对象
    function shutDown() { //事件内自建API：关闭相机组件并启动主功能
      that.data.ifPhoto ? "" : wx.vibrateLong();
      that.setData({
        mainFnDisplay: true,
        cameraFnDisplay: false,
        cameraSetting: null,
        quality: null,
        flash: null,
        cam: null,
        cameraSet: null,
        ifPhoto: null,
        indicator: null
      });
      clearInterval(cameraUse);
    };
    function throwError() { //事件内自建API：抛出故障消息并清空当前记事下的拍照记事
      wx.showToast({
        title: "相机组件故障！",
        image: "../images/error.png",
        mask: true
      });
      if (!this.data.ifPhoto) {
        //截停呼吸效果动画
        clearInterval(interval);
        clearTimeout(timerA);
        clearTimeout(timerB);
        that.animation = wx.createAnimation({ duration: 0 });
        that.animation.backgroundColor("#C0C0C0").step();
        that.setData({ breathingEffection: that.animation.export() });
        console.log("动画：按钮呼吸状态成功截停");
        wx.vibrateLong();
      }
      shutDown();
    };
    function stopRecord() { //事件内自建API：停止录像记事并保存相应记事
      camera.stopRecord({
        success(res) {
          lock = true;
          toShowNoteCargo.note.video = res.tempVideoPath;
          //截停呼吸效果动画
          clearInterval(interval);
          clearTimeout(timerA);
          clearTimeout(timerB);
          that.animation = wx.createAnimation({ duration: 0 });
          that.animation.backgroundColor("#C0C0C0").step();
          that.setData({ breathingEffection: that.animation.export() });
          console.log("动画：按钮呼吸状态成功截停");
          wx.vibrateLong();
          wx.showToast({
            title: "录像记事成功！",
            image: "../images/success.png",
            mask: true
          });
          shutDown();
        },
        fail(res) {
          throwError();
        }
      });
    };
    if (tapTime <= 200) { //当按钮按下时长为200ms时，用户在进行拍照或录像操作
      if (this.data.ifPhoto) {
        camera.takePhoto({
          quality: that.data.quality,
          success(res) {
            var logs = {
              photo_index: toShowNoteCargo.note.photo.length,
              url: res.tempImagePath,
              opacity: 1
            }
            toShowNoteCargo.note.photo.push(logs);
            wx.previewImage({
              urls: [res.tempImagePath],
            });
            wx.vibrateShort();
            wx.showToast({
              title: "第" + toShowNoteCargo.note.photo.length + "条拍照记事",
              icon: "none"
            });
            that.data.photoPreviewAccess ? "" :
              that.setData({ photoPreviewAccess: true });
            that.data.img === toShowNoteCargo.note.photo ? "" :
              that.setData({ img: toShowNoteCargo.note.photo });
            if (toShowNoteCargo.note.photo.length === 3) {
              wx.showModal({
                title: "拍照记事",
                content: "当前拍照记事条目已达上限",
                showCancel: false,
                compvare(res) { shutDown(); }
              });
            }
          },
          fail(res) {
            throwError();
          }
        });
      } else if (!this.data.ifPhoto) {
        if (lock) {
          camera.startRecord({
            success(res) {
              lock = false;
              wx.vibrateShort();
              //创建呼吸效果动画
              console.log("动画：创建并实例化按钮的呼吸动画效果");
              that.animation = wx.createAnimation({ duration: 1000 })
              that.animation.backgroundColor("#FF0000").step();
              that.setData({ breathingEffection: that.animation.export() });
              timerA = setTimeout(function () {
                that.animation.backgroundColor("#C0C0C0").step();
                that.setData({ breathingEffection: that.animation.export() });
              }, 1000);
              interval = setInterval(function () {
                that.animation.backgroundColor("#FF0000").step();
                that.setData({ breathingEffection: that.animation.export() });
                timerB = setTimeout(function () {
                  that.animation.backgroundColor("#C0C0C0").step();
                  that.setData({ breathingEffection: that.animation.export() });
                }, 1000);
              }, 2000);
              console.log("动画：按钮呼吸效果创建成功");
              shootTimer = setTimeout(() => {
                stopRecord();
                wx.showModal({
                  title: "录像记事",
                  content: "录像记事最长为两分钟",
                  showCancel: false
                });
              }, 120000);
            },
            fail(res) { throwError(); }
          });
        } else if (!lock) {
          clearTimeout(shootTimer);
          stopRecord();
        }
      }
    } else if (tapTime > 200) {
      lock ? "" : stopRecord();
      shutDown();
    }
  },

  /* 录像预览组件 */
  videoPreview(res) {
    var that = this;
    wx.showActionSheet({
      itemList: ["退出预览", "删除录像"],
      success(res) {
        if (res.tapIndex === 0) {
          console.log("写记事开始退出录像记事预览组件");
          that.setData({
            mainFnDisplay: true,
            videoPreviewFnDisplay: false,
            videoSrc: null
          });
          console.log("写记事成功退出录像记事预览组件");
        } else {
          toShowNoteCargo.note.video = null;
          that.setData({
            mainFnDisplay: true,
            videoPreviewFnDisplay: false,
            videoSrc: null
          });
          wx.showToast({
            title: "删除成功",
            image: "../images/success.png",
            mask: true
          });
        }
      }
    });
  }

});