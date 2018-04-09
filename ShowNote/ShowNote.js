// ShowNote/ShowNote.js
/* 读记事页初始化 */
//获取用户本机的相对像素比
const SWT = 750 / wx.getSystemInfoSync().screenWidth;

//记事展示初始化
var tapTime; //监测相应按钮的按下时长
var anchor = [[null, null], [null, null], [null, null]]; //相应滑动操作的起始标识
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
    note: wx.getStorageSync("note") || [], //全部记事信息的渲染
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
    wx.hideLoading();
    var bgiCurrent = wx.getStorageSync("bgiCurrent") || 0;
    if (this.data.current !== bgiCurrent) this.setData({ current: bgiCurrent });
    //当记事类型为新建时则增加记事条目，记事类型为修改时则修改相应条目
    wx.removeStorageSync("item_to_edit");
    var note = wx.getStorageSync("note") || [];
    if (note.length > 0) {
      note.forEach((ele, index, origin) => {
        ele.id = index;
        ele.style = new Object();
        ele.style.opacity = 1;
        ele.style.pullOutDelete = 120;
        ele.style.pullOutMenu = 300;
        ele.style.bgc = "rgba(255, 255, 255, 0.5)";
      });
      this.setData({ note: note });
      console.log("当前记事存储状况", this.data.note);
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
    }else wx.redirectTo({ url: "../Home/Home" });
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
    if (res.type === "touchstart" && this.data.noteDisplay) {
      anchor[0] = [res.changedTouches[0].pageX, new Date().getTime()];
    } else if (res.type === "touchend"
      && this.data.noteDisplay
      && new Date().getTime() - anchor[0][1] < 1000) {
      this.hideMenu();
      var moveDistance = res.changedTouches[0].pageX - anchor[0][0];
      if (Math.abs(moveDistance) >= 750 / SWT / 3) {
        console.log("invoke changeBackgroundImage");
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
    this.fontColor = this.data.note[id].note.text.fontColor;
    setTimeout(() => {
      that.data.note[id].style.bgc = "red";
      that.data.note[id].note.text.fontColor = "#fff";
      that.setData({ note: that.data.note });
      setTimeout(() => {
        that.data.note[id].style.bgc = "rgba(255, 255, 255 ,0.4)";
        that.data.note[id].note.text.fontColor = that.fontColor;
        that.setData({ note: that.data.note });
        setTimeout(() => {
          that.data.note[id].style.bgc = "red";
          that.data.note[id].note.text.fontColor = "#fff";
          that.setData({ note: that.data.note });
          setTimeout(() => {
            that.data.note[id].style.bgc = "rgba(255, 255, 255 ,0.4)";
            that.data.note[id].note.text.fontColor = that.fontColor;
            that.setData({ note: that.data.note });
          }, 350);
        }, 350);
      }, 350);
    }, 100);
  },

  /* 读记事区 */
  //删除按钮或菜单栏拉出操作
  pullOutDel_Menu(res) {
    var that = this;
    var index = parseInt(res.currentTarget.id);
    if (res.type === "touchmove") {
      if (!this.tagA) {
        this.tagA = true;
        this.hideMenu(index);
        anchor[1] = [res.changedTouches[0].pageX, new Date().getTime()];
      } else {
        this.tagB = true;
        var pullOutDelete = this.data.note[index].style.pullOutDelete;
        var pullOutMenu = this.data.note[index].style.pullOutMenu;
        var moveDistance = (res.changedTouches[0].pageX - anchor[1][0]) * SWT;
        if ((pullOutDelete >= 0 && pullOutDelete <= 120) 
             && (moveDistance > 0 && Math.abs(moveDistance) < 120)) {
          if (pullOutMenu !== 300) {
            this.setData({ ["note[" + index + "].style.pullOutMenu"]: 300 });
          }
          this.setData({ ["note[" + index + "].style.pullOutDelete"]: 120 - Math.abs(moveDistance) });
        }
        if ((pullOutMenu >= 0 && pullOutMenu <= 300) 
             && (moveDistance < 0 && Math.abs(moveDistance) < 300)) {
          if (pullOutDelete !== 120) {
            this.setData({ ["note[" + index + "].style.pullOutDelete"]: 120 });
          }
          this.setData({ ["note[" + index + "].style.pullOutMenu"]: 300 - Math.abs(moveDistance) });
        }
      }
    } else if (res.type === "touchend" && this.tagB) {
      this.tagA = false;
      this.tagB = false;
      (function pullOutDel_Menu () {
        setTimeout(() => {
          var style = that.data.note[index].style;
          if (style.pullOutDelete > 0 && style.pullOutDelete < 80) {
            that.setData({ ["note[" + index + "].style.pullOutDelete"]: 
                                   that.data.note[index].style.pullOutDelete -= 20 });
            if (that.data.note[index].style.pullOutDelete < 0) {
              that.setData({ ["note[" + index + "].style.pullOutDelete"]: 0 });
            }
          } else {
            that.setData({ ["note[" + index + "].style.pullOutDelete"]:
              that.data.note[index].style.pullOutDelete += 20
            });
            if (that.data.note[index].style.pullOutDelete > 120) {
              that.setData({ ["note[" + index + "].style.pullOutDelete"]: 120 });
            }
          }
          if (style.pullOutMenu > 0 && style.pullOutMenu < 200) {
            that.setData({ ["note[" + index + "].style.pullOutMenu"]:
              that.data.note[index].style.pullOutMenu -= 50
            });
            if (that.data.note[index].style.pullOutMenu < 0) {
              that.setData({ ["note[" + index + "].style.pullOutMenu"]: 0 });
            }
          } else {
            that.setData({ ["note[" + index + "].style.pullOutMenu"]:
              that.data.note[index].style.pullOutMenu += 50
            });
            if (that.data.note[index].style.pullOutMenu > 300) {
              that.setData({ ["note[" + index + "].style.pullOutMenu"]: 300 });
            }
          }
          var conditionA = (that.data.note[index].style.pullOutMenu === 0 ||
                                      that.data.note[index].style.pullOutMenu === 300);
          var conditionB = (that.data.note[index].style.pullOutDelete === 0 ||
                                      that.data.note[index].style.pullOutDelete === 120)
          if (!(conditionA && conditionB)) pullOutDel_Menu();
        }, 5)
      })();
    }
  },
  //删除相应记事(注：每次删除完成后都会检测当前是否仍有记事，没有则将返回写记事页)
  deleteNote(res) {
    console.log("invoke deleteNote");
    var index = res.currentTarget.id;
    index = index.match(/\d+/g)[0];
    var that = this;
    this.hideMenu();
    (function tips () {
      setTimeout(() => {
        if (that.data.note[index].style.pullOutDelete !== 120
          || that.data.note[index].style.pullOutMenu !== 300) {
          tips();
        } else {
          that.fontColor = that.data.note[index].note.text.fontColor;
          that.data.note[index].style.bgc = "#f00";
          that.data.note[index].note.text.fontColor = "#fff";
          that.setData({ note: that.data.note });
        }
      }, 10);
    })()
    wx.showModal({
      title: "读记事",
      content: "是否删除本条记事？",
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: "开始删除本记事",
            mask: true
          });
          var tag = 0;
          var note = that.data.note;
          if (note[index].note.record.length > 0) {
            note[index].note.record.forEach((ele, id, origin) => {
              wx.removeSavedFile({
                filePath: ele.url,
                complete(res) { if (id === origin.length - 1) tag += 1; }
              });
            });
          } else tag += 1;
          if (note[index].note.photo.length > 0) {
            note[index].note.photo.forEach((ele, id, origin) => {
              wx.removeSavedFile({
                filePath: ele.url,
                complete(res) { if (id === origin.length - 1) tag += 1; }
              });
            });
          } else tag += 1;
          if (note[index].note.video.length > 0) {
            wx.removeSavedFile({
              filePath: note[index].note.video,
              complete(res) { tag += 1; }
            })
          } else tag += 1;
          (function deleting () {
            if (tag < 3) {
              setTimeout(() => {
                deleting();
              }, 20)
            }else {
              that.data.note[index].style.opacity -= 0.05;
              that.setData({ note: that.data.note });
              setTimeout(() => {
                if (that.data.note[index].style.opacity <= 0) {
                  wx.hideLoading();
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
                } else deleting();
              }, 25)
            }
          })();
        } else {
          that.data.note[index].style.pullOutDelete = 120;
          that.setData({ note: that.data.note });
        }
      },
      complete(res) {
        that.data.note[index].style.bgc = "rgba(255, 255, 255 ,0.5)";
        that.data.note[index].note.text.fontColor = that.fontColor;
        that.setData({ note: that.data.note });
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
      if (parseInt(id) && !this.data.note[parseInt(id)].style.pullOutMenu) {
        if (res.touches[0].pageX * SWT < 450) this.hideMenu();
      } else this.hideMenu();
      //当删除键和记事查看菜单都未被拉出且在记事标题展示状态时，默认点击当前条目为选择修改记事
      if (parseInt(id) < this.data.note.length) {
        var style = this.data.note[id].style
        if ((style.pullOutDelete === 120 && style.pullOutMenu === 300) && this.data.noteDisplay) {
          this.data.note[id].style.bgc = "#f00";
          this.fontColor = this.data.note[id].note.text.fontColor;
          this.data.note[id].note.text.fontColor = "#fff";
          this.setData({ note: this.data.note });
          wx.showModal({
            title: "读记事",
            content: "是否修改当前记事？",
            success(res) {
              that.data.note[id].style.bgc = "rgba(255, 255, 255 ,0.5)";
              that.data.note[id].note.text.fontColor = that.fontColor;
              that.setData({ note: that.data.note });
              if (res.confirm) {
                wx.setStorageSync("item_to_edit", id);
                wx.redirectTo({ url: "../CreateNote/CreateNote" });
              }
            }
          });
        }
      }
    }
  },
  //获取相应记事内容并展示
  getContent(res) {
    var label = res.currentTarget.id;
    var index = label.match(/\d+/g)[0];
    var note = this.data.note[index].note;
    label = label.slice(0, label.indexOf("_"));
    var condition = note[label].length > 0;
    if (label === "text") condition = note[label].content.length > 0;
    if (condition) {
      wx.hideToast();
      this.hideMenu();
      this.setData({ getUseAccess: false });
      this.setData({
        [label + "Display"]: note[label],
        noteDisplay: false
      });
      // 预先渲染相应条目下可以展示的记事类型
      if (note["text"].content.length > 0) { this.setData({ text: note["text"] }); }
      if (note["record"].length > 0) this.setData({ playback: note["record"] });
      if (note["photo"].length > 0) this.setData({ img: note["photo"] });
      if (note["video"].length > 0) this.setData({ videoSrc: note["video"] });
      var whichCanShow = []; //可以展示的记事类型
      if (note["text"].content.length > 0) whichCanShow.push("textDisplay");
      for (let prop in note) {
        if (note[prop].length > 0 && prop !== "title") whichCanShow.push(prop + "Display");
      }
      this.whichCanShow = whichCanShow;
      this.noteIndex = index;
    } else {
      switch (label) {
        case "text": var content = "文本记事"; break;
        case "record": var content = "语音记事"; break;
        case "photo": var content = "图片记事"; break;
        case "video": var content = "视频记事"; break;
      }
      wx.showToast({
        title: "该项无" + content,
        image: "../images/warning.png"
      });
    }
  },
  //同条目下不同记事间快速跳转
  jumpToAnother(res) {
    if (!this.data.getUseAccess) {
      var note = this.data.note[this.noteIndex].note;
      if (res.type === "touchstart") {
        var whichShowNow; //正在展示的记事类型
        for (let prop in this.data) {
          let condition = (/Display/g.test(prop) && prop !== "noteDisplay") && this.data[prop];
          if (condition) { whichShowNow = prop; break; }
        }
        this.whichShowNow = whichShowNow;
        anchor[2] = [res.touches[0].pageY, new Date().getTime()];
      } else if (res.type === "touchend") {
        if (this.timerQueue instanceof Array) {
          innerAudioContext.stop();
          for (let i = this.timerQueue.length - 1; i > 0; i--) clearTimeout(this.timerQueue[i]);
          this.data.playback.forEach((ele, id, origin) => {
            if (ele.opacity !== 1) ele.opacity = 1;
          });
          this.setData({ playback: this.data.playback });
        }
        var moveDistance = (res.changedTouches[0].pageY - anchor[2][0]) * SWT;
        if (Math.abs(moveDistance) >= 375 && new Date().getTime() - anchor[2][1] < 2500) {
          var whichShowNow = this.whichShowNow;
          var whichCanShow = this.whichCanShow;
          var index = whichCanShow.indexOf(whichShowNow);
          this.setData({ [whichShowNow]: false });
          if (moveDistance > 0) {
            if (!!whichCanShow[index + 1]) { //判断下一种记事类型是否存在
              this.setData({ [whichCanShow[index + 1]]: true });
            } else {
              this.setData({
                noteDisplay: true,
                getUseAccess: true
              });
            }
          } else {
            if (!!whichCanShow[index - 1]) { //判断上一种记事类型是否存在
              this.setData({ [whichCanShow[index - 1]]: true });
            } else {
              this.setData({
                noteDisplay: true,
                getUseAccess: true
              });
            }
          }
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
      wx.showLoading({
        title: "正在进入写记事",
        mask: true,
      });
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
    unhiddenQueue.forEach(ele => {
      if (ele.tag === "pullOutDelete") {
        (function hideDel () {
          setTimeout(() => {
            that.setData({
              ["note[" + ele.index + "]style.pullOutDelete"]:
              that.data.note[ele.index].style.pullOutDelete += 20
            });
            if (that.data.note[ele.index].style.pullOutDelete >= 120) {
              that.setData({ ["note[" + ele.index + "]style.pullOutDelete"]: 120 });
            }else hideDel();
          }, 5)
        })()
      }
      if (ele.tag === "pullOutMenu") {
        (function hideMenu() {
          setTimeout(() => {
            that.setData({
              ["note[" + ele.index + "]style.pullOutMenu"]:
              that.data.note[ele.index].style.pullOutMenu += 50
            });
            if (that.data.note[ele.index].style.pullOutMenu >= 300) {
              that.setData({ ["note[" + ele.index + "]style.pullOutMenu"]: 300 });
            } else hideMenu();
          }, 5)
        })()
      }
    });
  },

});