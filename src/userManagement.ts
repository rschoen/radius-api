const {User} = require("./models/User")
import { MAX_API_CALLS_PER_HOUR } from "./globalConstants";

export async function incrementUserQueries(id: number) {
    await User.increment({ queries: 1 }, { where: { id: id } }); 
}

export async function incrementUserExternalQueries(id: number) {
    await User.increment({ externalQueries: 1 }, { where: { id: id } }); 
}

export async function checkAndUpdateRateLimit(id: number) {
    const user = await User.findOne({
        attributes: ["externalQueriesThisHour", "hourOfLastExternalQuery"],
        where: {
            id: id
        }
    })

    const currentHourString = getHourDateString()
    if (user.hourOfLastExternalQuery != currentHourString) {
        await User.update({
            externalQueriesThisHour: 1,
            hourOfLastExternalQuery: currentHourString
        },
        { 
            where: { id: id }
        })
        return true
    } else if (user.externalQueriesThisHour >= MAX_API_CALLS_PER_HOUR) {
        return false
    } else {
        await User.increment( {
            externalQueriesThisHour: 1
        },
        { 
            where: { id: id }
        })
        return true
    }
}

function getHourDateString() {
    const now = new Date()
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDay()} ${now.getHours()}`
}