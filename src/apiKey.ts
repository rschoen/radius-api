const {User} = require("./models/User")

export default async function validateAPIKey(key: string): Promise<number> {
    
    
    const regexp = new RegExp('^[0-9a-zA-z=-]+$')
    if(!regexp.test(key)) {
        return -1
    }

    const user = await User.findOne({
        where: {
            apiKey: key
        }
    })
    if(user === null) {
        return -1
    }

    return user.id
}