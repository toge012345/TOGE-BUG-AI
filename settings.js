//TOGE MD WHATSAPP BOT 

const fs = require('fs')
const chalk = require('chalk')

//session
global.sessionid ='ur session id'

//owmner v card
global.ytname = "YT: kenzo3146" //ur yt chanel name
global.socialm = "GitHub: toge012345" //ur github or insta name
global.location = "United state, New York, Manhattan" //ur location

//new
global.botname = 'TOGE-MD' //ur bot name
global.ownernumber = '13038480418' //ur owner number
global.ownername = '•.¸♡ 𝐓𝐎𝐆𝐄 𝐈𝐍𝐔𝐌𝐀𝐊𝐈 ♡¸.•' //ur owner name
global.websitex = "https://youtube.com/@kenzo3146?si=Lqo5o0SRMEOsPr0D"
global.wagc = "https://whatsapp.com/channel/0029VaYtF0Z2975CYz9Fmv2k"
global.themeemoji = '🍫'
global.wm = "TOGE-MD"
global.botscript = 'https://github.com/toge012345/TOGE-MD' //script link
global.packname = "Sticker By"
global.author = "•.¸♡ 𝐓𝐎𝐆𝐄 𝐈𝐍𝐔𝐌𝐀𝐊𝐈 ♡¸.•\n\n+13038480418"
global.creator = "13038480418@s.whatsapp.net"
global.xprefix = '.'
global.premium = ["13038480418"] // Premium User
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
global.thumb = fs.readFileSync('./TogeMedia/theme/togepic.jpg')

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update'${__filename}'`))
    delete require.cache[file]
    require(file)
})
