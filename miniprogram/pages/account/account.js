import Crypto from '../../utils/crypto'
import dbAccounts from '../../db/accounts'

const app = getApp()
const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    mode: 'add',
    name: '',
    account: '',
    password: '',
    remark: '',
    category: '默认',
    cryptoRange: ['SM4', 'AES'],
    cryptoType: 'SM4',
    saveRange: ['云端', '本地'],
    saveType: '云端',
  },
  onLoad(option) {
    const { saveType, index, id } = option
    this.setData({
      index,
      id,
      saveType: decodeURIComponent(saveType),
    })
    this.init(index)
  },
  init(index) {
    const pages = getCurrentPages()
    const length = pages.length
    if (length > 1) {
      const page = pages[length - 2]
      const item = page.data.list[index]
      const { category, name, account, password, remark, cryptoType } = item
      this.setData({ category, name, account, password, remark, cryptoType })
    }
  },
  encrypt(data) {
    const key = app.globalData.key
    const { cryptoType } = this.data
    if (!key) {
      wx.navigateTo({ url: '/pages/key/key' })
      return
    }
    return Crypto.encrypt(data, key, cryptoType)
  },
  onInput(e) {
    const { type } = e.currentTarget.dataset
    this.data[type] = e.detail.value
  },
  updatePrePageData() {
    const { name, account, password, remark, category, saveType, index } = this.data
    const pages = getCurrentPages()
    const length = pages.length
    if (length > 1) {
      const page = pages[length - 2]
      const { list } = page.data
      const item = list[index]
      item.name = name
      item.account = account
      item.password = password
      item.remark = remark
      item.category = category
      item.saveType = saveType
      page.setData({ [`list[${index}]`]: item })
    }
  },
  updateLocalAccount() {
    const { name, account, password, remark, category, id } = this.data
    const oldAccounts = wx.getStorageSync('accounts') || []
    if (Array.isArray(oldAccounts)) {
      const data = { name, account, password, remark, category, id }
      const newAccounts = oldAccounts.filter(({ id }) => id !== id)
      newAccounts.unshift(data)
      wx.setStorage({
        data: newAccounts,
        key: 'accounts',
        success: () => {
          this.updatePrePageData()
          wx.showToast({ 
            title: '修改成功',
            success: function(){
              setTimeout(function(){
                wx.navigateBack()
              }, 500)
            }
         })
        },
        fail: () => {
          wx.showToast({ title: '修改失败' })
        }
      })
    }
  },
  updateCloudAccount() {
    const { name, account, password, remark, category, id } = this.data
    const cloudData = {}
    if (name) {
      cloudData.name = this.encrypt(name)
    } else {
      cloudData.name = _.remove()
    }
    if (account) {
      cloudData.account = this.encrypt(account)
    } else {
      cloudData.account = _.remove()
    }
    if (password) {
      cloudData.password = this.encrypt(password)
    } else {
      cloudData.password = _.remove()
    }
    if (remark) {
      cloudData.remark = this.encrypt(remark)
    } else {
      cloudData.remark = _.remove()
    }
    cloudData.category = category
    cloudData.updatedAt = Date.now()

    wx.showLoading({ title: '保存中..', mask: true })
    dbAccounts.update(id, cloudData)
      .then(res => {
        const { code } = res
        if (code === 0) {
          this.updatePrePageData()
          wx.showToast({ 
            title: '保存成功',
            success: function(){
              setTimeout(function(){
                wx.navigateBack()
              }, 500)
            }
          })
        } else {
          wx.showToast({ title: '保存失败' })
        }
      })
  },
  onCryptoTypeChange(e) {
    const { value } = e.detail
    this.setData({ cryptoType: this.data.cryptoRange[value] })
  },
  onButtonTap() {
    const { name, account, password, remark, saveType } = this.data
    const { userInfo = {} } = app.globalData
    const { role } = userInfo
    if (!name || !account || !password) {
      wx.showToast({ title: '请输入账户信息' })
      return
    }
    if (saveType === '云端') {
      this.updateCloudAccount()
    } else if (saveType === '本地') {
      this.updateLocalAccount()
    } else {
      wx.showToast({ title: '系统开小差了' })
      return
    }
  },
  onSaveTypeChange(e) {
    const { value } = e.detail
    if (value === '1') {
      this.setData({ saveType: '本地' })
    } else {
      app.$ready.then(res => {
        const { role, applyStatus } = res
        if (role !== 'member' && role !== 'admin') {
          if (applyStatus === 1) {
            wx.showModal({
              title: '提示',
              content: '请等待管理员审核云存储权限',
            })
            return
          } else {
            this.setData({ showAccessDialog: true })
          }
          this.setData({ saveType: '本地' })
        } else {
          this.setData({ saveType: '云端' })
        }
      })
      .catch(() => {
        wx.showToast({
          title: '数据初始化出错',
          icon: 'none',
        })
      })
    }
  },
})

/**
   * del local and insert cloud
   **/
  /**
  delLocalAccountAndInsertCloudAccount(){
    //del local
    const { id } = this.data
    const accounts = wx.getStorageSync('accounts')
    if (Array.isArray(accounts)) {
      const removeIndex = accounts.findIndex(item => item.id === id)
      if (removeIndex > -1) {
        accounts.splice(removeIndex, 1)
        wx.setStorage({
          data: accounts,
          key: 'accounts',
          success: () => {
            wx.showToast({ title: '删除成功' })
          },
          fail: () => {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        })
      }
    }
    //insert cloud
    const { name, account, password, remark, category, cryptoType } = this.data
    const cloudData = {}
    if(name) {
      cloudData.name = this.encrypt(name)
    }
    if (account) {
      cloudData.account = this.encrypt(account)
    }
    if (password) {
      cloudData.password = this.encrypt(password)
    }
    if (remark) {
      cloudData.remark = this.encrypt(remark)
    }
    cloudData.cryptoType = cryptoType
    cloudData.category = category
    cloudData.createdAt = Date.now()

    wx.showLoading({ title: '创建中..' })
    dbAccounts.add(cloudData)
      .then(res => {
        const { code } = res
        if (code === 0) {
          this.updatePrePageData()
          wx.navigateBack()
          wx.showToast({ title: '修改成功'})
        } else {
          wx.showToast({ title: '创建失败' })
        }
      })
  },
  **/

  /**
   * del cloud and insert local
   **/
  /**
  delCloudAccountAndInsertLocalAccount() {
    const { id, name, account, password, remark, category } = this.data
    wx.showLoading({ title: '删除中...' })
    dbAccounts.remove(id)
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '删除成功' })
      })
      .catch((e) => {
        wx.showToast({
          title: '删除失败',
        })
      })
    // insert local
    const accounts = wx.getStorageSync('accounts') || []
      if (Array.isArray(accounts)) {
        const data = { name, account, password, remark, category, id: Date.now() }
        accounts.unshift(data)
        wx.setStorage({
          data: accounts,
          key: 'accounts',
        })
      }
  },
  **/

  /**
    if(role === 'member' || role === 'admin'){
      if (saveType === '云端') {
        if (oldSaveType === "云端") {
          this.updateCloudAccount()
        } else if (oldSaveType === "本地") {
          this.delLocalAccountAndInsertCloudAccount()
        } else {
          wx.showModal({
            title: '提示',
            content: '系统开小差了，请稍后重试',
          })
        }
      } else if (saveType === '本地') {
        if (oldSaveType === '云端') {
          this.delCloudAccountAndInsertLocalAccount()
        } else if (oldSaveType === '本地') {
          this.updateLocalAccount()
        } else {
          wx.showModal({
            title: '提示',
            content: '系统开小差了，请稍后重试',
          })
        }
      }else{
        wx.showModal({
          title: '提示',
          content: '系统开小差了，请稍后重试',
        })
      }
    } else {
      if(saveType === '云端'){
        wx.showModal({
          title: '提示',
          content: '请等待管理员审核云存储权限',
        })
      } else if (saveType === '本地') {
        if (oldSaveType === '云端') {
          this.delCloudAccountAndInsertLocalAccount()
        } else if (oldSaveType === '本地') {
          this.updateLocalAccount()
        } else {
          wx.showModal({
            title: '提示',
            content: '系统开小差了，请稍后重试',
          })
        }
      } else {
        wx.showModal({
          title: '提示',
          content: '系统开小差了，请稍后重试',
        })
      }
    }
    **/