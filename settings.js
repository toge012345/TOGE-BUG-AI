//BUG WHATSAPP BOT 

const fs = require('fs')
const chalk = require('chalk')

//session
global.sessionid ='ur session id'

//owmner v card
global.ytname = "YT: kenzo3146" //ur yt chanel name
global.socialm = "GitHub: toge012345" //ur github or insta name
global.location = "Africa, Gabon, Libreville" //ur location

//new
global.botname = '𝚃𝙾𝙶𝙴-𝙱𝚄𝙶-𝚅𝟸' //ur bot name
global.ownernumber = '13038480418' //ur owner number
global.ownername = '𝚃𝙾𝙶𝙴 𝙸𝙽𝚄𝙼𝙰𝙺𝙸' //ur owner name
global.websitex = "https://chat.whatsapp.com/JQ4s2pJuBReE7YL9wKJPHo"
global.wagc = "https://whatsapp.com/channel/0029VaiuD4s4IBhI0fzbv40Z"
global.themeemoji = '👾'
global.wm = "𝚃𝙾𝙶𝙴-𝙱𝚄𝙶-𝚅𝟸"
global.botscript = 'https://github.com/toge012345/TOGE-BUG-V2' //script link
global.packname = "𝚃𝙾𝙶𝙴-𝙱𝚄𝙶-𝚅𝟸"
global.author = "𝚃𝙾𝙶𝙴 𝙸𝙽𝚄𝙼𝙰𝙺𝙸"
global.creator = "6283833304947@s.whatsapp.net"
global.xprefix = '.'
global.premium = ["6283833304947"] // Premium User
global.hituet = 0

//bot sett
global.typemenu = 'v4'
global.typereply = 'v1'
global.autoblocknumber = '212' //set autoblock country code
global.antiforeignnumber = '1' //set anti foreign number country code
global.welcome = false //welcome/left in groups
global.anticall = false //bot blocks user when called
global.autoswview = false //auto status/story view
global.adminevent = false //show promote/demote message
global.groupevent = false //show update messages in group chat
//msg
global.mess = {
	limit: 'Your limit is up!',
	nsfw: 'Nsfw is disabled in this group, Please tell the admin to enable',
    done: 'Done✓',
    error: 'Error!',
    success: 'Here you go!'
}
//thumbnail
global.thumb = fs.readFileSync('./lib/theme/thumb.jpg')

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update'${__filename}'`))
    delete require.cache[file]
    require(file)
})
