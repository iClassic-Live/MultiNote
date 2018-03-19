// ShowNote/ShowNote.js

/* 读记事页初始化 */

//跨域传值载体初始化
var fromCreateNoteCargo; //接收来自写记事页的数据的载体

//记事展示初始化
var tapTime; //监测相应按钮的按下时长
var lock = true; //当相应记事的条目检测到滑动操作的时候加锁以获取滑动起始位置的锚点

//语音记事初始化
const innerAudioContext = wx.createInnerAudioContext(); //创建并返回内部 audio 上下文

//同条目下不同记事类型快速跳转初始化
var jumpNow = true; //监测当前是否正在进行同条目下不同记事类型间跳转，进入跳转时为false，否则为true

/* 页面构造器：页面功能初始化 */
Page({

  /* 页面默认功能 */

  /* 页面的初始数据 */
  data: {

    //主功能区、录像记事查看组件切换功能初始化，默认主功能区启动，其他功能区待命
    mainFnDisplay: true,
    videoDisplay: false,


    //主功能区功能初始化
    upperMaskHeight: 0, //上部蒙层高度
    bottomeMaskHeight: 0, //下部蒙层高度

    searchNote: "记事检索", //输入框为空时的提示内容
    resultKey: null, //检索信息的key值
    maskHeight: 6.7, //记事检索区背部的蒙层高度，未进入检索时为6.7，进入检索后为100
    result: [], //记事检索结果汇总，默认为空

    note: wx.getStorageSync("newNote"), //全部记事信息的渲染
    noteIndex: null,
    noteDisplay: true, //记事区Display，默认展示，其他记事查看或记事检索时隐藏
    textDisplay: false, //文本记事Display，默认隐藏
    text: null, //文本记事内容，默认为空
    recordDisplay: false, //语音记事Display，默认隐藏
    playback: null, //语音记事内容，默认为空
    photoDisplay: false,  //照相记事Display，默认隐藏
    img: null, //照相记事内容，默认为空
    anchor: 0, //滑动操作的锚点，滑动时该数据会被渲染
    SWT: null,

    createNote: "新建记事", //新建记事按钮字样\xa0为空格符


    //录像记事查看组件功能初始化
    videoSrc: null, //视频播放地址，默认为空

  },

  /* 生命周期函数--监听页面加载 */
  onLoad: function (options) {
    console.log("ShowNote onLoad");
    //当记事类型为新建时则增加记事条目，记事类型为修改时则修改相应条目
    var note = wx.getStorageSync("note");
    var newNote = wx.getStorageSync("newNote");
    if (!!newNote) wx.removeStorageSync("newNote");
    var editNote = wx.getStorageSync("editNote");
    if (!!editNote) wx.removeStorageSync("editNote");
    if (!!newNote) {
      if (!note) note = [];
      fromCreateNoteCargo = newNote;
      note.push(fromCreateNoteCargo);
    } else if (!!editNote) {
      fromCreateNoteCargo = editNote;
      note[fromCreateNoteCargo.id] = fromCreateNoteCargo;
    } else if (!note) wx.redirectTo({ url: "../Home/Home" });
    note.forEach((ele, index, origin) => {
      ele.id = index;
      ele.style = {
        opacity: 1,
        pullOutDelete: 750,
        pullOutMenu: 450,
        bgc: "none"
      }
    });
    wx.setStorageSync("note", note);
    this.setData({ note: note });
    // console.log("当前记事存储状况", wx.getStorageSync("note"));
    /* 使用定时器进行扫描操作：
      1. 监测当前记事是否已经超过15条，有则开启滚动查看功能，否则关闭；
      2. 监测当前是否在查看记事，是则屏蔽记事检索功能和新建记事功能，并置记事条目索引为空，否则取消屏蔽 */
    var timer = setInterval(() => {
      if (note.length >= 15) {
        if (!this.data.noteScrolling) this.setData({ noteScrolling: true });
      } else {
        if (this.data.noteScrolling) this.setData({ noteScrolling: false });
      }
      if (!this.data.noteDisplay) {
        if (this.data.upperMaskHeight !== 7.6) this.setData({ upperMaskHeight: 7.6 });
        if (this.data.bottomMaskHeight !== 8) this.setData({ bottomMaskHeight: 8 });
      } else {
        if (this.data.upperMaskHeight !== 0) this.setData({ upperMaskHeight: 0 });
        if (this.data.bottomMaskHeight !== 0) this.setData({ bottomMaskHeight: 0 });
      }
    }, 10);
  },

  /* 生命周期函数--监听页面显示 */
  onShow: function () {
    console.log("ShowNote onShow");
    var that = this;
    setInterval(() => {
      var mgt = wx.getSystemInfoSync().windowHeight * that.data.SWT * 0.07;
      if (that.data.mgt !== mgt) that.setData({ mgt: mgt });
    }, 10);
  },

  /* 生命周期函数--监听页面初次渲染完成 */
  onReady: function () {
    console.log("ShowNote onReady");
    this.setData({ SWT: 750 / wx.getSystemInfoSync().screenWidth });
  },

  /* 生命周期函数--监听页面隐藏 */
  onHide: function () {
    console.log("ShowNote onHide");
  },

  /* 生命周期函数--监听页面卸载 */
  onUnload: function () {
    console.log("ShowNote onUnload");
  },

  /* 自定义用户交互逻辑 */

  /* 记事检索区 */
  searchNote(res) {
    if (res.type === "focus") { //记事检索框聚焦时关闭未关闭的记事的删除和菜单栏、
      //隐藏记事展示，开启检索功能
      this.data.note.forEach((ele, index, origin) => {
        this.data.note[index].style.pullOutDelete = 750;
        this.data.note[index].style.pullOutMenu = 450;
      });
      this.setData({
        maskHeight: 100,
        noteDisplay: false,
        note: this.data.note
      });
    } else if (res.type === "input") { //记事检索框正在键入时展示与键入值相关的记事条目标题
      if (this.data.noteDisplay) this.setData({ noteDisplay: false });
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
        maskHeight: 6.7,
        noteDisplay: true,
        resultKey: null,
        result: []
      });
    }
  },
  //点击相应记事检索结果的时候返回相应记事条目位置
  gotoResult(res) {
    var that = this;
    var id = res.currentTarget.id;
    id.replace(/(\d)+/g, ($) => {
      id = $;
    });
    if (this.data.resultScrolling) {
      this.setData({
        maskHeight: 6.7,
        noteDisplay: true,
        resultKey: null,
        result: []
      });
    };
    setTimeout(() => {
      that.data.note[id].style.bgc = "red";
      that.setData({ note: that.data.note });
      setTimeout(() => {
        that.data.note[id].style.bgc = "none";
        that.setData({ note: that.data.note });
        setTimeout(() => {
          that.data.note[id].style.bgc = "red";
          that.setData({ note: that.data.note });
          setTimeout(() => {
            that.data.note[id].style.bgc = "none";
            that.setData({ note: that.data.note });
          }, 350);
        }, 350);
      }, 350);
    }, 100);
  },

  /* 读记事区 */
  tapStart(res) {
    tapTime = new Date().getTime();
  },
  tapEnd(res) {
    tapTime = new Date().getTime() - tapTime;
    lock = true;
    jumpNow = true;
    if (!!res.currentTarget.id) {
      var style = this.data.note[res.currentTarget.id].style
      if (style.pullOutDelete < 700) {
        this.data.note[res.currentTarget.id].style.pullOutDelete = 638;
      } else {
        this.data.note[res.currentTarget.id].style.pullOutDelete = 750;
      }
      if (style.pullOutMenu < 250) {
        this.data.note[res.currentTarget.id].style.pullOutMenu = 100;
      } else {
        this.data.note[res.currentTarget.id].style.pullOutMenu = 450;
      }
      this.setData({ note: this.data.note });
    }
  },
  tapMove(res) {
    if (lock) {
      lock = !lock;
      this.setData({ anchor: res.changedTouches[0].pageX });
      this.data.note.forEach((ele, index, origin) => {
        if (ele.style.pullOutDelete !== 750 || ele.style.pullOutMenu !== 450) {
          ele.style.pullOutDelete = 750;
          ele.style.pullOutMenu = 450;
          this.setData({ note: this.data.note });
        }
      });
    }
    var index = res.currentTarget.id;
    var pullOutDelete = this.data.note[index].style.pullOutDelete;
    var pullOutMenu = this.data.note[index].style.pullOutMenu;
    var moveDistance = (res.changedTouches[0].pageX - this.data.anchor) * this.data.SWT;
    if ((pullOutDelete >= 638 && pullOutDelete <= 750) && (moveDistance > 0 && moveDistance < 105)) {
      if (pullOutMenu !== 450) this.data.note[index].style.pullOutMenu = 450;
      this.data.note[index].style.pullOutDelete = 750 - moveDistance;
    }
    if ((pullOutMenu >= 100 && pullOutMenu <= 450) && (moveDistance < 0 && moveDistance > -350)) {
      if (pullOutDelete !== 750) this.data.note[index].style.pullOutDelete = 750;
      this.data.note[index].style.pullOutMenu = 450 + moveDistance;
    }
    this.setData({ note: this.data.note });
  },
  //删除相应记事(注：每次删除完成后都会检测当前是否仍有记事，没有则将返回写记事页)
  deleteNote(res) {
    var index = res.currentTarget.id;
    index.replace(/(\d)+/g, ($) => {
      index = $;
    });
    var that = this;
    wx.showModal({
      title: "读记事",
      content: "是否删除本条记事？",
      success(res) {
        if (res.confirm) {
          if (that.data.note[index].style.pullOutDelete !== 750) {
            that.data.note[index].style.pullOutDelete = 750;
            that.setData({ note: that.data.note });
          }
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
              mask: true
            });
            if (that.data.note.length === 0) {
              setTimeout(() => {
                wx.showModal({
                  title: "读记事",
                  content: "当前已无任何记事，将返回写记事",
                  showCancel: false
                });
                setTimeout(() => {
                  wx.redirectTo({
                    url: '../CreateNote/CreateNote',
                  });
                }, 1500);
              }, 2000);
            }
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
    let index = res.currentTarget.id;
    //当删除键或记事查看菜单已被拉出时的拉出取消操作
    let sign;
    this.data.note.forEach((ele, index, origin) => {
      if (ele.style.pullOutDelete !== 750 || ele.style.pullOutMenu !== 450) {
        ele.style.pullOutDelete = 750;
        ele.style.pullOutMenu = 450;
        this.setData({ note: this.data.note });
        sign = true;
      }
    });
    //当删除键和记事查看菜单都未被拉出且在记事标题展示状态时，默认点击当前条目为选择修改记事
    if (!sign && this.data.noteDisplay) {
      var that = this;
      this.data.note[index].style.bgc = "red";
      this.setData({ note: this.data.note });
      wx.showModal({
        title: "读记事",
        content: "是否修改当前记事？",
        success(res) {
          that.data.note[index].style.bgc = "none";
          that.setData({ note: that.data.note });
          if (res.confirm) {
            wx.setStorageSync("editNote", that.data.note[index]);
            wx.redirectTo({ url: "../CreateNote/CreateNote" });
          }
        }
      });
    }
  },
  //同条目下不同记事类型快速跳转功能
  jumpToAnother(res) {
    var hasText, hasRecord, hasPhoto, hasVideo, canIJump;
    !!this.data.note[this.data.noteIndex].note.text ? hasText = 1 : hasText = 0;
    this.data.note[this.data.noteIndex].note.record.length > 0 ? hasRecord = 1 : hasRecord = 0;
    this.data.note[this.data.noteIndex].note.photo.length > 0 ? hasPhoto = 1 : hasPhoto = 0;
    !!this.data.note[this.data.noteIndex].note.video ? hasVideo = 1 : hasVideo = 0;
    hasText + hasRecord + hasPhoto + hasVideo >= 2 && jumpNow ? canIJump = true : canIJump = false;
    if (lock) {
      lock = false;
      this.setData({ anchor: res.changedTouches[0].pageY });
    }
    var moveDistance = (res.changedTouches[0].pageY - this.data.anchor) * this.data.SWT;
    if (moveDistance >= 200 && canIJump) {
      console.log("jumpDown");
      jumpNow = false;
      if (this.data.textDisplay) {
        this.setData({
          textDisplay: false,
          text: null,
          noteDisplay: false
        });
        if (hasRecord) {
          this.setData({
            recordDisplay: true,
            playback: this.data.note[this.data.noteIndex].note.record
          });
        } else if (hasPhoto) {
          this.setData({
            photoDisplay: true,
            img: this.data.note[this.data.noteIndex].note.photo
          });
        } else {
          this.setData({
            videoDisplay: true,
            videoSrc: this.data.note[this.data.noteIndex].note.video
          });
        }
      } else if (this.data.recordDisplay) {
        this.setData({
          recordDisplay: false,
          playback: null,
          noteDisplay: false
        });
        if (hasPhoto) {
          this.setData({
            photoDisplay: true,
            img: this.data.note[this.data.noteIndex].note.photo
          });
        } else if (hasVideo) {
          this.setData({
            videoDisplay: true,
            videoSrc: this.data.note[this.data.noteIndex].note.video
          });
        } else this.setData({ noteDisplay: true });
      } else if (this.data.photoDisplay) {
        this.setData({
          photoDisplay: false,
          img: null,
          noteDisplay: false
        });
        if (hasVideo) {
          this.setData({
            videoDisplay: true,
            videoSrc: this.data.note[this.data.noteIndex].note.video
          });
        } else this.setData({ noteDisplay: true });
      } else {
        this.setData({
          videoDisplay: false,
          videoSrc: null,
          noteDisplay: true
        });
      }
    } else if (moveDistance <= -200 && canIJump) {
      console.log("JumpUp");
      jumpNow = false;
      if (this.data.videoDisplay) {
        this.setData({
          videoDisplay: false,
          videoSrc: null,
          noteDisplay: false
        });
        if (hasPhoto) {
          this.setData({
            photoDisplay: true,
            img: this.data.note[this.data.noteIndex].note.photo
          });
        } else if (hasRecord) {
          this.setData({
            recordDisplay: true,
            playback: this.data.note[this.data.noteIndex].note.record
          });
        } else {
          this.setData({
            textDisplay: true,
            text: this.data.note[this.data.noteIndex].note.text
          });
        }
      } else if (this.data.photoDisplay) {
        this.setData({
          photoDisplay: false,
          img: null,
          noteDisplay: false
        });
        if (hasRecord) {
          this.setData({
            recordDisplay: true,
            playback: this.data.note[this.data.noteIndex].note.record
          });
        } else if (hasText) {
          this.setData({
            textDisplay: true,
            text: this.data.note[this.data.noteIndex].note.text
          });
        } else this.setData({ noteDisplay: true });
      } else if (this.data.recordDisplay) {
        this.setData({
          recordDisplay: false,
          playback: null,
          noteDisplay: false
        });
        if (hasText) {
          this.setData({
            textDisplay: true,
            text: this.data.note[this.data.noteIndex].note.text
          });
        } else this.setData({ noteDisplay: true });
      } else {
        this.setData({
          textDisplay: false,
          text: null,
          noteDisplay: true
        });
      }
    } else if (Math.abs(moveDistance) >= 200 && jumpNow) {
      jumpNow = false;
      if (this.data.textDisplay) {
        this.setData({
          textDisplay: false,
          text: null
        });
      } else if (this.data.recordDisplay) {
        this.setData({
          recordDisplay: false,
          playback: []
        });
      } else if (this.data.photoDisplay) {
        this.setData({
          photoDisplay: false,
          img: []
        });
      } else {
        this.setData({
          videoDisplay: false,
          videoSrc: null
        });
      }
      this.setData({ noteDisplay: true });
    }
    if (this.data.videoDisplay) {
      this.setData({ mainFnDisplay: false });
    } else this.setData({ mainFnDisplay: true });
    if (this.data.mainFnDisplay && Math.abs(moveDistance) >= 200) console.log("JumpOut");
  },
  //开启读文本记事功能
  readText(res) {
    var index = res.currentTarget.id;
    index.replace(/(\d)+/g, ($) => {
      index = $;
    });
    var text = this.data.note[index].note.text;
    if (text) {
      this.data.note[index].style.pullOutMenu = 450;
      this.setData({
        text: text,
        noteDisplay: false,
        textDisplay: true,
        note: this.data.note,
        noteIndex: index
      });
    } else {
      wx.showModal({
        title: '读记事',
        content: '该条目没有文本记事',
        showCancel: false
      });
    }
  },
  //文本记事操作：复制文本内容或退出查看
  textCheck(res) {
    if (tapTime > 200) {
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
    }else if (tapTime <= 200) {
      this.setData({
        noteDisplay: true,
        textDisplay: false
      });
    }
  },
  //开启听语音记事功能
  listenRecord(res) {
    var index = res.currentTarget.id;
    index.replace(/(\d)+/g, ($) => { index = $; });
    if (this.data.note[index].note.record.length > 0) {
      this.data.note[index].style.pullOutMenu = 450;
      this.setData({
        note: this.data.note,
        playback: this.data.note[index].note.record,
        noteDisplay: false,
        recordDisplay: true,
        noteIndex: index
      });
    } else {
      wx.showModal({
        title: '读记事',
        content: '该条目没有语音记事',
        showCancel: false
      });
    }
  },
  //语音记事操作：返听相应条目下的相应语音或退出查看
  recordCheck(res) {
    var that = this;
    var index = res.currentTarget.id;
    if (!!index) {
      index.replace(/(\d)+/g, ($) => { index = $; });
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
      this.setData({
        playback: null,
        noteDisplay: true,
        recordDisplay: false
      });
    }
  },
  //开启看图片记事功能
  seePhoto(res) {
    var index = res.currentTarget.id;
    index.replace(/(\d)+/g, ($) => { index = $; });
    if (this.data.note[index].note.photo.length > 0) {
      this.data.note[index].style.pullOutMenu = 450;
      this.setData({
        img: this.data.note[index].note.photo,
        noteDisplay: false,
        photoDisplay: true,
        note: this.data.note,
        noteIndex: index
      });
    } else {
      wx.showModal({
        title: "读记事",
        content: "该条目没有图片记事",
        showCancel: false
      });
    }
  },
  //图片记事操作：查看相应条目下的相应图片或退出查看
  photoCheck(res) {
    if (res.type === "longpress") {
      var index = res.currentTarget.id;
      index.replace(/(\d)+/g, ($) => { index = $; });
      var that = this;
      wx.showModal({
        title: "读记事",
        content: "是否保存本张图片到手机相册？",
        success(res) {
          if (res.confirm) {
            wx.getSetting({
              success(res) {
                if (!res.authSetting["scope.writePhotosAlbum"]) {
                  wx.authorize({ scope: "scope.writePhotosAlbum" });
                }
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
            });
          }
        }
      });
    } else if (res.type === "tap") {
      this.setData({
        img: null,
        noteDisplay: true,
        photoDisplay: false
      });
    }
  },
  //开启看录像记事功能
  watchVideo(res) {
    var index = res.currentTarget.id;
    index.replace(/(\d)+/g, ($) => { index = $; });
    if (!!this.data.note[index].note.video) {
      this.data.note[index].style.pullOutMenu = 450;
      this.setData({
        note: this.data.note,
        mainFnDisplay: false,
        videoDisplay: true,
        videoSrc: this.data.note[index].note.video,
        noteIndex: index
      });
    } else {
      wx.showModal({
        title: "读记事",
        content: "该条目没有录像记事",
        showCancel: false
      });
    }
  },
  //录像记事操作：退出查看(注：相应查看操作在视频浏览组件中进行)
  videoCheck(res) {
    var that = this;
    wx.showActionSheet({
      itemList: ["退出查看", "保存视频到手机相册"],
      success: function (res) {
        if (res.tapIndex === 0) {
          that.setData({
            mainFnDisplay: true,
            videoDisplay: false,
            videoSrc: null
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
    if (this.data.note.length <= 12) {
      wx.redirectTo({
        url: "../CreateNote/CreateNote"
      });
    }else {
      wx.showModal({
        title: "读记事",
        content: "记事条目已达上限！",
        showCancel: false
      });
    }
  },

});
