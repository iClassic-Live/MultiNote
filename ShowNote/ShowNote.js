// ShowNote/ShowNote.js

var note; //创建用于永久保存所有记事的载体
var fromCreateNoteCargo; //创建用于接收来自写记事页的数据的载体
var toCreateNoteCargo; //创建用于向写记事页发送数据的载体

var lock = true;

const innerAudioContext = wx.createInnerAudioContext();

Page({

  /**
   * 页面的初始数据
   */
  data: {

    //主功能区、录像记事查看组件切换功能初始化，默认主功能区启动，其他功能区待命
      mainFnDisplay: true,
      videoCheckFnDisplay: false,


    //主功能区功能初始化
      searchNote: "记事检索",
      resultKey: null,
      maskHeight: 6.7,
      canISearch: false,
      resultScrolling: false,
      result: null,

      noteScrolling: false,
      scrollToResult: null,
      note: note,
      noteDisplay: true,
      textDisplay: false,
      title: null,
      deleteNote: "删除",
      anchor: 0,
      ifHasText: true,
      ifHasRecord: true,
      ifHasCamera: true,
      text: null,

      createNote: "新\xa0\xa0建\xa0\xa0记\xa0\xa0事",


    //录像记事查看组件功能初始化
      videoSrc: null, //视频播放地址，默认为空;

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log("ShowNote onLoad");
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
    if (!Boolean(wx.getStorageSync("note"))) {
      note = [];      
      wx.setStorageSync("note", note);
    }else {
      note = wx.getStorageSync("note");
      this.setData({ note: note });
    }    
    if (Boolean(wx.getStorageSync("newNote"))) {
      fromCreateNoteCargo = wx.getStorageSync("newNote");
      wx.removeStorageSync("newNote");
      note = wx.getStorageSync("note");
      note.push(fromCreateNoteCargo);
    } else if (Boolean(wx.getStorageSync("editNote"))) {
      fromCreateNoteCargo = wx.getStorageSync("editNote");
      wx.removeStorageSync("editNote");
      note = wx.getStorageSync("note");
      note[fromCreateNoteCargo.id] = fromCreateNoteCargo;
    }
    wx.setStorageSync("note", note);
    this.setData({ note: note });
    console.log("当前记事存储状况",note);
    //初始化向写记事页传递数据的载体;
    toCreateNoteCargo = {
      id: null,
      timeStamp: null,
      info: {
        marginTop: null,
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
    let that = this;
    let timer = setInterval(() => {
      if (note.length > 15) {
        that.data.noteScrolling ? "" : that.setData({ noteScrolling: true });
      }else {
        that.data.noteScrolling ? that.setData({ noteScrolling: false }) : "";
      }
    });
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
  onShareAppMessage: function () {
    console.log("ShowNote onShareAppMessage");
  },


/* 自定义用户交互逻辑 */

  /* 记事检索区 */
  searchNote (res) {
    if (res.type == "focus") {
      let that = this;
      this.data.note.forEach((ele, index, origin) => {
        this.data.note[index].info.pullOutDelete = -18;
        this.data.note[index].info.pullOutMenu = -30;
      })
      this.setData({
        maskHeight: 100,
        canISearch: true,
        noteDisplay: false,
        note: that.data.note
      });
      this.data.textDisplay ? this.setData({ textDisplay: false }) : "";
    }else if (res.type == "blur") {
      this.setData({
        maskHeight: 6.7,
        canISearch: false,
        noteDisplay: true,
        resultKey: null
      });
    }
    if (this.data.canISearch) {
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
            })
          }
        })
      }
      this.setData({
        result: result
      });
      if (this.data.result.length >= 16) {
        this.setData({ resultScrolling: true });
      }else {
        this.setData({ resultScrolling: false });
      }
    }
  },
  gotoResult (res) {
    let that = this;
    let id = res.currentTarget.id;
    id = id.split("")[id.split("").length - 1];
    if (this.data.noteScrolling) {
      this.setData({
        scrollToResult: id
      });
    }
    this.data.note[id].info.opacity = 0.5;
    this.setData({ note: this.data.note });
    console.log(this.data.note[id]);    
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
  tapEnd (res) {
    lock = true
    let index = res.currentTarget.id;  
    let pullOutDelete = this.data.note[index].info.pullOutDelete;
    let pullOutMenu = this.data.note[index].info.pullOutMenu;
    if (pullOutDelete > -12) {
      this.data.note[index].info.pullOutDelete = 0;
      this.setData({ note: this.data.note });
    }else {
      this.data.note[index].info.pullOutDelete = -18;
      this.setData({ note: this.data.note });
    }
    if (pullOutMenu > -20) {
      this.data.note[index].info.pullOutMenu = 1;
      this.setData({ note: this.data.note });
    }else {
      this.data.note[index].info.pullOutMenu = -30;
      this.setData({ note: this.data.note });
    }
  },
  tapMove(res) {
    if (lock) {
      lock = !lock;
      this.setData({
        anchor: res.changedTouches[0].pageX
      })
    }
    let index = res.currentTarget.id;
    let anchor = this.data.anchor;
    let pullOutDelete = this.data.note[index].info.pullOutDelete;
    let pullOutMenu = this.data.note[index].info.pullOutMenu;
    let moveDistance = anchor - res.changedTouches[0].pageX;
    if (pullOutDelete >= -18 && pullOutDelete <= 0 && moveDistance / 3 > -18.5) {
      this.data.note[index].info.pullOutDelete = -moveDistance / 3 - 18;
      this.setData({ note: this.data.note });
    }
    if ((pullOutMenu >= -30 && pullOutMenu <= 1) && moveDistance / 3 > -30) {
      this.data.note[index].info.pullOutMenu = moveDistance / 3 - 30;
      this.setData({ note: this.data.note });
    }
  },
  cancelOperation (res) {
    let index = res.currentTarget.id;
    let pullOutDelete = this.data.note[index].info.pullOutDelete;
    let pullOutMenu = this.data.note[index].info.pullOutMenu;
    if (res.detail.x >= 70 && res.detail.x <= 265) {
      pullOutDelete == -18 ? "" : this.data.note[index].info.pullOutDelete = -18;
      pullOutMenu == -30 ? "" : this.data.note[index].info.pullOutMenu = -30;
      pullOutDelete == -18 && pullOutMenu == -30 ? "" : this.setData({ note: this.data.note });
    }
  },
  editNote (res) {
    let index = res.currentTarget.id;
    let pullOutDelete = this.data.note[index].info.pullOutDelete;
    let pullOutMenu = this.data.note[index].info.pullOutMenu;
    let that = this;
    //当删除键和记事查看菜单都未被拉出时，可以选择修改记事
    if (pullOutDelete == -18 && pullOutMenu == -30) {
      wx.showModal({
        title: "读记事",
        content: "是否修改当前记事？",
        success(res) {
          if (res.confirm) {
            note[index].info.noteType = "edit";
            toCreateNoteCargo = note[index];
            console.log(toCreateNoteCargo);
            wx.setStorageSync("editNote", toCreateNoteCargo);
            wx.redirectTo({
              url: "../CreateNote/CreateNote"
            })
          }
        },
        fail(res) {
          wx.showToast({
            title: "记事修改失败",
            image: "../images/error.png",
            mask: true
          })
        }
      })
    }
  },
  readText (res) {
    let str = res.currentTarget.id;
    let index = str.split("")[str.split("").length - 1];
    let text = note[index].note.text;
    if (text) {
      this.data.note[index].info.pullOutMenu = -30;
      this.setData({
        text: text,
        noteDisplay: false,
        textDisplay: true,
        note: this.data.note
      })
    }else {
      wx.showModal({
        title: '读记事',
        content: '该条目没有文本记事',
        showCancel: false
      })
    }
  },
  textCheck(res) {
    let that = this;
    let text = this.data.text;
    wx.showActionSheet({
      itemList: ["复制文本到剪贴板", "退出文本记事查看"],
      success (res) {
        if (res.tapIndex == 0) {
          wx.setClipboardData({
            data: text,
            success: function (res) {
              wx.getClipboardData({
                success: function (res) {
                  console.log("复制到剪贴板的内容\n", res.data);
                  wx.showToast({
                    title: "复制文本成功",
                    image: "../images/success.png",
                    mask: true
                  })
                }
              })
            }
          })
        }else {
          that.setData({
            noteDisplay: true,
            textDisplay: false
          })
        }
      }
    });
  },
  listenRecord (res) {
    let str = res.currentTarget.id;
    let index = str.split("")[str.split("").length - 1];
    let recordPath = note[index].note.recordPath;
    if (recordPath) {
      this.data.note[index].info.pullOutMenu = -30;
      this.setData({ note: this.data.note });
      innerAudioContext.autoplay = true
      innerAudioContext.src = recordPath;
    } else {
      wx.showModal({
        title: '读记事',
        content: '该条目没有语音记事',
        showCancel: false
      })
    }
  },
  viewCamera (res) {
    let str = res.currentTarget.id;
    let index = str.split("")[str.split("").length - 1];
    let photoPath = note[index].note.photoPath;
    let videoPath = note[index].note.videoPath;
    if (note[index].note.cameraFnChoice == "photo") {
      this.data.note[index].info.pullOutMenu = -30;
      this.setData({ note: this.data.note });
      wx.previewImage({
        urls: [note[index].note.photoPath]
      });
    }else if (note[index].note.cameraFnChoice == "video") {
      this.data.note[index].info.pullOutMenu = -30;
      this.setData({ note: this.data.note });
      this.setData({
        mainFnDisplay: false,
        videoCheckFnDisplay: true,
        videoSrc: note[index].note.videoPath
      });
    }else {
      wx.showModal({
        title: '读记事',
        content: '该条目没有拍摄记事',
        showCancel: false
      })
    }
  },
  videoCheck (res) {
    this.setData({
      mainFnDisplay: true,
      videoCheckFnDisplay: false,
      videoSrc: null
    })
  },
  deleteNote (res) {
    let str = res.currentTarget.id;
    let that = this;
    wx.showModal({
      title: "读记事",
      content: "是否删除本条记事？",
      success (res) {
        if (res.confirm) {
          let index = str.split("")[str.split("").length - 1];
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
            image: "../images/success.png"
          });
          console.log(wx.getStorageSync("note"))
          if (wx.getStorageSync("note").length == 0) {
            setTimeout(() => {
              wx.showModal({
                title: "读记事",
                content: "当前已无任何记事，将返回写记事",
                showCancel: false
              });
              setTimeout(() => {
                wx.redirectTo({
                  url: '../CreateNote/CreateNote',
                })
              }, 1500)
            }, 2000);
          }
        }
      },
      fail (res) {
        wx.showToast({
          title: "记事删除失败",
          image:  "../images/error.png",
          mask: true
        })
      }
    });
  },


  /* 新建记事区 */
  createNote (res) {
    wx.redirectTo({
      url: "../CreateNote/CreateNote"
    })
  }

});