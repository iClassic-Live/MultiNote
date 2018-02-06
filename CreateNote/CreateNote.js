// CreateNote/CreateNote/CreateNote.js

//记事撰写页面初始化

//创建用于监测是否已开启相机权限的标识
var getRecordAccess = true;
var getCameraAccess = true;

//跨域传值载体初始化
var toShowNoteCargo; //创建向读记事页发送数据的载体
var fromShowNoteCargo; //创建接收读记事页发送的数据的载体

//保存操作初始化
var scanning; //用于监测当前是否可以保存记事和相关记事是否超出限定数目的定时器标识


//语音记事初始化
const recorderManager = wx.getRecorderManager(); //获取全局唯一的录音管理器 recorderManager
const innerAudioContext = wx.createInnerAudioContext(); //创建并返回内部audio上下文 innerAudioContext对象
var interval, timerA, timerB; //创建承接呼吸效果方法定时器和计时器的标识
var canIRecord = true; //创建用于监测当前是否正在进行语音记事的标识
var recordTimer; //使语音记事结束的定时器


Page({
  /* 页面的初始数据 */
  data: {
    height: null,

    //主功能区、拍摄记事相机组件、视频记事预览组件切换功能初始化，默认主功能区启动，其他功能区待命
    mainFnDisplay: true,
    videoDisplay: false,

    //视频记事预览组件功能初始化
    videoSrc: null, //视频播放地址，默认为空;

    //主功能区功能初始化
    upperMaskHeight: 0, //上部蒙层高度
    bottomMaskHeight: 0, //下部蒙层高度

    titleDefault: "记事标题", //标题文本为空时的字样，默认为记事标题

    textDefault: "记事文本", //记事文本为空时的字样，默认为记事文本

    recordAccess: false, //语音记事权限，默认false，权限关闭
    breathingEffection: null, //录音按钮的呼吸效果，默认无效果
    playbackAccess: false, //语音记事返听权限，默认false，权限关闭
    playback: [], //语音记事播放缓存

    photoPreviewAccess: false,
    img: [], //图片记事预览缓存

    save_cancel: "取消记事", //保存/取消按钮的字样
  },

  /* 生命周期函数--监听页面加载 */
  onLoad: function (options) {
    console.log("CreateNote onLoad");
    //监测当前是修改记事还是新建记事，并相应地为接下来的记事存储做准备
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
        "\n语音记事：" + toShowNoteCargo.note.record,
        "\n拍照记事: " + toShowNoteCargo.note.photo,
        "\n视频记事：" + toShowNoteCargo.note.video);
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
    //监测是否获取了设备的录音权限和相机权限
    wx.getSetting({
      success(res) {
        if (!res.authSetting["scope.record"]) {
          wx.authorize({
            scope: "scope.record",
            fail(res) {
              getRecordAccess = false;
              wx.showToast({
                title: "未获取录音权限",
                image: "../images/warning.png",
                mask: true
              });
            }
          });
        } else {
          getRecordAccess = true;
        }
        if (!res.authSetting["scope.camera"]) {
          wx.authorize({
            scope: "scope.camera",
            fail(res) {
              getCameraAccess = false
              wx.showToast({
                title: "未获取相机权限",
                image: "../images/warning.png",
                mask: true
              });
            }
          });
        } else {
          getCameraAccess = true
        }
      }
    });
    //定时器扫描监测当前是否可以保存记事和相关记事的数目是否超出限定
    scanning = setInterval(() => {
      //监测当前是否可以保存记事
      var title = toShowNoteCargo.note.title;
      var text = toShowNoteCargo.note.text;
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

  /* 生命周期函数--监听页面初次渲染完成 */
  onReady: function (res) {
    console.log("CreateNote onReady");
  },

  /* 生命周期函数--监听页面显示 */
  onShow: function (res) {
    console.log("CreateNote onShow");
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
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
    if (res.type === "input") toShowNoteCargo.note.title = res.detail.value;
  },

  /* 文本记事 */
  textContent(res) {
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
    if (res.type === "input") toShowNoteCargo.note.text = res.detail.value;
  },

  /* 语音记事 */
  getRecordFn(res) {
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
    if (getRecordAccess) {
      if (toShowNoteCargo.note.record.length === 0) {
        this.data.recordAccess ?
          this.setData({ recordAccess: false }) :
          this.setData({ recordAccess: true });
      }else if (toShowNoteCargo.note.length < 5) {
        if (res.type === "tap") {
          if (this.data.playbackAccess) this.setData({ playbackAccess: false });
          this.data.recordAccess ?
            this.setData({ recordAccess: false }) :
            this.setData({ recordAccess: true });
        }else if (res.type === "longpress") {
          if (this.data.recordAccess) this.setData({ recordAccess: false});
          this.data.playbackAccess ?
            this.setData({ playbackAccess: false }) :
            this.setData({ playbackAccess: true });
        }
      }else {
        this.data.playbackAccess ?
          this.setData({ playbackAccess: false }) :
          this.setData({ playbackAccess: true });
      }
    }else {
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
        }else this.setData({ playbackAccess: false });
      }else {
        wx.showToast({
          title: "无录音权限！",
          image: "../images.error.png",
          mask: true
        });
      }
    }
  },
  startRecord(res) {
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
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
                content: "温馨提醒：语音记事数目已达上限",
                showCancel: false
              });
            }, 1000);
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
              content: "温馨提醒：语音记事数目已达上限",
              showCancel: false
            });
          }, 1000);
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

  /* 图片记事 */
  //图片记事创建及查看
  getCameraFn(res) {
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    var that = this;
    if (getCameraAccess) {
      if (toShowNoteCargo.note.photo.length === 0) {
        wx.chooseImage({
          count: 3 - toShowNoteCargo.note.photo.length,
          sourceType: ["camera", "album"],
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
      } else if (toShowNoteCargo.note.photo.length < 3) {
        if (res.type === "tap") {
          wx.chooseImage({
            count: 3 - toShowNoteCargo.note.photo.length,
            sourceType: ["camera", "album"],
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
        } else if (res.type === "longpress") {
          this.data.photoPreviewAccess ? 
           this.setData({ photoPreviewAccess: false }) :
            this.setData({ photoPreviewAccess: true });
        }
      }else {
        this.data.photoPreviewAccess ?
          this.setData({ photoPreviewAccess: false }) :
          this.setData({ photoPreviewAccess: true });
      }
    }else {
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
        if (res.type === "tap") {
          wx.showModal({
            title: "图片记事",
            content: "无相机权限，只能从手机相册获取图片",
            success(res) {
              if (res.confirm) {
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
        } else if (res.type === "longpress") {
          this.data.photoPreviewAccess ?
            this.setData({ photoPreviewAccess: false }) :
            this.setData({ photoPreviewAccess: true });
        }
      } else {
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
      wx.previewImage({
        urls: [toShowNoteCargo.note.photo[index].url],
      });
    } else if (res.type === "longpress") {
      var that = this;
      wx.showActionSheet({
        itemList: ["保存图片到手机相册", "删除本张图片"],
        success (res) {
          if (res.tapIndex === 0)  {
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
          }else {
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

  /* 视频记事 */
  //视频记事创建及查看
  getShootFn(res) {
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
    var that = this;
    if (getCameraAccess) {
      if (!toShowNoteCargo.note.video) {
        wx.chooseVideo({
          sourceType: ["album", "camera"],
          camera: "back",
          success (res) {
            toShowNoteCargo.note.video = res.tempFilePath;
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
          success (res) {
            if (res.confirm) {
              this.setData({
                videoDisplay: true,
                videoSrc: toShowNoteCargo.note.video
              });
            }
          }
        });
      }else {
        wx.showModal({
          title: "视频记事",
          content: "无相机权限，只能从手机相册获取视频",
          success (res) {
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
  //视频预览组件：查看、保存到手机相册与删除
  videoPreview(res) {
    var that = this;
    wx.showActionSheet({
      itemList: ["退出预览", "保存视频到手机相册", "删除视频"],
      success(res) {
        if (res.tapIndex === 0) {
          that.setData({
            mainFnDisplay: true,
            videoPreviewFnDisplay: false,
            videoSrc: null
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
  },

  /* 保存和取消记事区 */
  save_cancel(res) {
    if (this.data.recordAccess) this.setData({ recordAccess: false });
    if (this.data.playbackAccess) this.setData({ playbackAccess: false });
    if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
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
          content: "当前没有任何记事，仍然取消记事?",
          success (res) {
            if (res.confirm) wx.redirectTo({ url: "../Home/Home" });
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

});