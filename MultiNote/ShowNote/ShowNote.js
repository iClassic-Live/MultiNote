// ShowNote/ShowNote.js

var note; //永久保存所有记事的载体
var fromCreateNoteCargo; //接收来自写记事页的数据的载体

var tapTime; //监测相应按钮的按下时长
var lock = true; //当相应记事的条目检测到滑动操作的时候加锁以获取滑动起始位置的锚点

var jumpNow = true; //监测当前是否正在进行同条目下不同记事类型间跳转，进入跳转时为false，否则为true

const innerAudioContext = wx.createInnerAudioContext(); //创建并返回内部 audio 上下文

Page({

  /**
   * 页面的初始数据
   */
  data: {

    //主功能区、录像记事查看组件切换功能初始化，默认主功能区启动，其他功能区待命
    mainFnDisplay: true,
    videoCheckFnDisplay: false,


    //主功能区功能初始化
    upperMaskHeight: 0, //上部蒙层高度
    bottomeMaskHeight: 0, //下部蒙层高度

    searchNote: "记事检索",
    resultKey: null, //检索信息的key值
    maskHeight: 6.7, //记事检索区背部的蒙层高度，未进入检索时为6.7，进入检索后为100
    canISearch: false,
    resultScrolling: false,
    result: null,

    noteScrolling: false,
    scrollToResult: null,
    note: note, //全部记事信息的渲染
    noteIndex: null,
    noteDisplay: true, //记事区Display，默认展示，其他记事查看或记事检索时隐藏
    textDisplay: false, //文本记事Display，默认隐藏
    text: null, //文本记事内容，默认为空
    recordDisplay: false, //语音记事Display，默认隐藏
    playback: null, //语音记事内容，默认为空
    photoDisplay: false,  //照相记事Display，默认隐藏
    img: null, //照相记事内容，默认为空
    deleteNote: "删除", //删除按钮的字样
    anchor: 0, //滑动操作的锚点，滑动时该数据会被渲染

    createNote: "新\xa0\xa0建\xa0\xa0记\xa0\xa0事", //新建记事按钮字样\xa0为空格符


    //录像记事查看组件功能初始化
    videoSrc: null, //视频播放地址，默认为空

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log("ShowNote onLoad");
    //页面显示时如果有记事则加载记事
    if (!(wx.getStorageSync("note"))) {
      note = [];
      wx.setStorageSync("note", note);
    } else {
      note = wx.getStorageSync("note");
      this.setData({ note: note });
    }
    //当记事类型为新建时则增加记事条目，记事类型为修改时则修改相应条目
    if (!!wx.getStorageSync("newNote")) {
      fromCreateNoteCargo = wx.getStorageSync("newNote");
      wx.removeStorageSync("newNote");
      note = wx.getStorageSync("note");
      note.push(fromCreateNoteCargo);
    } else if (!!wx.getStorageSync("editNote")) {
      fromCreateNoteCargo = wx.getStorageSync("editNote");
      wx.removeStorageSync("editNote");
      note = wx.getStorageSync("note");
      note[fromCreateNoteCargo.id] = fromCreateNoteCargo;
    }
    wx.setStorageSync("note", note);
    this.setData({ note: note });
    console.log("当前记事存储状况", note);
    /* 使用定时器进行扫描操作：
       1. 监测当前记事是否已经超过15条，有则开启滚动查看功能，否则关闭；
       2. 监测当前是否在查看记事，是则屏蔽记事检索功能和新建记事功能，并置记事条目索引为空，否则取消屏蔽 */
    var timer = setInterval(() => {
      if (note.length > 15) {
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
        if (!!this.data.noteIndex) this.setData({ noteIndex: null });
      }
    }, 10);
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    console.log("ShowNote onReady");
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    console.log("ShowNote onShow");
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    console.log("ShowNote onHide");
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    console.log("ShowNote onUnload");
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    console.log("ShowNote onPullDownRefresh");
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    console.log("ShowNote onReachBottom");
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function (res) {
    console.log("ShowNote onShareAppMessage");
  },


  /* 自定义用户交互逻辑 */

  /* 记事检索区 */
  searchNote(res) {
    if (res.type === "focus") { //记事检索框聚焦的时候关闭未关闭的记事的删除和菜单栏、
      //隐藏记事展示，开启检索功能
      var that = this;
      this.data.note.forEach((ele, index, origin) => {
        this.data.note[index].info.pullOutDelete = -18;
        this.data.note[index].info.pullOutMenu = -40;
      });
      this.setData({
        maskHeight: 100,
        canISearch: true,
        noteDisplay: false,
        note: that.data.note
      });
    } else if (res.type === "blur") { //记事检索功能失焦时关闭记事检索功能并恢复记事展示
      if (this.data.result.length < 15) {
        this.setData({
          maskHeight: 6.7,
          canISearch: false,
          noteDisplay: true,
          resultKey: null
        });
      }
    }
    if (this.data.canISearch) { //当获取检索功能呢权限时开始进行记事检索
      //使用简单的正则表达式对记事进行相应检索
      var result = [];
      var reg = /\s/g;
      reg.compile(res.detail.value, "g");
      if (res.detail.value) {
        note.forEach((ele, index, origin) => {
          if (ele.note.title.match(reg)) {
            result.push({
              id: ele.id,
              info: ele.info,
              note: ele.note
            });
          }
        });
      }
      this.setData({
        result: result
      });
      //若检索到的记事超过或等于15条时使检索结果可以滚动查看
      if (this.data.result.length >= 15) {
        this.setData({ resultScrolling: true });
      } else {
        this.setData({ resultScrolling: false });
      }
    }
  },
  //点击相应记事检索结果的时候返回相应记事条目位置
  gotoResult(res) {
    var that = this;
    var id = res.currentTarget.id;
    id = id.split("")[id.split("").length - 1];
    if (this.data.resultScrolling) {
      this.setData({
        maskHeight: 6.7,
        canISearch: false,
        noteDisplay: true,
        resultKey: null,
        resultScrolling: false
      });
    };
    this.data.noteScrolling ? this.setData({ scrollToResult: id }) : "";
    this.data.note[id].info.opacity = 0.5;
    this.setData({ note: this.data.note });
    setTimeout(() => {
      that.data.note[id].info.opacity = 1;
      that.setData({ note: that.data.note });
      setTimeout(() => {
        that.data.note[id].info.opacity = 0.5;
        that.setData({ note: that.data.note });
        setTimeout(() => {
          that.data.note[id].info.opacity = 1;
          that.setData({ note: that.data.note });
        }, 300);
      }, 300);
    }, 300);
  },

  /* 读记事区 */
  tapStart(res) {
    tapTime = new Date().getTime();
  },
  tapEnd(res) {
    tapTime = new Date().getTime() - tapTime;
    lock = true;
    jumpNow = true;
    var index = res.currentTarget.id;
    if (!!index) {
      var pullOutDelete = this.data.note[index].info.pullOutDelete;
      var pullOutMenu = this.data.note[index].info.pullOutMenu;
      if (pullOutDelete > -12) {
        this.data.note[index].info.pullOutDelete = 0.5;
        this.setData({ note: this.data.note });
      } else {
        this.data.note[index].info.pullOutDelete = -18;
        this.setData({ note: this.data.note });
      }
      if (pullOutMenu > -25) {
        this.data.note[index].info.pullOutMenu = 1;
        this.setData({ note: this.data.note });
      } else {
        this.data.note[index].info.pullOutMenu = -40;
        this.setData({ note: this.data.note });
      }
    }
  },
  tapMove(res) {
    if (lock) {
      lock = !lock;
      this.setData({ anchor: res.changedTouches[0].pageX });
    }
    var index = res.currentTarget.id;
    var anchor = this.data.anchor;
    var pullOutDelete = this.data.note[index].info.pullOutDelete;
    var pullOutMenu = this.data.note[index].info.pullOutMenu;
    var moveDistance = anchor - res.changedTouches[0].pageX;
    if (pullOutDelete >= -18 && pullOutDelete <= 0 && moveDistance / 3 > -18.5) {
      this.data.note[index].info.pullOutDelete = -moveDistance / 3 - 18;
      this.setData({ note: this.data.note });
    }
    if ((pullOutMenu >= -40 && pullOutMenu <= 1) && moveDistance / 3 > -40) {
      this.data.note[index].info.pullOutMenu = moveDistance / 3 - 40;
      this.setData({ note: this.data.note });
    }
  },
  //取消滑动拉出的删除按键或菜单栏的展示
  cancelOperation(res) {
    var index = res.currentTarget.id;
    if (res.detail.x >= 70 && this.data.note[index].info.pullOutDelete === 0.5) {
      this.data.note[index].info.pullOutDelete = -18;
      this.setData({ note: this.data.note });
    }
    if (res.detail.x <= 230 && this.data.note[index].info.pullOutMenu === 1) {
      this.data.note[index].info.pullOutMenu = -40;
      this.setData({ note: this.data.note });
    }
  },
  //删除相应记事(注：每次删除完成后都会检测当前是否仍有记事，没有则将返回写记事页)
  deleteNote(res) {
    var str = res.currentTarget.id;
    var that = this;
    wx.showModal({
      title: "读记事",
      content: "是否删除本条记事？",
      success(res) {
        if (res.confirm) {
          var index = str.split("")[str.split("").length - 1];
          var timer = setInterval(() => {
            that.data.note[index].info.pullOutDelete === -18 ? "" :
              that.data.note[index].info.pullOutDelete = -18;
            that.data.note[index].info.opacity -= 0.1;
            that.setData({ note: that.data.note });
          }, 50);
          setTimeout(() => {
            clearInterval(timer);
            note.splice(index, 1);
            if (note.length > 0) {
              note.forEach((ele, index, origin) => {
                if (ele.id !== index) {
                  ele.id = index;
                  ele.info.marginTop = index * 9;
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
            if (wx.getStorageSync("note").length === 0) {
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
        }
      }
    });
  },
  //记事修改功能，长按相应条目可以选择修改相应记事
  editNote(res) {
    var index = res.currentTarget.id;
    var pullOutDelete = this.data.note[index].info.pullOutDelete;
    var pullOutMenu = this.data.note[index].info.pullOutMenu;
    var that = this;
    //当删除键和记事查看菜单都未被拉出时，可以选择修改记事
    if (pullOutDelete === -18 && pullOutMenu === -40) {
      wx.showModal({
        title: "读记事",
        content: "是否修改当前记事？",
        success(res) {
          if (res.confirm) {
            note[index].info.noteType = "edit";
            wx.setStorageSync("editNote", note[index]);
            wx.redirectTo({
              url: "../CreateNote/CreateNote"
            });
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
    if (res.changedTouches[0].pageY - this.data.anchor >= 200 && canIJump) {
      console.log("jumpDown");
      jumpNow = false;
      if (this.data.textDisplay) {
        this.setData({
          textDisplay: false,
          text: null
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
            videoDisplay: this,
            videoSrc: this.data.note[this.data.noteIndex].note.video
          });
        }
      } else if (this.data.recordDisplay) {
        this.setData({
          recordDisplay: false,
          playback: null
        });
        if (hasPhoto) {
          this.setData({
            photoDisplay: true,
            img: this.data.note[this.data.noteIndex].note.photo
          });
        } else if (hasVideo) {
          this.setData({
            videoDisplay: this,
            videoSrc: this.data.note[this.data.noteIndex].note.video
          });
        } else this.setData({ noteDisplay: true });
      } else if (this.data.photoDisplay) {
        this.setData({
          photoDisplay: false,
          img: null
        });
        if (hasVideo) {
          this.setData({
            videoDisplay: this,
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
    }else if (res.changedTouches[0].pageY - this.data.anchor <= -200 && canIJump) {
      console.log("JumpUp");
      jumpNow = false;
      if (this.data.videoDisplay) {
        this.setData({
          videoDisplay: false,
          videoSrc: null
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
          img: null
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
          playback: null
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
    }else if (Math.abs(res.changedTouches[0].pageY - this.data.anchor) <= 200 && jumpNow) {
      console.log("jumpOut");
      jumpNow = false;
      if (this.data.textDisplay) {
        this.setData({
          textDisplay: false,
          text: null
        });
      }else if (this.data.recordDisplay) {
        this.setData({
          recordDiplay: false,
          playback: null
        });
      }else if (this.data.photoDisplay) {
        this.setData({
          photoDisplay: false,
          img: null
        });
      }else {
        this.setData({
          videoDisplay: false,
          videoSrc: null
        });
      }
      this.setData({ noteDisplay: true });
    }
  },
  //开启读文本记事功能
  readText(res) {
    var str = res.currentTarget.id;
    var index = str.split("")[str.split("").length - 1];
    var text = note[index].note.text;
    if (text) {
      this.data.note[index].info.pullOutMenu = -40;
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
      var text = this.data.text;
      wx.showActionSheet({
        itemList: ["复制文本到剪贴板", "退出文本记事查看"],
        success(res) {
          if (res.tapIndex === 0) {
            wx.setClipboardData({
              data: text,
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
          } else {
            that.setData({
              noteDisplay: true,
              textDisplay: false
            });
          }
        }
      });
    }
  },
  //开启听语音记事功能
  listenRecord(res) {
    var index = res.currentTarget.id;
    index = index.split("")[index.split("").length - 1];
    if (note[index].note.record.length > 0) {
      this.data.note[index].info.pullOutMenu = -40;
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
    if (tapTime <= 200 && index) {
      index = index.split("")[index.split("").length - 1];
      innerAudioContext.autoplay = true;
      innerAudioContext.src = this.data.playback[index].url;
      this.data.playback[index].opacity = 0.5;
      this.setData({ playback: this.data.playback });
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
    } else if (tapTime > 200) {
      this.setData({
        playback: null,
        noteDisplay: true,
        recordDisplay: false
      });
    }
  },
  //开启看照片记事功能
  seePhoto(res) {
    var str = res.currentTarget.id;
    var index = str.split("")[str.split("").length - 1];
    var photo = this.data.note[index].note.photo;
    this.data.note[index].info.pullOutMenu = -40;
    if (photo.length > 0) {
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
        content: "该条目没有拍照记事",
        showCancel: false
      });
    }
  },
  //照片记事操作：查看相应条目下的相应照片或退出查看
  photoCheck(res) {
    if (res.type === "tap") {
      var index = res.currentTarget.id;
      index = index.split("")[index.split("").length - 1];
      var that = this;
      wx.showActionSheet({
        itemList: ["全屏查看", "保存图片到手机相册"],
        success(res) {
          if (res.tapIndex === 0) {
            wx.previewImage({
              urls: [that.data.img[index].url],
            });
          } else {
            wx.getSetting({
              success(res) {
                !res.authSetting["scope.writePhotosAlbum"] ?
                  wx.authorize({ scope: "scope.writePhotosAlbum" }) : "";
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
    } else if (res.type === "longpress") {
      this.setData({
        img: null,
        noteDisplay: true,
        photoDisplay: false
      });
    }
  },
  //开启看录像记事功能
  watchVideo(res) {
    var str = res.currentTarget.id;
    var index = str.split("")[str.split("").length - 1];
    if (this.data.note[index].note.video) {
      this.data.note[index].info.pullOutMenu = -40;
      this.setData({
        note: this.data.note,
        mainFnDisplay: false,
        videoCheckFnDisplay: true,
        videoSrc: note[index].note.video,
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
    wx.showActionSheet({
      itemList: ["退出查看", "保存视频到手机相册"],
      success: function (res) {
        if (res.tapIndex === 0) {
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
        } else {
          this.setData({
            mainFnDisplay: true,
            videoCheckFnDisplay: false,
            videoSrc: null
          });
        }
      }
    });
  },


  /* 新建记事区 */
  //新建记事按钮：按下则跳转到写记事页
  createNote(res) {
    wx.redirectTo({
      url: "../CreateNote/CreateNote"
    });
  }

});