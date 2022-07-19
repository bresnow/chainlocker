'use strict'
import Gun from 'gun'
import { SysUserPair, MASTER_KEYS } from '../auth.mjs'
import lz from '../lz-encrypt.mjs'
import 'gun/lib/path.js'
import 'gun/lib/load.js'
import 'gun/lib/open.js'
import 'gun/lib/then.js'
const SEA = Gun.SEA
Gun.chain.vault = function (vault, opts) {
  let _gun = this
  let gun = _gun.user()
  let keys = opts?.keys ?? MASTER_KEYS
  gun = gun.auth(keys, (ack) => {
    let err = ack.err
    if (err) {
      throw new Error(err)
    }
  })
  _gun.keys = async function (secret) {
    let keypair = MASTER_KEYS
    if (secret) {
      let sys = await SysUserPair(typeof secret === 'string' ? [secret] : [...secret])
      keypair = sys.keys
    }
    return keypair
  }
  _gun.locker = (nodepath) => {
    let path,
      temp = gun
    if (typeof nodepath === 'string') {
      path = nodepath.split('/')
      if (path.length === 1) {
        temp = temp.get(nodepath)
      }
      nodepath = path
    }
    if (nodepath instanceof Array) {
      if (nodepath.length > 1) {
        var i = 0,
          l = nodepath.length
        for (i; i < l; i++) {
          temp = temp.get(nodepath[i])
        }
      } else {
        temp = temp.get(nodepath[0])
      }
    }
    let node = temp
    return {
      async put(data, cb2) {
        data = await lz.encrypt(data, keys)
        node.put(data, cb2)
      },
      async value(cb) {
        node.load(async (data) => {
          let obj
          if (!data) {
            return cb({ err: 'Record not found' })
          } else {
            obj = await lz.decrypt(data, keys)
            cb(obj)
          }
        })
      },
    }
  }
  return gun
}
