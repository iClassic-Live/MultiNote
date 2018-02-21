// CreateNote/CreateNote/CreateNote.js

/* 写记事页面初始化 */

  //用于监测是否已开启相关权限的标识初始化
  var getRecordAccess = true; //录音权限的标识，默认权限开启
  var getCameraAccess = true; //相机权限的标识，默认权限开启

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

  var shootNow = false;
  var shootTimer;

/* 页面构造器：页面功能初始化 */
  Page({

  /* 页面默认功能 */

    /* 页面的初始数据 */
    data: {

      //主功能区、视频记事预览组件切换功能初始化，默认主功能区启动，其他功能区待命
      mainFnDisplay: true,
      cameraFnDisplay: false,
      videoDisplay: false,

      //主功能区功能初始化
      upperMaskHeight: 0, //上部蒙层高度
      bottomMaskHeight: 0, //下部蒙层高度

      //记事标题功能初始化
      titleDefault: "记事标题", //标题文本为空时的字样，默认为记事标题

      //文本记事功能初始化
      textDefault: "记事文本", //记事文本为空时的字样，默认为记事文本

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
      //监测当前是修改记事还是新建记事，并相应地为接下来的记事存储做准备
      if (wx.getStorageSync("editNote")) {
        toShowNoteCargo = wx.getStorageSync("editNote");
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
          "\n图片记事：" + toShowNoteCargo.note.photo,
          "\n视频记事：" + toShowNoteCargo.note.video);
      } else {
        console.log("用户开始新建记事");
        //初始化向写记事页发送数据的载体
        toShowNoteCargo = {
          id: wx.getStorageSync("note").length,
          note: {
            title: "",
            text: "",
            record: [],
            photo: [],
            video: ""
          },
          style: {
            marginTop: wx.getStorageSync("note").length * 9,
            opacity: 1,
            pullOutDelete: -20,
            pullOutMenu: -40
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

    /* 记事标题 */
    //记事标题的创建
    titleContent(res) {
      if (this.data.recordAccess) this.setData({ recordAccess: false });
      if (this.data.playbackAccess) this.setData({ playbackAccess: false });
      if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
      if (res.type === "input") {
        if (res.detail.value.length <= 30) {
          if (/\s/g.test(res.detail.value.split("")[0])) {
            this.setData({ title: "" });
            wx.showToast({
              title: "首字符不能为空",
              image: "../images/warning.png"
            });
          } else toShowNoteCargo.note.title = res.detail.value;
        }else {
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
      }else if (res.type === "blur") {
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

    /* 语音记事 */
    //语音记事与返听功能权限的开启与关闭
    getRecordFn(res) {
      if (this.data.photoPreviewAccess) this.setData({ photoPreviewAccess: false });
      if (getRecordAccess) {
        if (toShowNoteCargo.note.record.length === 0) {
          this.data.recordAccess ?
            this.setData({ recordAccess: false }) :
            this.setData({ recordAccess: true });
        }else if (toShowNoteCargo.note.record.length < 5) {
          var that = this;
          if (this.data.recordAccess) {
            wx.showModal({
              title: "语音记事",
              content: "是否要返听语音？",
              success (res) {
                if (res.confirm) that.setData({ playbackAccess: true });
                that.setData({ recordAccess: false });
              }
            });
          }else if (this.data.playbackAccess) {
            wx.showModal({
              title: "语音记事",
              content: "是否要进行记事？",
              success(res) {
                if (res.confirm) that.setData({ recordAccess: true });
                that.setData({ playbackAccess: false });
              }
            });
          }else {
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
            success (res) {
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
              }else {
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
              success (res) {
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
                }else if (res.tapIndex === 1) {
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
                }else {
                  that.setData({ photoPreviewAccess: true });
                }
              }
            });
          }else this.setData({ photoPreviewAccess: false });
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
                  that.setData({ photoPreview: true });
                }
              }
            });
          }else this.setData({ photoPreviewAccess: false });
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
        wx.previewImage({ urls: [toShowNoteCargo.note.photo[index].url] });
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
                if (toShowNoteCargo.note.photo.length === 0) that.setData({ photoPreviewAccess: false });
              }, 500);
            }
          }
        });
      }
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
            success (res) {
              if (res.tapIndex === 0) {
                that.setData({
                  mainFnDisplay: false,
                  cameraFnDisplay: true,
                  ifPhoto: false,
                  camSet: "back",
                  cameraSet: "../images/shoot.png",
                  changeMode: "../images/photo.png"
                });
              }else {
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
              if (res.confirm) wx.redirectTo({ url: "../ShowNote/ShowNote" });
            }
          });
        }
      }
    },

    /* 相机组件 */
    goback (res) {
      this.setData({
        cameraFnDisplay: false,
        mainFnDisplay: true
      });
    },
    camSet (res) {
      if (this.data.camSet === "front") {
        this.setData({ camSet: "back" });
      }else this.setData({ camSet: "front" });
      this.setData({ camSign: 0 });
      setTimeout(() => {
        this.setData({ camSign: 1 });
      }, 500);
    },
    flashSet (res) {
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
      }else {
        wx.showToast({
          title: "前置无闪光模式",
          image: "../images/warning.png"
        });
      }
    },
    preview (res) {
      var logs = [];
      if (this.data.img.length > 0) {
        this.data.img.forEach((ele, index, origin) => { logs.push(ele.url) });
        wx.previewImage({
          current: this.data.img.length,
          urls: logs
        });
      }else {
        wx.showToast({
          title: "图片记事为空",
          image: "../images/warning.png"
        });
      }
    },
    cameraSet (res) {
      const camera = wx.createCameraContext();
      var that = this
      if (this.data.cameraSet === "../images/photo.png") {
        if (toShowNoteCargo.note.photo.length < 3) {
          var quality;
          if (this.data.qualitySet === "Normal") quality = "normal";
          if (this.data.qualitySet === "High") quality = "high";
          if (this.data.qualitySet === "Low") quality = "low";
          camera.takePhoto({
            quality: quality,
            success (res) {
              var logs = { photo_index: toShowNoteCargo.note.photo.length, 
                           url: res.tempImagePath, opacity: 1 };
              toShowNoteCargo.note.photo.push(logs);
              that.setData({
                preview: logs.url,
                img: toShowNoteCargo.note.photo
              });
              if (toShowNoteCargo.note.photo.length < 3) {
                wx.showToast({
                  title: "第" + that.data.img.length + "张图片记事",
                  icon: "none"
                });
              }else {
                if (!toShowNoteCargo.note.video)
                wx.showModal({
                  title: "图片记事",
                  content: "图片记事已满，仍然可以以录像方式进行视频记事，是否进入录像模式？",
                  success (res) {
                    if (res.confirm) {
                      that.setData({
                        cameraSet: "../images/shoot.png",
                        changeMode: "",
                        ifPhoto: false
                      });
                    }else {
                      that.setData({
                        cameraFnDisplay: false,
                        mainFnDisplay: true
                      });
                    }
                  }
                });
              }
            }
          });
        }
      }else if (this.data.cameraSet === "../images/shoot.png") {
        function stopShoot () {
          camera.stopRecord({
            success(res) {
              shootNow = false;
              clearTimeout(shootTimer);
              clearInterval(interval);
              clearTimeout(timerA);
              clearTimeout(timerB);
              if (that.data.shootSign === 1) this.setData({ shootSign: 0 });
              toShowNoteCargo.note.video = res.tempVideoPath;
              wx.vibrateLong();
              that.setData({ shootNow: false });
              wx.showToast({
                title: "视频记事成功!",
                image: "../images/success.png",
                mask: true
              });
              setTimeout(() => {
                that.setData({
                  cameraFnDisplay: false,
                  videoDisplay: true,
                  videoSrc: toShowNoteCargo.note.video
                });
              }, 1500);
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
            }
          });
        }else stopShoot();
      }
    },
    changeMode (res) {
      var changeMode = this.data.changeMode;
      var photo, video;
      if (toShowNoteCargo.note.photo < 3) photo = true;
      if (!toShowNoteCargo.note.video) video = true;
      if (changeMode === "../images/shoot.png") {
        if (video) {
          this.setData({
            cameraSet: "../images/shoot.png",
            changeMode: "../images/photo.png",
            ifPhoto: false
          });
        }else wx.showToast({
          title: "视频记事已满",
          image: "../images/warning.png",
          mask: false
        });
      } else if (changeMode === "../images/photo.png") {
        if (photo) {
          this.setData({
            cameraSet: "../images/photo.png",
            changeMode: "../images/shoot.png",
            ifPhoto: true
          }); 
        }else wx.showToast({
          title: "图片记事已满",
          image: "../images/warning.png",
          mask: false
        });
      }
    },
    qualitySet (res) {
      if (this.data.qualitySet === "Normal") {
        this.setData({ qualitySet: "High" });
      }else if (this.data.qualitySet === "High") {
        this.setData({ qualitySet: "Low" });
      }else this.setData({ qualitySet: "Normal" });
    }

  });
