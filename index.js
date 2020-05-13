module.exports = function testmod(d) {
  d.game.initialize('inventory')
  const regexId = /#(\d*)@/
  let ev,
    banking = false

  //look, I can do async/await alright? why am I leaving comments
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
  async function asyncForEach(arr, cb) { for (let i = 0; i < arr.length; i++) { await cb(arr[i], i, arr) } }

  //what we have here is some next level autism cause im retarded
  const startBank = async (e) => {
    ((e.numUnlockedSlots - e.offset) / 72) > 1 ? ev = e : ev = null
    if (((e.numUnlockedSlots - e.offset) / 72) <= 1) banking = false
    await asyncForEach(e.items, async (item) => {
      const tempItem = d.game.inventory.findInBagOrPockets(item.id)
      if (tempItem === undefined || d.settings.blacklist[item.id] || ![1, 9].includes(e.container)) return
      await sleep(d.settings.delay) //cause I need a fucking nap from life
      d.send('C_PUT_WARE_ITEM', 3, {
        gameId: d.game.me.gameId,
        container: e.container,
        offset: e.offset,
        fromPocket: tempItem.pocket,
        fromSlot: tempItem.slot,
        id: tempItem.id,
        dbid: tempItem.dbid,
        amount: d.game.inventory.getTotalAmountInBagOrPockets(tempItem.id),
        toSlot: e.offset
      })
    })
    //why is this sleep needed? bruhaps ping?
    await sleep(d.settings.delay).then(() => {
      if (ev && banking) {
        d.send('C_VIEW_WARE', 2, {
          gameId: d.game.me.gameId,
          type: ev.container,
          offset: ev.offset + 72
        })
        viewBank()
      }
    })
  }
  //shitty function to bank shit in bank/petbank
  function viewBank() {
    d.hookOnce('S_VIEW_WARE_EX', 2, (e) => {
      startBank(e)
    })
  }

  //try to bank shit when first opening bank and when changing tabs
  d.hook('C_VIEW_WARE', 'event', () => { if (!d.settings.enabled) return; viewBank() })
  d.hook('S_REQUEST_CONTRACT', 1, (e) => { if (e.type === 26 && d.settings.enabled) { viewBank(); banking = true } })

  //command to do shit, probably make delay configurable at some point
  d.command.add('banker', {
    $none() {
      d.settings.enabled = !d.settings.enabled
      d.command.message(`Auto-Banker is now ${d.settings.enabled ? 'enabled' : 'disabled'}.`)
    },
    delay(ms) {
      d.settings.delay = parseInt(ms, 10)
      d.command.message(`bank delay set to ${d.settings.delay} ms`)
    },
    bl(action, id) {
      const matchedId = id.match(regexId)
      if (!matchedId) return
      const parsedId = parseInt(matchedId[1], 10)

      if (action === 'add') {
        d.settings.blacklist[parsedId] = true
        d.command.message(`added item ${parsedId} to blacklist`)
      } else if (action === 'remove') {
        if (!d.settings.blacklist[parsedId]) return
        delete d.settings.blacklist[parsedId]
        d.command.message(`removed item ${parsedId} from blacklist`)
      }
    }
  })
}
