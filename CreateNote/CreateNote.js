// CreateNote/CreateNote/CreateNote.js

//记事撰写页面初始化


  //语音记事区与拍摄记事公用动画组件
    var timer = 0; //创建承接呼吸效果计时器的标识

  //跨域传值载体初始化
    var toShowNoteCargo = { //创建向记事显示页发送数据的载体
      title: null,
      text: null,
      recordPath: null,
      photoPath: null,
      videoPath: null,
      alarmSet: null,
    };
    var fromShowNoteCargo; //创建接收记事显示页发送的数据的载体

  //文本记事功能初始化
    var notWriteNow = false; //创建用于监测是否正在进行非文本记事或设置闹钟提醒的标识

  //语音记事功能初始化
    const recorderManager = wx.getRecorderManager(); //获取全局唯一的录音管理器 recorderManager
    const innerAudioContext = wx.createInnerAudioContext(); //创建并返回内部audio上下文 innerAudioContext对象
    var lock = true; //创建用于监测当前是否正在进行语音记事的标识;
    var makeRecordNote = "unset"; //创建语音记事创建状态的标识，值有unset、setting和done，分别对应状态：未设定、设定中、完成，初始值为unset

  //拍摄记事数据初始化
    var makeCameraNote = "unset"; //创建拍摄记事创建状态的标识，值有unset、setting和done，分别对应状态：未设定、设定中、完成，初始值为unset
    var whatCameraNote; //创建用于获取当前拍照记事上一次创建状态的标识

  //设置闹钟提醒数据初始化
    var date = new Date();
    var thisMonth, thisDate, thisHour, thisMinute, startDate, startTime, timeSet //创建本月、本日、本时、本分、日期选择器的初始选择、时刻选择器的初始选择、闹钟提醒设置中的时间设定可读化字样承接变量
    var makeAlarmSet = "unset"; //创建闹钟提醒设置创建状态的标识，值有unset、goSetDate、goSetTime和done，分别对应状态：未设定、将设定日期、将设定时刻、完成，初始值为unset
    var whatAlarmSet; //创建用于获取当前闹钟提醒上一次设置状态的标识
    var timeSync; //创建用于实时同步当前时间数据的定时器标识


//拍摄记事功能相机组件数据初始化
    var camera = ["\xa0", "拍\xa0\xa0\xa0照", "录\xa0\xa0\xa0像"]; //拍摄功能按钮的字样;
    var setting = [1, 0, 0]; //拍摄功能的画质选择、闪光灯选择、摄像头前置后置选择的默认选择
    var cameraFnChoice; //创建接收记事撰写页请求的载体
    var lock = true; //创建录像记事动画创建状态的监测标识，true即为未在录像记事，false为正在录像记事

Page({
  /* 页面的初始数据 */
    data: {
      //主功能区、拍摄记事相机组件、录像记事预览组件切换功能初始化，默认主功能区启动，其他功能区待命
        mainFnDisplay: "block",
        cameraFnDisplay: "none",
        videoPreviewFnDisplay: "none",

      //语音记事与拍摄记事相机组件公用组件功能初始化
        tapStart: 0, //按钮触碰瞬间计时
        tapEnd: 200, //按钮抬起瞬间计时

      //拍摄记事相机组件功能初始化
        useCamera: camera[0], //拍摄功能的按钮字样，若字样为空则拍摄记事功能不可用，默认字样为空
        breathingEffection: null, //拍摄记事功能按钮的呼吸效果，默认无效果
        Quality: "normal", //拍照记事成像质量的默认选择，normal为普通画质，lhigh为高清画质、low为低清画质
        Cam: "back", //拍照记事摄像头前置后置的默认选择，back为后置摄像，front为前置摄像，默认值为back
        Flash: "auto", //拍照记事闪光灯闪光类型选择的默认选择，auto为自动、on为强制、off为关闭
        ifPhoto: "none", //当拍摄记事类型不是拍照记事时，不允许对成像质量和闪光灯闪光类型进行选择，此时滚动选择器中将没有成像质量和闪光灯闪光类型选择的选择器
        quality: ["高清画质", "普通画质", "低清画质"], //滚动选择器中成像质量选择框中相关选择的字样
        flash: ["自动闪光", "强制闪光", "关闭闪光"], //滚动选择器中闪光灯闪光类型选择框的相关选择的字样
        cam: ["后置拍摄", "前置拍摄"], //滚动选择器中摄像头前置后置选择框中相关选择的字样
        value: setting, //拍摄功能的画质选择、闪光灯选择、摄像头前置后置选择，默认为普通画质、自动闪光、后置拍摄

      //录像记事预览组件功能初始化
        videoSrc: null, //视频播放抵制，默认为空;
      
      //主功能区功能初始化
        upperMaskHeight: 0, //上部蒙层高度，值有0、71.8、78.8、85.8
        bottomMaskHeight: 0, //下部蒙层高度，对应上部蒙层高度，值有0、21.8、14.8、7.8
        titleDefault: "记事标题", //标题文本为空时的字样，默认为记事标题
        textDefault: "记事文本", //记事文本为空时的字样，默认为记事文本
        isDisabled: false, //由于textarea层级优先度过，当其他记事功能正在使用时要使其失效
        recordSwiperCurrentSet: "0", //语音记事区，上下滑块的初始设定，默认从第一滑块开始
        record: "语音记事", //语音记事功能按钮的字样
        breathingEffection: null, //语音记事功能按钮的呼吸效果，默认无效果
        camera: "拍摄记事", //拍摄记事功能按钮的字样
        photo: "拍照记事", //拍照记事功能按钮的字样
        shoot: "录像记事", //录像记事功能按钮的字样
        cameraOuterSwiperCurrentSet: 1, //拍照记事区，左右滑块的初始设定，默认从第二滑块开始
        cameraInnerSwiperCurrentSet: 0, //拍照记事区，上下滑块的初始设定，默认从第一滑块开始
        setAlarm: "设置闹钟提醒", //设置闹钟提醒功能按钮的字样
        setDate: "设置响铃日期", //设置响铃日期功能按钮的字样
        setTime: "设置响铃时刻", //设置响铃时刻功能按钮的字样
        alarmOuterSwiperCurrentSet: "0", //闹钟提醒设置区，左右滑动滑块的初始设定，默认从第一滑块开始
        alarmInnerSwiperCurrentSet: "0", //闹钟提醒设置区，上下滑动滑块的初始设定，默认从第一滑块开始
        startDate: startDate, //日期选择器的起始可选日期
        startTime: startTime, //时刻选择器的起始可选时刻
        save: "保存记事", //保存按钮的字样


    },

  /* 生命周期函数--监听页面加载 */
    onLoad: function (options) {
      console.log("CreateNote onLoad");
      //设置闹钟提醒功能初始化
        var that = this;
        timeSync = setInterval(() => {
          thisMonth = date.getMonth() + 1;
          thisDate = date.getDate();
          thisHour = date.getHours();
          thisMinute = date.getMinutes();
          thisMonth >= 10 ? thisMonth : thisMonth = '0' + thisMonth;
          thisDate >= 10 ? thisDate : thisDate = '0' + thisDate;
          thisHour >= 10 ? thisHour : thisHour = '0' + thisHour;
          thisMinute >= 10 ? thisMinute : thisMinute = '0' + thisMinute;
          startDate = date.getFullYear() + '-' + thisMonth + '-' + thisDate;
          startTime = thisHour + ':' + thisMinute;
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
      wx.setStorageSync("toShowNoteCargo", toShowNoteCargo);
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
        toShowNoteCargo.title = res.detail.value;
      },
      textContent: function (res) {
        toShowNoteCargo.text = res.detail.value;
      },

    /* 语音记事区 */
      recordFn (res) {
        let tapTime = this.data.tapEnd - this.data.tapStart;
        if (tapTime <= 200 && lock) {
          lock = false;
          this.setData({
            upperMaskHeight: 71.8,
            bottomMaskHeight: 21.8
          })
          recorderManager.start({
            duration: 1200000,
            sampleRate: 44100,
            numberOfChannels: 2,
            encodeBitRate: 192000,
            format: 'aac',
            frameSize: 50
          });
          makeRecordNote = "setting";
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
            toShowNoteCargo.recordPath = res.tempFilePath;
            makeRecordNote = "done";
          })
        }else if (makeRecordNote == "setting"){
          wx.showToast({
            title: '语音记事出错！',
            image: '../images/error.png',
            mask: true
          });
        }else if (tapTime <= 200 && !lock) {
          lock = true;
          this.setData({
            upperMaskHeight: 0,
            bottomMaskHeight: 0
          })
          recorderManager.stop();
          recorderManager.onStop((res) => {
            toShowNoteCargo.tempRecordPath = res.tempFilePath;
            makeRecordNote = "done";
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
        }else if (makeRecordNote == "unset") {
            wx.showToast({
              title: '未进行语音记事',
              image: '../images/error.png',
              mask: true
            })
        }else if (makeRecordNote == "done") {
          wx.showActionSheet({
            itemList: ["返听", "清除"],
            success (res) {
              res.tapIndex == 0 ?
              (() => {
                innerAudioContext.autoplay = true
                innerAudioContext.src = toShowNoteCargo.recordPath;
              })() :
              (() => {
                wx.showModal({
                  title: '语音记事',
                  content: '是否清除当前语音记事？',
                  success (res) {
                    res.confirm ? (() => {
                      toShowNoteCargo.recordPath = null;
                      makeRecordNote = "unset";
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
                      makeCameraNote = "done";
                      toShowNoteCargo.photoPath = res.tempImagePath;
                      wx.previewImage({
                        urls: [toShowNoteCargo.photoPath],
                      });
                      console.log("当前拍照记事暂存");
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
                        makeCameraNote = "done";                        
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
                        makeCameraNote = "done";                        
                        toShowNoteCargo.videoPath = res.tempVideoPath;
                        console.log("当前录像记事暂存");
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
                  console.log("拍摄记事出错：系统崩溃！")
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
                whatCameraNote == "done" ? makeCameraNote = "done" : '';
                this.setData({
                  cameraFnDisplay: "none",
                  mainFnDisplay: "block"
                });
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
                  that.setData({
                    mainFnDisplay: "block",
                    videoPreviewFnDisplay: "none",
                    videoSrc: null
                  })
                }
              },
              fail (res) {
                wx.showToast({
                  title: '系统崩溃!',
                  image: '../images/error.png',
                  mask: true
                });
                wx.redirectTo({
                  url: '../Home/index',
                })
              }
            })
          },
      //拍摄记事区左右滑块滑动事件：阻止其他区域的事件被误触发并阻止用户不当地滑动当前区域滑块
        ifChoiceCamera: function (res) {
          //阻止其他区域的事件被误触发
            notWriteNow = !notWriteNow;
            if (notWriteNow) {
              this.setData({
                upperMaskHeight: 78.8,
                bottomMaskHeight: 14.8
              })
            }else {
              this.setData({
                upperMaskHeight: 0,
                bottomMaskHeight: 0
              })
            }
          //阻止用户不当地滑动当前区域滑块
            if (makeCameraNote == "unset" || makeCameraNote == "done") {
              this.setData({
                cameraOuterSwiperCurrentSet: 1
              })
            }else {
              this.setData({
                cameraOuterSwiperCurrentSet: 0
              })
            }
        },
      //拍摄记事点击事件：开始拍摄记事
        setCamera: function (res) {
          var that = this;
          if (makeCameraNote == "unset") {
            makeCameraNote = "setting";
            whatCameraNote = "unset"
            this.setData({
              cameraOuterSwiperCurrentSet: 0
            });
            setTimeout(() => {
              that.setData({
                cameraInnerSwiperCurrentSet: 1
              })
              setTimeout(() => {
                that.setData({
                  cameraInnerSwiperCurrentSet: 0
                })
              }, 500);
            }, 500);
          }else if (makeCameraNote == "done") {
            whatCameraNote = "done"
            wx.showModal({
              title: '拍摄记事',
              content: '拍摄记事已创建，是否修改？',
              success (res) {
                if (res.confirm) {
                  makeCameraNote = "setting";
                  that.setData({
                    cameraOuterSwiperCurrentSet: 0
                  });
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
              ifPhoto: "block",
              cameraFnDisplay: "block",
              mainFnDisplay: "none"
            });
            console.log("照相记事功能初始化成功!");
        },
      //录像记事点击事件：拍摄记事功能相机组件录像功能初始化
        letShoot: function (res) {
          cameraFnChoice = "shoot";
          console.log("用户选择录像记事");
          this.setData({
            useCamera: camera[2],
            ifPhoto: "none",
            cameraFnDisplay: "block",
            mainFnDisplay: "none"
          });
          console.log("照相记事功能初始化成功!");
        },
      //拍照记事和录像记事长按事件：取消当前记事
        cancelCamera: function (res) {
          makeCameraNote = whatCameraNote;
          var that = this;
          this.setData({
            cameraOuterSwiperCurrentSet: 1
          });
          setTimeout(() => {
            that.setData({
              cameraInnerSwiperCurrentSet: 0
            })
          }, 500)
        },
      //拍摄记事长按事件：查看或删除拍摄记事
        check_deleteCamera: function (res) {
          var that = this;
          if (makeCameraNote == "done") {
            wx.showActionSheet({
              itemList: ["查看", "删除"],
              success (res) {
                if (res.tapIndex == 0) {
                  if (cameraFnChoice == "photo") {
                    wx.previewImage({
                      urls: [toShowNoteCargo.photoPath],
                    })
                  }else if (cameraFnChoice == "shoot") {
                    that.setData({
                      videoSrc: toShowNoteCargo.videoPath,
                      mainFnDisplay: "none",
                      cameraFnDisplay: "none",
                      videoPreviewFnDisplay: "block"
                    })
                  }
                }else {
                  makeCameraNote = "unset";
                  toShowNoteCargo.tempPhotoPath = null;
                  toShowNoteCargo.tempVideoPath = null;
                }
              }
            })
          }else {
            wx.showToast({
              title: '未进行拍摄记事',
              image: '../images/error.png',
              mask: true
            })
          }
        },

    /* 设置闹铃提醒区 */
      timeSync: function (res) {
        this.setData({
          startDate: startDate,
          startTime: startTime,
        });
        //判断当前闹钟设定是否晚于当前时间
        var arr = (startDate + "-" + startTime.split(":").join("-")).split("-");
        var reg = /[0-9]+/g;
        var reset = true;
        if (makeAlarmSet == "done") {
          (timeSet.match(reg)).forEach((ele, index, origin) => {
            if (reset) {
              if (ele < arr[index]) {
                reset = false;
                makeAlarmSet = "unset";
                whatAlarmSet = "done";
              }
            }
          });
        }
      },
      //设置闹铃提醒区左右滑动滑块事件：阻止其他区域的事件被误触发并阻止用户不当地左右滑动当前区域滑块
        ifAlarmGetSet: function (res) {
          //阻止其他区域的事件被误触发
            notWriteNow = !notWriteNow;
            if (notWriteNow) {
              this.setData({
                upperMaskHeight: 85.8,
                bottomMaskHeight: 7.8
              })
            } else {
              this.setData({
                upperMaskHeight: 0,
                bottomMaskHeight: 0
              })
            }
          //阻止用户不当地左右滑动当前区域滑块
            if (makeAlarmSet == "unset" || makeAlarmSet == "done") {
              this.setData({
                alarmOuterSwiperCurrentSet: 0
              })
            }else {
              this.setData({
                alarmOuterSwiperCurrentSet: 1
              })
            }
        },
      setAlarm: function (res) {
        //设置闹钟提醒点击事件：开始设置闹钟提醒
        var that = this;
        if (makeAlarmSet == "unset") {
          wx.showModal({
            title: '设置闹钟提醒',
            content: '是否设置闹钟提醒？',
            success: function (res) {
              if (res.confirm) {
                makeAlarmSet = "goSetDate";
                whatAlarmSet = "unset";
                that.setData({
                  alarmOuterSwiperCurrentSet: 1
                });
              }
            }
          })
        }else {
          wx.showModal({
            title: '设置闹钟提醒',
            content: '闹钟提醒已设置，是否修改？',
            success: function (res) {
              if (res.confirm) {
                makeAlarmSet = "goSetDate";
                that.setData({
                  alarmOuterSwiperCurrentSet: 1                
                });
              }
            }
          })
        }
      },
      ifDateGetSet: function (res) {
        //设置响铃日期和设置响铃时刻点击上下滑块滑动事件：阻止用户不当地上下滑动当前区域滑块
          if (makeAlarmSet == "goSetDate") {
            this.setData({
              alarmInnerSwiperCurrentSet: 0
            })
          }else if (makeAlarmSet == "goSetTime") {
            this.setData({
              alarmInnerSwiperCurrentSet: 1
            })
          }
      },
      bindDateChange: function (res) {
        //设置响铃日期点击事件
        makeAlarmSet = "goSetTime";
        timeSet = res.detail.value;
        this.setData({
          alarmInnerSwiperCurrentSet: 1
        });
        if (res.detail.value == date.getFullYear() + '-' + thisMonth + '-' + thisDate) {
          this.setData({
            startTime: thisHour + ':' + thisMinute,
          })
        }
      },
      bindTimeChange: function (res) {
        //设置响铃时刻点击事件
          makeAlarmSet = "done";
          whatAlarmSet = "goSetTime";
          timeSet += "-" + res.detail.value.split(":").join("-");
          timeSet.split("-").forEach((ele, index, origin) => {
            ele.split('')[0] == 0 ? origin[index] = ele.split('')[1] : '';
            index == 0 ? timeSet += origin[index] + " 年 " :
            index == 1 ? timeSet += origin[index] + " 月 " :
            index == 2 ? timeSet += origin[index] + " 日 " :
            index == 3 ? timeSet += origin[index] + " 时 " :
            index == 4 ? timeSet += origin[index] + " 分 " : ''
          });
          timeSet = timeSet.split(res.detail.value.split(":").join("-"))[1];
          var that = this;
          this.setData({
            alarmOuterSwiperCurrentSet: 0
          });
          setTimeout(() => {
            that.setData({
              alarmInnerSwiperCurrentSet: 0
            });
          }, 500);
          wx.showModal({
            title: '请确认当前闹钟设定',
            content: timeSet,
            success: function (res) {
              res.confirm ? (() => {
                toShowNoteCargo.alarmSet = timeSet;
                wx.showToast({
                  title: '闹钟提醒已设定',
                  image: '../images/success.png',
                  mask: true
                })
              })() : wx.showToast({
                title: '闹钟提醒未确认',
                image: '../images/error.png'
              })
            }
          })
      },
      check_delteAlarm: function (res) {
        //设置闹钟提醒、设置响铃日期、设置响铃时刻长按事件：查看当前闹钟提醒时间、清除当前闹钟提醒时间、设置反悔功能
        var that = this;
        if (makeAlarmSet == "unset") {
          if (whatAlarmSet == "done") {
            wx.showToast({
              title: '闹钟提醒已失效',
              image: '../images/error.png',
              mask: true
            })
          }else {
            wx.showToast({
              title: '未设定闹钟提醒',
              image: '../images/error.png',
              mask: true
            })
          }
        }else if (makeAlarmSet == "goSetDate") {
          this.setData({
            alarmOuterSwiperCurrentSet: 0
          });
        }else if (makeAlarmSet == "goSetTime") {
          wx.showActionSheet({
            itemList: ["回退到上一步", "取消设置闹钟提醒"],
            success: function(res) {
              if (res.tapIndex == 0) {
                makeAlarmSet = "goSetDate";
                that.setData({
                  alarmInnerSwiperCurrentSet: 0
                })
              }else {
                makeAlarmSet = whatAlarmSet;
                that.setData({
                  alarmOuterSwiperCurrentSet: 0                
                });
                setTimeout(() => {
                  that.setData({
                    alarmInnerSwiperCurrentSet: 0
                  })
                }, 500);
              }
            }
          })
        }else {
          wx.showActionSheet({
            itemList: ["查看", "清除"],
            success (res) {
              if (res.tapIndex == 0) {
                wx.showModal({
                  title: '当前闹钟设定',
                  content: timeSet,
                  showCancel: false
                })
              }else {
                makeAlarmSet = "unset";
                whatAlarmSet = "done";
                wx.showToast({
                  title: '闹钟提醒已清除',
                  image: '../images/success.png',
                  mask: true
                })
              }
            }
          });
        }
      },

    /* 保存和取消记事区 */
      saveToSend: function (res) {
        console.log(toShowNoteCargo);
        //保存记事点击事件：保存当前记事数据并向显示页发送当前记事数据
          if (toShowNoteCargo.title) {
            if (makeRecordNote == "unset" && (makeCameraNote == "unset" && toShowNoteCargo.text)) {
              wx.showModal({
                title: '保存记事',
                content: '当前未写任何记事，是否退出记事撰写？',
                success (res) {
                  res.confirm ? wx.redirectTo({
                    url: '../ShowNote/ShowNote',
                  }) : '';
                } 
              })
            }else {
              wx.showModal({
                title: '保存记事',
                content: '是否保存当前记事？',
                success(res) {
                  if (res.confirm) {
                    //若已有语音记事则永久保存语音记事，并永久清除临时文件
                      makeRecordNote == "done" ? wx.saveFile({
                        tempFilePath: toShowNoteCargo.tempRecordPath,
                        success(res) {
                          toShowNoteCargo.recordPath = res.savedFilePath;
                          toShowNoteCargo.tempRecordPath = null;
                        },
                        fail(res) {
                          wx.showModal({
                            title: '语音记事保存失败',
                            showCancel: false,
                          })
                        }
                      }) : toShowNoteCargo.tempRecordPath = null;
                    //若已有拍摄记事则永久保存拍摄记事
                      makeCameraNote == "done" ?
                        cameraNote.cameraFnChoice == "photo" ?
                          wx.saveFile({
                            tempFilePath: cameraNote.tempImagePath,
                            success(res) {
                              toShowNoteCargo.photoPath = res.savedFilePath;
                              toShowNoteCargo.cameraFnChoice = "photo";
                              cameraNote = null;
                            },
                            fail(res) {
                              wx.showModal({
                                title: '拍照记事保存失败',
                                showCancel: false,
                              })
                            }
                          }) :
                          wx.saveFile({
                            tempFilePath: cameraNote.tempVidoePath,
                            success(res) {
                              toShowNoteCargo.videoPath = res.savedFilePath;
                              toShowNoteCargo.cameraFnChoice = "shoot";
                              cameraNote = null;
                            }
                          }) : '';
                    //为当前记事创建同步缓存并跳转到记事显示页
                      wx.setStorageSync("note", toShowNoteCargo);
                      wx.redirectTo({
                        url: '../ShowNote/ShowNote',
                      });
                  } else {
                    wx.showModal({
                      title: '保存记事',
                      content: '是否继续当前记事？',
                      success(res) {
                        res.cancel ? wx.redirectTo({
                          url: '../ShowNote/ShowNote',
                        }) : '';
                      }
                    })
                  }
                }
              })
            }
          }else {
            var that = this;
            wx.showModal({
              title: '保存记事',
              content: '是否取消当前记事？',
              success (res) {
                if (res.confirm) {
                  wx.redirectTo({
                    url: '../ShowNote/ShowNote'
                  })
                }else {
                  wx.showToast({
                    title: '未写记事标题！',
                    image: '../images/error.png',
                    mask: true,
                  });
                  that.setData({
                    titleDefault: "请写标题"
                  });
                }
              }
            })
          }
      },

});