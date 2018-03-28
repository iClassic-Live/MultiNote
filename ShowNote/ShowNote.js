// ShowNote/ShowNote.js

/* 读记事页初始化 */

//获取用户本机的相对像素比
const SWT = 750 / wx.getSystemInfoSync().screenWidth;

//用于监测相应滑动操作起始的标识
var lockA = true; //获取滑动起始点信息的锁
var lockB = true; //滑动达到指定值后的锁

//记事展示初始化
var tapTime; //监测相应按钮的按下时长
var intervalQueue = []; //定时器ID阵列，获取有可能无法正常清除的定时器的ID;
var anchor = ["changeBGI"]; //相应滑动操作的起始标识
var tag = false; //是否进行了相应删除按钮或菜单栏拉出操作的标识
//语音记事初始化
const innerAudioContext = wx.createInnerAudioContext(); //创建并返回内部 audio 上下文

/* 页面构造器：页面功能初始化 */
Page({

  /* 页面默认功能 */

  /* 页面的初始数据 */
  data: {

    //背景图切换功能初始化
    duration: 0, //背景图滑块切换的过渡时间
    current: wx.getStorageSync("bgiCurrent") || 0, //背景图所在滑块序号
    bgiQueue: getApp().globalData.bgiQueue, //背景图地址队列

    //记事检索和记事创建功能使用权限初始化
    getUseAccess: true, //当正在查阅某项记事时记事检索和记事创建功能将不允许能使用

    //记事检索功能初始化
    searchNote: "记事检索", //输入框为空时的提示内容
    resultKey: null, //检索信息的key值
    result: [], //记事检索结果汇总，默认为空

    //记事列表展示功能初始化
    note: wx.getStorageSync("note"), //全部记事信息的渲染
    noteDisplay: true, //记事区Display，默认展示，记事内容查看或记事检索时隐藏
    textDisplay: false, //文本记事Display，默认隐藏
    text: null, //文本记事内容，默认为空
    recordDisplay: false, //语音记事Display，默认隐藏
    playback: null, //语音记事内容，默认为空
    photoDisplay: false,  //照相记事Display，默认隐藏
    img: null, //照相记事内容，默认为空
    videoDisplay: false, //视频记事Display，默认隐藏 
    videoSrc: null, //视频播放地址，默认为空    

    //记事创建功能更初始化
    createNote: "新建记事", //新建记事按钮字样

  },

  /* 生命周期函数--监听页面加载 */
  onLoad(res) {
    console.log("ShowNote onLoad");
    var bgiCurrent = wx.getStorageSync("bgiCurrent") || 0;
    if (this.data.current !== bgiCurrent) this.setData({ current: bgiCurrent });
    //当记事类型为新建时则增加记事条目，记事类型为修改时则修改相应条目
    var note = wx.getStorageSync("note") || [];
    var noting = wx.getStorageSync("noting");
    if (!!noting) {
      wx.removeStorageSync("noting");
      if (noting.info.noteType === "new") {
        note.push(noting);
      } else if (noting.info.noteType === "edit") {
        note[noting.id] = noting;
      } else if (!note) wx.redirectTo({ url: "../Home/Home" });
    }
    note.forEach((ele, index, origin) => {
      ele.id = index;
      ele.style.opacity = 1;
      ele.style.pullOutDelete = 120;
      ele.style.pullOutMenu = 300;
      ele.style.bgc = "rgba(255, 255, 255, 0.4)";
    });
    wx.setStorageSync("note", note);
    this.setData({ note: note });
    console.log("当前记事存储状况", wx.getStorageSync("note"));
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

    //在this中创建并置空记事索引
    this.noteIndex = -1;
  },

  /* 生命周期函数--监听页面显示 */
  onShow(res) {
    console.log("ShowNote onShow");
    var bgiCurrent = wx.getStorageSync("bgiCurrent");
    if (this.data.current === bgiCurrent) {
      if (this.data.duration !== 500) this.setData({ duration: 500 });
    } else this.setData({ current: bgiCurrent });
  },

  /* 生命周期函数--监听页面初次渲染完成 */
  onReady(res) {
    console.log("ShowNote onReady");
    if (this.data.duration !== 500) this.setData({ duration: 500 });
  },

  /* 生命周期函数--监听页面隐藏 */
  onHide(res) {
    console.log("ShowNote onHide");
  },

  /* 生命周期函数--监听页面卸载 */
  onUnload(res) {
    console.log("ShowNote onUnload");
  },

  /* 自定义用户交互逻辑 */

  /* 背景图切换区 */
  //背景图切换
  changeBackgroundImage(res) {
    if (res.changedTouches instanceof Array && anchor[0] === "changeBGI" && this.data.noteDisplay) {
      if (lockA) {
        lockA = false;
        anchor[1] = res.changedTouches[0].pageX;
      }
      var moveDistance = res.changedTouches[0].pageX - anchor[1];
      if ((!lockA && lockB) && Math.abs(moveDistance) >= 750 / SWT / 3) {
        console.log("invoke changeBackgroundImage");
        lockB = false;
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

  /* 记事检索区 */
  //记事检索框的聚焦、键入、失焦操作
  searchNote(res) {
    if (res.type === "focus") { //记事检索框聚焦时关闭未关闭的记事的删除和菜单栏、
      //隐藏记事展示，开启检索功能
      this.hideMenu();
      this.setData({
        bgc: "rgba(255, 255, 255, 0.4)",
        noteDisplay: false
      });
      var that = this;
      setTimeout(() => {
        if (!that.data.noteDisplay) {
          that.setData({
            bgc: "rgba(255, 255, 255, 0.4)",
            noteDisplay: false
          });
        }
      }, 100);
    } else if (res.type === "input") { //记事检索框正在键入时展示与键入值相关的记事条目标题
      if (this.data.noteDisplay) {
        //隐藏记事展示，开启检索功能
        this.data.note.forEach((ele, index, origin) => {
          this.data.note[index].style.pullOutDelete = 120;
          this.data.note[index].style.pullOutMenu = 300;
        });
        this.setData({
          bgc: "rgba(255, 255, 255, 0.4)",
          noteDisplay: false,
          note: this.data.note
        });
      }
      //使用简单的正则表达式对记事进行相应检索
      if (!!res.detail.value) {
        var reg = /\s/g;
        reg.compile(res.detail.value, "g");
        var result = [];
        this.data.note.forEach((ele, index, origin) => {
          if (ele.note.title.match(reg)) {
            result.push({
              id: ele.id,
              style: ele.style,
              note: ele.note
            });
          }
        });
        this.setData({ result: result });
      } else this.setData({ result: [] });
    } else if (res.type === "blur") { //记事检索功能失焦时关闭记事检索功能并恢复记事展示
      this.setData({
        bgc: "none",
        noteDisplay: true,
        resultKey: null,
        result: []
      });
    }
  },
  //点击相应记事检索结果的时候返回相应记事条目的位置
  gotoResult(res) {
    var that = this;
    var id = res.currentTarget.id;
    id = id.match(/\d+/g)[0];
    if (this.data.resultScrolling) {
      this.setData({
        noteDisplay: true,
        resultKey: null,
        result: []
      });
    };
    this.fontColor = this.data.note[id].style.fontColor;
    setTimeout(() => {
      that.data.note[id].style.bgc = "red";
      that.data.note[id].style.fontColor = "#fff";
      that.setData({ note: that.data.note });
      setTimeout(() => {
        that.data.note[id].style.bgc = "rgba(255, 255, 255 ,0.4)";
        that.data.note[id].style.fontColor = that.fontColor;
        that.setData({ note: that.data.note });
        setTimeout(() => {
          that.data.note[id].style.bgc = "red";
          that.data.note[id].style.fontColor = "#fff";
          that.setData({ note: that.data.note });
          setTimeout(() => {
            that.data.note[id].style.bgc = "rgba(255, 255, 255 ,0.4)";
            that.data.note[id].style.fontColor = that.fontColor;
            that.setData({ note: that.data.note });
          }, 350);
        }, 350);
      }, 350);
    }, 100);
  },

  /* 读记事区 */
  /* 同事件多复合操作：
     1. 解开相应操作的锁
     2. 若检测到菜单或删除按钮拉出操作则对相应菜单或删除按钮：
        1) 当拉出已到达阈值则执行弹出操作
        2) 当拉出未达到阈值则执行弹回操作
     3. 重置滑动操作的起始标识到切换背景图状态
     4. 重置同条目下记事间快速跳转的滑动次数 */
  tapEnd(res) {
    console.log("invoke tapEnd");
    var that = this;
    var index = parseInt(res.currentTarget.id);
    if (((index || index === 0) && tag) && this.data.noteDisplay) {
      tag = false;
      var array = [];
      intervalQueue.forEach((ele, id, origin) => {
        clearInterval(ele);
        array.push(ele);
      });
      array.forEach((ele, id, origin) => {
        intervalQueue.splice(origin.indexOf(ele), 1);
      });
      var timer = setInterval(() => {
        var style = that.data.note[index].style;
        if (style.pullOutDelete > 0 && style.pullOutDelete < 80) {
          that.data.note[index].style.pullOutDelete -= 20;
          if (that.data.note[index].style.pullOutDelete <= 0) {
            that.data.note[index].style.pullOutDelete = 0;
          }
        } else {
          that.data.note[index].style.pullOutDelete += 20;
          if (that.data.note[index].style.pullOutDelete >= 120) {
            that.data.note[index].style.pullOutDelete = 120;
          }
        }
        if (style.pullOutMenu > 0 && style.pullOutMenu < 200) {
          that.data.note[index].style.pullOutMenu -= 50;
          if (that.data.note[index].style.pullOutMenu <= 0) {
            that.data.note[index].style.pullOutMenu = 0;
          }
          that.setData({ note: that.data.note });
        } else {
          that.data.note[index].style.pullOutMenu += 50;
          if (that.data.note[index].style.pullOutMenu >= 300) {
            that.data.note[index].style.pullOutMenu = 300;
          }
        }
        that.setData({ note: that.data.note });
        if ((that.data.note[index].style.pullOutMenu === 0 ||
          that.data.note[index].style.pullOutMenu === 300) &&
          (that.data.note[index].style.pullOutDelete === 0 ||
            that.data.note[index].style.pullOutDelete === 120)) {
          clearInterval(timer);
          console.log("interval in tapEnd has been deleted");
        }
      }, 5);
      intervalQueue.push(timer);
    }
    if (this.data.noteDisplay) this.slideTimes = 0;
    lockA = true;
    lockB = true;
    anchor = ["changeBGI"];
  },
  //菜单栏拉出操作
  tapMove(res) {
    var index = res.currentTarget.id;
    if (lockA) {
      console.log("invoke tapMove");
      lockA = !lockA;
      anchor = ["pullOut", res.touches[0].pageX];
      this.hideMenu(index);
    }
    if (anchor[0] === "pullOut") {
      tag = true;
      var pullOutDelete = this.data.note[index].style.pullOutDelete;
      var pullOutMenu = this.data.note[index].style.pullOutMenu;
      var moveDistance = (res.changedTouches[0].pageX - anchor[1]) * SWT;
      if ((pullOutDelete >= 0 && pullOutDelete <= 120) && (moveDistance > 0 && Math.abs(moveDistance) < 120)) {
        if (pullOutMenu !== 300) this.data.note[index].style.pullOutMenu = 300;
        this.data.note[index].style.pullOutDelete = 120 - Math.abs(moveDistance);
      }
      if ((pullOutMenu >= 0 && pullOutMenu <= 300) && (moveDistance < 0 && Math.abs(moveDistance) < 300)) {
        if (pullOutDelete !== 120) this.data.note[index].style.pullOutDelete = 120;
        this.data.note[index].style.pullOutMenu = 300 - Math.abs(moveDistance);
      }
      this.setData({ note: this.data.note });
    }
  },
  //删除相应记事(注：每次删除完成后都会检测当前是否仍有记事，没有则将返回写记事页)
  deleteNote(res) {
    console.log("invoke deleteNote");
    var index = res.currentTarget.id;
    index = index.match(/\d+/g)[0];
    var that = this;
    this.hideMenu();
    wx.showModal({
      title: "读记事",
      content: "是否删除本条记事？",
      success(res) {
        if (res.confirm) {
          var timer = setInterval(() => {
            that.data.note[index].style.opacity -= 0.1;
            that.setData({ note: that.data.note });
          }, 50);
          setTimeout(() => {
            clearInterval(timer);
            var note = that.data.note;
            note.splice(index, 1);
            if (!!note.length) {
              note.forEach((ele, index, origin) => {
                if (ele.id !== index) {
                  ele.id = index;
                  ele.style.marginTop = index * 9.5;
                }
              });
            }
            that.setData({ note: note });
            wx.setStorageSync("note", note);
            wx.showToast({
              title: "当前记事已删除",
              image: "../images/success.png",
              mask: true,
              complete(res) {
                setTimeout(() => {
                  if (!note.length) {
                    wx.showModal({
                      title: "读记事",
                      content: "缓存中已无任何记事，将返回写记事！",
                      showCancel: false,
                      complete(res) { wx.redirectTo({ url: "../CreateNote/CreateNote" }); }
                    })
                  }
                }, 1500);
              }
            });
          }, 500);
        } else {
          that.data.note[index].style.pullOutDelete = 750;
          that.setData({ note: that.data.note });
        }
      }
    });
  },
  //取消滑动拉出的删除按键或菜单栏的展示
  cancel_editNote(res) {
    console.log("invoke cancel_editNote");
    var id = res.currentTarget.id;
    var that = this;
    if (this.data.noteDisplay) {
      //当删除键或记事查看菜单已被拉出时取消操作拉出操作
      this.hideMenu();
      //当删除键和记事查看菜单都未被拉出且在记事标题展示状态时，默认点击当前条目为选择修改记事
      if (parseInt(id) < this.data.note.length) {
        var style = this.data.note[id].style
        if ((style.pullOutDelete === 120 && style.pullOutMenu === 300) && this.data.noteDisplay) {
          var that = this;
          this.data.note[id].style.bgc = "red";
          this.fontColor = this.data.note[id].style.fontColor;
          this.data.note[id].style.fontColor = "#fff";
          this.setData({ note: this.data.note });
          wx.showModal({
            title: "读记事",
            content: "是否修改当前记事？",
            success(res) {
              that.data.note[id].style.bgc = "rgba(255, 255, 255 ,0.4)";
              that.data.note[id].style.fontColor = that.fontColor;
              that.setData({ note: that.data.note });
              if (res.confirm) {
                that.data.note[id].info.noteType = "edit";
                wx.setStorageSync("noting", that.data.note[id]);
                wx.redirectTo({ url: "../CreateNote/CreateNote" });
              }
            }
          });
        }
      }
    }
  },
  //获取相应记事内容并展示
  getContent(res, sign) {
    var label = res.currentTarget.id;
    var index = label.match(/\d+/g)[0];
    var note = this.data.note[index].note;
    label = label.slice(0, label.indexOf("_"));
    if (note[label].length > 0) {
      wx.hideToast();
      this.hideMenu();
      this.setData({ getUseAccess: false });
      if (this.data.contentDuration) this.setData({ contentDuration: 0 });
      if (this.data.noteDisplay) this.setData({ noteDisplay: false });
      this.setData({ [label + "Display"]: note[label] });
      var that = this;
      function setData(target) { that.setData({ [target]: note[label] }); }
      if (label === "text") {
        var style = this.data.note[index].style
        setData("text");
        this.setData({
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          fontColor: style.fontColor
        });
      }
      if (label === "record") setData("playback");
      if (label === "photo") setData("img");
      if (label === "video") setData("videoSrc");
      this.noteIndex = index;
    } else {
      var content;
      switch (label) {
        case "text": content = "文本记事"; break;
        case "record": content = "语音记事"; break;
        case "photo": content = "图片记事"; break;
        case "video": content = "视频记事"; break;
      }
      if (!sign) {
        wx.showToast({
          title: "该项无" + content,
          image: "../images/warning.png"
        });
      }
    }
  },
  //同条目下不同记事间快速跳转
  jumpToAnother(res) {
    if (res.type === "touchstart" && this.noteIndex !== -1) {
      anchor = ["jumpToAnother", res.touches[0].pageY];
      var whichDisplay;
      var whichCanShow = [];
      var note = this.data.note[this.noteIndex].note;
      if (this.data.textDisplay) whichDisplay = "text";
      if (this.data.recordDisplay) whichDisplay = "record";
      if (this.data.photoDisplay) whichDisplay = "photo";
      if (this.data.videoDisplay) whichDisplay = "video";
      if (note.text.length > 0) whichCanShow.push("text");
      if (note.record.length > 0) whichCanShow.push("record");
      if (note.photo.length > 0) whichCanShow.push("photo");
      if (note.video.length > 0) whichCanShow.push("video");
      this.whichDisplay = whichDisplay;
      this.whichCanShow = whichCanShow;
    }else if ((anchor[0] === "jumpToAnother" && this.whichCanShow.length > 0)
              && res.type === "touchend") {
      var moveDistance = (res.changedTouches[0].pageY - anchor[1]) * SWT;
      if (Math.abs(moveDistance) > 200) {
        console.log("invoke jumpToAnother");
        var that = this;
        var note = this.data.note[this.noteIndex].note;
        var whichCanShow = this.whichCanShow;
        var index = whichCanShow.indexOf(this.whichDisplay);
        function getContent(ele) {
          function setData(target) { that.setData({ [target]: note[ele] }); }
          that.setData({ [ele+ "Display"]: true });
          switch (ele) {
            case "text":
              var style = that.data.note[that.noteIndex].style;
              setData("text");
              that.setData({
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                fontColor: style.fontColor
              });
            case "record": setData("playback"); break;
            case "photo": setData("img"); break;
            case "video": setData("videoSrc"); break
          }
        }
        this.setData({ [this.whichDisplay + "Display"]: false });
        if (moveDistance > 0 && !!whichCanShow[index + 1]) {
          getContent(whichCanShow[index + 1]);
        } else if (moveDistance < 0 && !!whichCanShow[index - 1]) {
          getContent(whichCanShow[index - 1]);
        } else {
          this.setData({
            noteDisplay: true,
            getUseAccess: true
          });
        }
      }
    }
  },
  //文本记事操作：复制文本内容或退出查看
  textCheck(res) {
    console.log("invoke textCheck");
    if (res.type === "longpress") {
      var that = this;
      wx.setClipboardData({
        data: that.data.text,
        success: function (res) {
          wx.getClipboardData({
            success: function (res) {
              wx.showToast({
                title: "复制文本成功",
                image: "../images/success.png",
                mask: true
              });
            }
          });
        }
      });
    } else if (res.type === "tap") {
      this.noteIndex = -1;
      this.setData({
        noteDisplay: true,
        textDisplay: false,
        getUseAccess: true
      });
    }
  },
  //语音记事操作：返听相应条目下的相应语音或退出查看
  recordCheck(res) {
    console.log("invoke recordCheck");
    var that = this;
    var index = res.currentTarget.id;
    if (!!index) {
      index = index.match(/\d+/g)[0];
      innerAudioContext.stop();
      innerAudioContext.autoplay = true;
      innerAudioContext.src = this.data.playback[index].url;
      this.data.playback[index].opacity = 0.5;
      this.setData({
        playback: this.data.playback,
        noteIndex: index
      });
      setTimeout(() => {
        that.data.playback[index].opacity = 1;
        that.setData({ playback: that.data.playback });
        setTimeout(() => {
          that.data.playback[index].opacity = 0.5;
          that.setData({ playback: that.data.playback });
          setTimeout(() => {
            that.data.playback[index].opacity = 1;
            that.setData({ playback: that.data.playback });
          }, 250);
        }, 250);
      }, 250);
    } else {
      innerAudioContext.stop();
      this.noteIndex = -1;
      this.setData({
        playback: null,
        noteDisplay: true,
        recordDisplay: false,
        getUseAccess: true
      });
    }
  },
  //图片记事操作：查看相应条目下的相应图片或退出查看
  photoCheck(res) {
    console.log("invoke photoCheck")
    if (res.type === "longpress") {
      var index = res.currentTarget.id;
      index = index.match(/\d+/g)[0];
      var that = this;
      wx.showModal({
        title: "读记事",
        content: "是否保存本张图片到手机相册？",
        success(res) {
          if (res.confirm) {
            wx.saveImageToPhotosAlbum({
              filePath: that.data.img[index].url,
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
          }
        }
      });
    } else if (res.type === "tap") {
      this.noteIndex = -1;
      this.setData({
        img: null,
        noteDisplay: true,
        photoDisplay: false,
        getUseAccess: true
      });
    }
  },
  //录像记事操作：退出查看、保存到手机相册
  videoCheck(res) {
    console.log("invoke videoCheck");
    var that = this;
    wx.showActionSheet({
      itemList: ["退出查看", "保存视频到手机相册"],
      success: function (res) {
        if (!res.tapIndex) {
          that.noteIndex = -1;
          that.setData({
            noteDisplay: true,
            videoDisplay: false,
            videoSrc: null,
            getUseAccess: true
          });
        } else {
          wx.getSetting({
            success(res) {
              !res.authSetting["scope.writePhotosAlbum"] ?
                wx.authorize({ scope: "scope.writePhotosAlbum" }) : "";
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
            }
          });
        }
      }
    });
  },

  /* 新建记事区 */
  //新建记事按钮：按下则跳转到写记事页
  createNote(res) {
    this.hideMenu();
    var num = wx.getStorageSync("How Many Notes Can I Create");
    if (!(num instanceof Array)) {
      var num = Math.floor(wx.getSystemInfoSync().windowHeight * SWT * 0.85 / 73.5);
      wx.setStorageSync("How Many Notes Can I Create", ["unchanged", num]);
      wx.showToast({
        title: "缓存已被清空",
        image: "../images/error.png"
      });
    }
    if (this.data.note.length < num[1]) {
      wx.redirectTo({ url: "../CreateNote/CreateNote" });
    } else {
      wx.showModal({
        title: "读记事",
        content: "记事条目已达上限！",
        showCancel: false
      });
    }
  },


  //当前页API: 以动画形式隐藏所有已拉出的菜单栏
  hideMenu(item) {
    var that = this;
    var unhiddenQueue = [];
    this.data.note.forEach((ele, index) => {
      if (parseInt(item) !== index) {
        if (ele.style.pullOutDelete < 120) unhiddenQueue.push({ tag: "pullOutDelete", index: index });
        if (ele.style.pullOutMenu < 300) unhiddenQueue.push({ tag: "pullOutMenu", index: index });
      }
    });
    function clearIntervalQueue() {
      var deletedIntervalQueue = [];
      intervalQueue.forEach((ele, id, origin) => {
        clearInterval(ele);
        deletedIntervalQueue.push(ele);
      });
      deletedIntervalQueue.forEach((ele, id, origin) => {
        intervalQueue.splice(origin.indexOf(ele), 1);
      });
    }
    unhiddenQueue.forEach(ele => {
      if (ele.tag === "pullOutDelete") {
        clearIntervalQueue();
        var timer1 = setInterval(() => {
          that.data.note[ele.index].style.pullOutDelete += 20;
          if (that.data.note[ele.index].style.pullOutDelete >= 120) {
            that.data.note[ele.index].style.pullOutDelete = 120;
            clearInterval(timer1);
            console.log("interval for hiding Del button has been deleted");
          }
          that.setData({ note: that.data.note });
        }, 5);
        intervalQueue.push(timer1);
      }
      if (ele.tag === "pullOutMenu") {
        clearIntervalQueue();
        var timer2 = setInterval(() => {
          that.data.note[ele.index].style.pullOutMenu += 50;
          if (that.data.note[ele.index].style.pullOutMenu >= 300) {
            that.data.note[ele.index].style.pullOutMenu = 300;
            clearInterval(timer2);
            console.log("interval for hiding Menu has been deleted");
          }
          that.setData({ note: that.data.note });
        }, 5);
        intervalQueue.push(timer2);
      }
    });
  },

});