// CreateNote/CreateNote/CreateNote.js

//记事撰写页面初始化


  //语音记事区与拍摄记事公用动画组件
    var timer = 0; //创建承接呼吸效果计时器的标识
    var lock = true; //创建语音记事/录像记事创建状态的监测标识，若未在创建则为false，否则为true

  //跨域传值载体初始化
    var toShowNoteCargo; //创建向读记事页发送数据的载体
    var fromShowNoteCargo; //创建接收读记事页发送的数据的载体

  //文本记事功能初始化
    var notWriteNow = false; //创建用于监测是否正在进行非文本记事或设置闹钟提醒的标识

  //语音记事功能初始化
    const recorderManager = wx.getRecorderManager(); //获取全局唯一的录音管理器 recorderManager
    const innerAudioContext = wx.createInnerAudioContext(); //创建并返回内部audio上下文 innerAudioContext对象
    var makeRecordNote = false; //创建语音记事创建状态的标识，若未在创建则为false，否则为true

  //拍摄记事数据初始化
    var makeCameraNote = false; //创建拍摄记事创建状态的标识，若未在创建则为false，否则为true
    var whatCameraNote; //创建用于获取当前拍照记事上一次创建状态的标识

  //用于监测是否可以保存记事的定时器的标识
  var canISave;



//拍摄记事功能相机组件数据初始化
    var camera = ["\xa0", "拍\xa0\xa0\xa0照", "录\xa0\xa0\xa0像"]; //拍摄功能按钮的字样;
    var setting = [1, 0, 0]; //拍摄功能的画质选择、闪光灯选择、摄像头前置后置选择的默认选择
    var cameraFnChoice; //创建接收记事撰写页请求的载体

Page({
  /* 页面的初始数据 */
    data: {
      //主功能区、拍摄记事相机组件、录像记事预览组件切换功能初始化，默认主功能区启动，其他功能区待命
        mainFnDisplay: true,
        cameraFnDisplay: false,
        videoPreviewFnDisplay: false,

      //语音记事与拍摄记事相机组件公用组件功能初始化
        tapStart: 0, //按钮触碰瞬间计时
        tapEnd: 200, //按钮抬起瞬间计时

      //拍摄记事相机组件功能初始化
        useCamera: camera[0], //拍摄功能的按钮字样，若字样为空则拍摄记事功能不可用，默认字样为空
        breathingEffection: null, //拍摄记事功能按钮的呼吸效果，默认无效果
        Quality: "normal", //拍照记事成像质量的默认选择，normal为普通画质，lhigh为高清画质、low为低清画质
        Cam: "back", //拍照记事摄像头前置后置的默认选择，back为后置摄像，front为前置摄像，默认值为back
        Flash: "auto", //拍照记事闪光灯闪光类型选择的默认选择，auto为自动、on为强制、off为关闭
        ifPhoto: false, //当拍摄记事类型不是拍照记事时，不允许对成像质量和闪光灯闪光类型进行选择，此时滚动选择器中将没有成像质量和闪光灯闪光类型选择的选择器
        quality: ["高清画质", "普通画质", "低清画质"], //滚动选择器中成像质量选择框中相关选择的字样
        flash: ["自动闪光", "强制闪光", "关闭闪光"], //滚动选择器中闪光灯闪光类型选择框的相关选择的字样
        cam: ["后置拍摄", "前置拍摄"], //滚动选择器中摄像头前置后置选择框中相关选择的字样
        value: setting, //拍摄功能的画质选择、闪光灯选择、摄像头前置后置选择，默认为普通画质、自动闪光、后置拍摄

      //录像记事预览组件功能初始化
        videoSrc: null, //视频播放地址，默认为空;
      
      //主功能区功能初始化
        upperMaskHeight: 0, //上部蒙层高度，值有0、71.8、78.8、85.8
        bottomMaskHeight: 0, //下部蒙层高度，对应上部蒙层高度，值有0、21.8、14.8、7.8
        titleDefault: "记事标题", //标题文本为空时的字样，默认为记事标题
        textDefault: "记事文本", //记事文本为空时的字样，默认为记事文本
        isDisabled: false, //由于textarea层级优先度过高，当其他记事功能正在使用时要使其失效
        record: "语音记事", //语音记事功能按钮的字样
        breathingEffection: null, //语音记事功能按钮的呼吸效果，默认无效果
        camera: "拍摄记事", //拍摄记事功能按钮的字样
        photo: "拍照记事", //拍照记事功能按钮的字样
        shoot: "录像记事", //录像记事功能按钮的字样
        cameraFnEnterDisplay: true, //拍摄记事区，功能启动按钮展示状态，默认展示
        cameraFnChoiceDisplay: false, //拍摄记事区，功能选择按钮展示状态，默认隐藏
        cameraFnChoice: 0, //拍摄记事区，功能选择上下滑块的初始设定，默认从第一滑块开始
        save_cancel: "取消记事", //保存/取消按钮的字样
    },

  /* 生命周期函数--监听页面加载 */
    onLoad: function (options) {
      console.log("CreateNote onLoad");
      if (wx.getStorageSync("editNote")) {
        toShowNoteCargo = wx.getStorageSync("editNote");
        wx.removeStorageSync("editNote");
        console.log("用户开始修改记事", toShowNoteCargo);
        this.setData({
          title: toShowNoteCargo.note.title,
          text: toShowNoteCargo.note.text
        });
        console.log("各项记事存储情况如下",
          "\n记事标题：" + this.data.title,
          "\n记事文本：" + this.data.title,
          "\n语音记事：" + makeRecordNote + " 存储地址：" + toShowNoteCargo.note.recordPath,
          "\n拍摄记事: " + makeCameraNote + " 存储地址：" + [
            "\n拍照记事: " + toShowNoteCargo.note.photoPath,
            "\n录像记事：" + toShowNoteCargo.note.videoPath
          ])
      } else {
        console.log("用户开始新建记事", toShowNoteCargo);
        //初始化向写记事页发送数据的载体
        toShowNoteCargo = {
          id: wx.getStorageSync("note").length,
          info: {
            noteType: null,
            timeStamp: null,            
            marginTop: wx.getStorageSync("note").length * 9,
            pullOutDelete: -18,
            pullOutMenu: -30
          },
          note: {
            title: null,
            text: null,
            recordPath: null,
            photoPath: null,
            videoPath: null
          }
        }
        console.log("toShowNoteCargo初始化情况", toShowNoteCargo);
      }
      //定时器用于监测当前是否已写记事标题并有任何记事，若有则开启保存权限，否则关闭保存权限
        canISave = setInterval(() => {
          if (toShowNoteCargo.note.title) {
            if (toShowNoteCargo.note.text || (makeRecordNote || makeCameraNote)) {
              this.data.save_cancel == "保存记事" ? "" : this.setData({ save_cancel: "保存记事" });
            } else {
              this.data.save_cancel == "取消记事" ? "" : this.setData({ save_cancel: "取消记事" });
            }
          } else {
            this.data.save_cancel == "取消记事" ? "" : this.setData({ save_cancel: "取消记事" });
          }
        }, 5);
        console.log("写记事开始监测当前是否可以保存记事", "检测用定时器标识为" + canISave);
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
      clearInterval(canISave);
      console.log("监测用定时器已清除", "检测用定时器标识为" + canISave);
      toShowNoteCargo = null;
      console.log("toShowNoteCargo已被清空", toShowNoteCargo);
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

  /* 自定义用户交互逻辑处理: 记事撰写  */
      /* 按钮点击时长监测组件：用于语音记事区和拍摄记事功能相机组件 */
        //监测按钮的按下时间
        tapStart(res) {
          console.log("语音记事按钮或拍摄记事功能相机组件按钮触碰");
          this.setData({
            tapStart: new Date().getTime()
          });
        },
        //监测按钮的按下时间
        tapEnd(res) {
          console.log("语音记事按钮或拍摄记事功能相机组件按钮抬起");
          this.setData({
            tapEnd: new Date().getTime()
          });
        },

    /* 文本记事区 */
      titleContent: function (res) {
        toShowNoteCargo.note.title = res.detail.value;
      },
      textContent: function (res) {
        toShowNoteCargo.note.text = res.detail.value;
      },

    /* 语音记事区 */
      recordFn (res) {
        let tapTime = this.data.tapEnd - this.data.tapStart;
        if (tapTime <= 200 && lock) {
          lock = false;
          this.setData({
            upperMaskHeight: 78.8,
            bottomMaskHeight: 14.8
          })
          recorderManager.start({
            duration: 1200000,
            sampleRate: 44100,
            numberOfChannels: 2,
            encodeBitRate: 192000,
            format: 'aac',
            frameSize: 50
          });
          console.log("动画：创建并实例化按钮的呼吸动画效果");
          var that = this;
          that.animation = wx.createAnimation({
            duration: 1000,
            timingFunction: "linear",
          })
          that.animation.backgroundColor('red').step();
          that.setData({
            breathingEffection: that.animation.export()
          });
          setTimeout(function () {
            that.animation.backgroundColor('white').step();
            that.setData({
              breathingEffection: that.animation.export()
            });
          }, 1000);
          timer = setInterval(function () {
            that.animation.backgroundColor('red').step();
            that.setData({
              breathingEffection: that.animation.export()
            });
            setTimeout(function () {
              that.animation.backgroundColor('white').step();
              that.setData({
                breathingEffection: that.animation.export()
              });
            }, 1000);
          }, 2000);
          console.log("动画：按钮呼吸效果创建成功");
          recorderManager.onStop((res) => {
            console.log("用户成功进行语音记事");
            toShowNoteCargo.note.recordPath = res.tempFilePath;
            console.log("当前语音记事路径为", toShowNoteCargo.note.recordPath);
            makeRecordNote = !makeRecordNote;
            clearInterval(timer);
            that.animation = wx.createAnimation({
              duration: 0,
            })
            that.animation.backgroundColor('white').step();
            that.setData({
              breathingEffection: that.animation.export()
            });
            console.log("动画：按钮呼吸状态成功截停");
            wx.showToast({
              title: '语音记事成功！',
              image: '../images/success.png',
              mask: true
            })
          })
        }else if (tapTime <= 200 && !lock) {
          lock = true;
          this.setData({
            upperMaskHeight: 0,
            bottomMaskHeight: 0
          })
          recorderManager.stop();
          recorderManager.onStop((res) => {
            console.log("用户成功进行语音记事");
            toShowNoteCargo.note.recordPath = res.tempFilePath;
            console.log("当前语音记事路径为", toShowNoteCargo.note.recordPath);
            makeRecordNote = !makeRecordNote;
          });
          console.log("动画：创建并实例化强制截停呼吸效果的动画效果");
          var that = this;
          clearInterval(timer);
          that.animation = wx.createAnimation({
            duration: 0,
          })
          that.animation.backgroundColor('white').step();
          that.setData({
            breathingEffection: that.animation.export()
          });
          console.log("动画：按钮呼吸状态成功截停");
          wx.showToast({
            title: '语音记事成功！',
            image: '../images/success.png',
            mask: true
          })
        }else if (!makeRecordNote) {
            wx.showToast({
              title: '无语音记事',
              image: '../images/warning.png',
              mask: true
            })
        }else if (makeRecordNote) {
          wx.showActionSheet({
            itemList: ["返听", "删除"],
            success (res) {
              res.tapIndex == 0 ?
              (() => {
                console.log("用户试图返听当前语音记事");
                innerAudioContext.autoplay = true
                innerAudioContext.src = toShowNoteCargo.note.recordPath;
                console.log("当前语音记事路径为" ,innerAudioContext.src);
              })() :
              (() => {
                wx.showModal({
                  title: '语音记事',
                  content: '是否清除当前语音记事？',
                  success (res) {
                    res.confirm ? (() => {
                      console.log("用户试图清除当前语音记事");
                      toShowNoteCargo.note.recordPath = null;
                      console.log("当前语音记事路径为", toShowNoteCargo.note.recordPath);
                      makeRecordNote = false;
                    })() : '';
                  }
                })
              })()
            }
          })
        }
      },
    
    /* 拍摄记事区 */
        /* 拍摄记事功能相机组件 */
          //滚动选择器滚动时拍摄记事功能实时对成像质量、闪光灯闪光类型和摄像头前置后置进行选择
            cameraTakingSet(res) {
              console.log("用户正在对成像画质、闪光灯闪光类型和摄像头前置后置进行选择");
              var Arr = res.detail.value;
              Arr[0] == 0 ? this.setData({ Quality: "hight" }) : Arr[0] == 1 ? this.setData({ Quality: "normal" }) : 
              this.setData({ Quality: "low" })
              Arr[1] == 0 ? this.setData({ Flash: "auto" }) : Arr[1] == 1 ? this.setData({ Flash: "on" }) : 
              this.setData({ Flash: "off" });
              Arr[2] == 0 ? this.setData({ Cam: "back" }) : this.setData({ Cam: "front" });
            },
          //拍摄记事功能按钮的功能设定
            useCamera(res) {
              let tapTime = this.data.tapEnd - this.data.tapStart;
              var that = this;
              if (tapTime < 200) { //用户按下拍摄记事按钮的时长短于200ms是则可以开始拍照或录像
                console.log("拍摄记事功能按钮按下时长为" + tapTime + "ms，用户试图执行拍摄功能");
                const ctx = wx.createCameraContext() //创建并返回 camera 上下文 cameraContext 对象
                if (this.data.useCamera == camera[1]) {
                  console.log("用户试图拍照记事");
                  ctx.takePhoto({
                    quality: this.data.Quality[this.data.value[0]],
                    success(res) {
                      console.log("用户拍照记事成功");
                      makeCameraNote = !makeCameraNote;
                      toShowNoteCargo.note.photoPath = res.tempImagePath;
                      wx.previewImage({
                        urls: [toShowNoteCargo.note.photoPath],
                      });
                      console.log("当前拍照记事暂存, 暂存路径为", toShowNoteCargo.note.photoPath);
                    },
                    fail(res) {
                      console.log("用户拍照记事失败");
                      wx.showToast({
                        title: '拍照记事失败！',
                        image: '../images/error.png'
                      });
                      wx.redirectTo({
                        url: '../Home/index',
                      });
                    }
                  });
                }else if (this.data.useCamera == camera[2]) {
                  console.log("用户试图录像记事");
                  if (lock) {
                    console.log("用户试图开始录像记事");
                    lock = false;
                    ctx.startRecord({
                      success(res) {
                        console.log("用户成功开始录像记事");
                        console.log("动画：创建并实例化按钮的呼吸动画效果")
                        that.animation = wx.createAnimation({
                          duration: 1000,
                          timingFunction: "linear",
                        })
                        that.animation.backgroundColor('red').step();
                        that.setData({
                          breathingEffection: that.animation.export()
                        });
                        setTimeout(function () {
                          that.animation.backgroundColor('white').step();
                          that.setData({
                            breathingEffection: that.animation.export()
                          });
                        }, 1000);
                        timer = setInterval(function () {
                          that.animation.backgroundColor('red').step();
                          that.setData({
                            breathingEffection: that.animation.export()
                          });
                          setTimeout(function () {
                            that.animation.backgroundColor('white').step();
                            that.setData({
                              breathingEffection: that.animation.export()
                            });
                          }, 1000);
                        }, 2000);
                        console.log("动画：按钮呼吸效果创建成功");
                      },
                      fail(res) {
                        console.log("录像记事出错：无法进行录像记事");
                        makeCameraNote = false;                        
                        wx.showToast({
                          title: '无法录像记事!',
                          image: '../images/error.png',
                          mask: true
                        });
                        wx.redirectTo({
                          url: '../Home/index',
                        })
                      }
                    })
                  } else {
                    console.log("用户试图停止录像记事");
                    lock = true;
                    ctx.stopRecord({
                      success(res) {
                        console.log("用户成功停止录像记事");
                        makeCameraNote = !makeCameraNote;                        
                        toShowNoteCargo.note.videoPath = res.tempVideoPath;
                        console.log("当前录像记事暂存, 暂存路径为", toShowNoteCargo.note.videoPath);
                        console.log("动画：创建并实例化强制截停呼吸效果的动画效果");
                        clearInterval(timer);
                        that.animation = wx.createAnimation({
                          duration: 0,
                        })
                        that.animation.backgroundColor('white').step();
                        that.setData({
                          breathingEffection: that.animation.export()
                        });
                        console.log("动画：按钮呼吸状态成功截停");
                        wx.showToast({
                          title: '录像记事成功！',
                          image: '../images/success.png',
                          mask: true
                        })
                      },
                      fail(res) {
                        console.log("录像记事出错：未能成功停止录像记事！");
                        makeCameraNote = false;
                        wx.showToast({
                          title: '录像记事出错！',
                          image: '../images/error.png',
                          mask: true
                        });
                        wx.redirectTo({
                          url: '../Home/index',
                        })
                      }
                    })
                  }
                } else {
                  console.log("拍摄记事出错：系统崩溃！");
                  makeCameraNote = false;                  
                  wx.showToast({
                    title: '拍摄记事出错!',
                    image: '../images/error.png',
                    mask: true
                  });
                  setTimeout(function () {
                    wx.redirectTo({
                      url: '../Home/index',
                    });
                  }, 500);
                }
              }else {
                console.log("拍摄记事功能按钮按下时长为" + tapTime + "ms，用户试图当前拍摄记事功能相机组件");
                whatCameraNote ? makeCameraNote = !makeCameraNote : '';
                this.setData({
                  cameraFnDisplay: false,
                  mainFnDisplay: true,
                });
                makeCameraNote ? this.setData({
                  cameraFnEnterDisplay: true,
                  cameraFnChoiceDisplay: false,
                  upperMaskHeight: 0,
                  bottomMaskHeight: 0
                }) : ""
                console.log("用户成功取消当前拍摄记事并继续进行其他记事");                
              }
            },

        /* 录像记事预览组件 */
          videoPreview: function (res) {
            var that = this;
            wx.showModal({
              title: '录像记事预览',
              content: '是否退出当前录像记事预览？',
              success (res) {
                if (res.confirm) {
                  console.log("写记事开始退出录像记事预览组件");
                  that.setData({
                    mainFnDisplay: true,
                    videoPreviewFnDisplay: false,
                    videoSrc: null
                  })
                  console.log("写记事成功退出录像记事预览组件");                  
                }
              },
              fail (res) {
                console.log("写记事页崩溃，MultiNote准备返回启动页");
                wx.showToast({
                  title: '写记事页崩溃!',
                  image: '../images/error.png',
                  mask: true
                });
                wx.redirectTo({
                  url: '../Home/index',
                  success (res) {
                    console.log("MultiNote成功返回启动页");
                  },
                  fail (res) {
                    console.log("MultiNote未成功返回启动页，重大事故：全局崩溃!");
                  }
                })
              }
            })
          },

      //拍摄记事点击事件：开始拍摄记事
        setCamera: function (res) {
          console.log("用户试图开始拍摄记事");
          var that = this;
          if (!makeCameraNote) {
            this.setData({
              cameraFnEnterDisplay: false,
              cameraFnChoiceDisplay: true,
              upperMaskHeight: 85.8,
              bottomMaskHeight: 7.8
            });
            console.log("用户进入拍摄记事类型选择滑块");
            setTimeout(() => {
              that.setData({ cameraFnChoice: 1 });
              setTimeout(() => {
                that.setData({ cameraFnChoice: 0 });
              }, 500)
            }, 500)
          }else if (makeCameraNote) {
            console.log("用户试图修改当前拍摄记事");
            wx.showModal({
              title: '拍摄记事',
              content: '拍摄记事已创建，是否修改？',
              success (res) {
                if (res.confirm) {
                  that.setData({
                    cameraFnEnterDisplay: false,
                    cameraFnChoiceDisplay: true,
                    upperMaskHeight: 85.8,
                    bottomMaskHeight: 7.8,
                  });
                  console.log("用户进入拍摄记事类型选择滑块");
                }
              }
            })
          }
        },
      //拍照记事点击事件：拍摄记事功能相机组件拍照功能初始化
        letPhoto: function (res) {
            cameraFnChoice = "photo";
            console.log("用户选择拍照记事");
            this.setData({
              useCamera: camera[1],
              ifPhoto: true,
              cameraFnDisplay: true,
              mainFnDisplay: false
            });
            console.log("照相记事功能初始化成功!");
        },
      //录像记事点击事件：拍摄记事功能相机组件录像功能初始化
        letShoot: function (res) {
          cameraFnChoice = "shoot";
          console.log("用户选择录像记事");
          this.setData({
            useCamera: camera[2],
            ifPhoto: false,
            cameraFnDisplay: true,
            mainFnDisplay: false
          });
          console.log("照相记事功能初始化成功!");
        },
      //拍照记事和录像记事长按事件：取消当前记事
        cancelCamera: function (res) {
          console.log("用户试图取消当前拍摄记事");
          makeCameraNote = whatCameraNote;
          var that = this;
          this.setData({
            cameraFnEnterDisplay: true,
            cameraFnChoiceDisplay: false,
            upperMaskHeight: 0,
            bottomMaskHeight: 0,
          });
          console.log("用户成功取消当前拍摄记事");          
        },
      //拍摄记事长按事件：查看或删除拍摄记事
        check_deleteCamera: function (res) {
          console.log("用户试图查看或删除当前拍摄记事");
          var that = this;
          if (makeCameraNote) {
            wx.showActionSheet({
              itemList: ["查看", "删除"],
              success (res) {
                console.log("用户正在选择查看或删除当前拍摄记事");
                if (res.tapIndex == 0) {
                  if (cameraFnChoice == "photo") {
                    wx.previewImage({
                      urls: [toShowNoteCargo.note.photoPath],
                    });
                    console.log("用户成功查看当前拍照记事，当前拍照记事路径为\n", toShowNoteCargo.note.photoPath);
                  }else if (cameraFnChoice == "shoot") {
                    console.log("读记事准备进入录像记事预览组件");
                    that.setData({
                      videoSrc: toShowNoteCargo.note.videoPath,
                      mainFnDisplay: false,
                      cameraFnDisplay: false,
                      videoPreviewFnDisplay: true
                    });
                    console.log("读记事成功进入录像记事预览组件");                    
                  }
                }else {
                  console.log("用户试图清除当前拍摄记事");
                  makeCameraNote = false;
                  toShowNoteCargo.note.photoPath = null;
                  toShowNoteCargo.note.videoPath = null;
                  console.log("用户成功清除当前拍摄记事");
                }
              }
            })
          }else {
            console.log("用户查看拍摄记事失败，原因：当前没有拍摄记事");
            wx.showToast({
              title: '无拍摄记事',
              image: '../images/warning.png',
              mask: true
            })
          }
        },

    /* 保存和取消记事区 */
      save_cancel: function (res) {
        console.log("用户试图保存或取消当前记事");
        console.log("toShowNoteCargo的记事存储状态", toShowNoteCargo);
        //保存记事点击事件：保存当前记事数据并向显示页发送当前记事数据
          if (this.data.save_cancel == "保存记事") {
            console.log("用户试图保存当前记事");            
            wx.showModal({
              title: '保存记事',
              content: '是否保存当前记事？',
              success(res) {
                if (res.confirm) {
                  console.log("MultiNote开始保存当前记事");                  
                  //为当前记事创建同步缓存并跳转到记事显示页
                    let ifSaveSuccessfully = false;
                    if (toShowNoteCargo.info.noteType !== "edit") {
                      toShowNoteCargo.info.noteType = "new";
                      toShowNoteCargo.info.timeStamp = new Date().getTime();
                      wx.setStorageSync("newNote", toShowNoteCargo);
                      ifSaveSuccessfully = Boolean(wx.getStorageSync("newNote"));
                      console.log("MultiNote为当前记事创建时间戳并记录当前记事记录状态");
                      console.log("当前记事的时间戳为 " + toShowNoteCargo.timeStamp);
                      console.log("当前记事的记录状态为 " + toShowNoteCargo.info.noteType);
                    }else {
                      console.log("toShowNoteCargo", toShowNoteCargo);
                      wx.setStorageSync("editNote", toShowNoteCargo);
                      console.log("修改的记事" ,wx.getStorageSync("editNote"));
                      ifSaveSuccessfully = Boolean(wx.getStorageSync("editNote"));
                      console.log("MultiNote记录当前记事记录状态，记录状态为 " +
                                  toShowNoteCargo.info.noteType);
                    }
                    if (ifSaveSuccessfully) {
                      console.log("用户记事保存成功")
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
                    }else {
                      console.log("用户保存记事失败，重大故障：全局崩溃!");
                      wx.showToast({
                        title: '记事保存出错!',
                        image: "../images/error.png",
                        mask: true
                      });
                    }
                } else {
                  console.log("用户试图继续进行当前记事")
                  wx.showModal({
                    title: '保存记事',
                    content: '是否继续当前记事？',
                    success(res) {
                      if (res.cancel) {
                        wx.redirectTo({
                          url: "../ShowNote/ShowNote",
                        });
                        toShowNoteCargo = null;
                      }
                    }
                  })
                }
              }
            })
          }else {
            if (wx.getStorageSync("note").length == 0) {
              wx.showModal({
                title: '写记事',
                content: '当前没有任何记事，不能返回读记事',
                showCancel: false
              })
            }else {
              var that = this;
              wx.showModal({
                title: '取消记事',
                content: '是否取消当前记事？',
                success(res) {
                  res.confirm ? wx.redirectTo({
                    url: "../ShowNote/ShowNote",
                  }) : "";
                }
              })
            }
          }
      }

});
