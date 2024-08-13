
const User = require('./models/User')

async function apiKeyIsValid(key: string): Promise<boolean> {
    const regexp = new RegExp('^[0-9a-zA-z=-]+$')
    if(!regexp.test(key)) {
        return false
    }

    const user = await User.findOne({
        where: {
            apiKey: key
        }
    })
    console.log(typeof user)
    if(user === null) {
        return false
    }

    return true
}

module.exports = apiKeyIsValid