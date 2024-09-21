import express, { Express, Request, Response } from "express";
import { PORT, METERS_PER_NAUTICAL_MILE } from './globalConstants';
import { incrementUserQueries } from "./userManagement";
var https = require('https');
var fs = require('fs');
import validateAPIKey from "./apiKey"
const {fetchNearbyVenues, fetchPagedResults} = require('./nearbyVenues')
//const {circleIntersections} = require('./geomath')

const MINIMUM_EXPIRATION_DAYS = 1
const MAXIMUM_EXPIRATION_DAYS = 90
const DEFAULT_EXPIRATION_DAYS = 7

var credentials = {
	key: fs.readFileSync("/etc/letsencrypt/live/fellyeah.duckdns.org/privkey.pem"),
	cert: fs.readFileSync("/etc/letsencrypt/live/fellyeah.duckdns.org/fullchain.pem")
}

const app = express();

app.get('^/status', (req: Request, res: Response) => {
    const status = {
        "Status": "Running"
    };
    res.send(status);
});

app.get('^/nearby?', async (req: Request, res: Response) => {
    

    const [userId, lat, lng, maxAgeInDays, updatedSince, errorString] = await checkAllRequestValues(req)
    if(errorString != "") {
        var error = {
            "Error": errorString
        };
        res.send(error)
        return
    }

    await incrementUserQueries(userId)
    return res.send(await fetchNearbyVenues(lat, lng, maxAgeInDays, userId, updatedSince))

});

app.get('^/pagedResults?', async (req: Request, res: Response) => {
    const [userId, lat, lng, maxAgeInDays, _, errorString] = await checkAllRequestValues(req)
    if(errorString != "") {
        var error = {
            "Error": errorString
        };
        res.send(error)
        return
    }

    var pageToken = ""
    if("nextPageToken" in req.query) {
        pageToken = await checkNextPageToken(req)
        if(pageToken == "") {
            var error = {"Error": "Invalid nextPageToken parameter."};
            res.send(error)
            return
        }
    }

    await incrementUserQueries(userId)
    return res.send(await fetchPagedResults(lat, lng, maxAgeInDays, userId, pageToken))

});


var httpsServer = https.createServer(credentials, app)
httpsServer.listen(PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${PORT}`);
});

//console.log(circleIntersections(37.765339, -122.428383, 1000, 37.766140, -122.432730, 1000))
//console.log(circleIntersections(37.673442, -90.234036, 107.5 * METERS_PER_NAUTICAL_MILE, 36.109997, -90.953669, 145 * METERS_PER_NAUTICAL_MILE))

async function checkQueryApiKey(req: Request): Promise<number> {
    const query = req.query
    if (!("key" in query) || query["key"] == undefined || query["key"] == "") {
        return -1
    }

    return await validateAPIKey(query["key"]!.toString())
}

async function checkQueryLatLng(req: Request): Promise<[number, number]> {
    const query = req.query
    if (!("latitude" in query) || !("longitude" in query) || query["latitude"] == undefined || query["longitude"] == undefined) {
        return [NaN, NaN]
    }
    const lat = parseFloat(query["latitude"]!.toString())
    const lng = parseFloat(query["longitude"]!.toString())
    return [lat, lng]
}

async function checkQueryMaxAge(req: Request): Promise<number> {
    const query = req.query
    const re = RegExp("^[0-9]+$")
    if (query["max_age"] == undefined || !re.test(query["max_age"]!.toString())) {
        return -1
    }

    const maxAgeInDays = Number.parseInt(query["max_age"]!.toString())
    if(maxAgeInDays > MAXIMUM_EXPIRATION_DAYS || maxAgeInDays < MINIMUM_EXPIRATION_DAYS) {
        return -1
    }

    return maxAgeInDays
}

async function checkQueryUpdatedSince(req: Request): Promise<number> {
    const query = req.query
    const re = RegExp("^[0-9]+$")
    if (query["updated_since"] == undefined || !re.test(query["updated_since"]!.toString())) {
        return -1
    }

    return Number.parseInt(query["updated_since"]!.toString())
}

async function checkNextPageToken(req: Request): Promise<string> {
    const query = req.query
    if(!("nextPageToken" in query)) {
        return ""
    }
    return query["nextPageToken"]?.toString() ?? ""
}

async function checkAllRequestValues(req: Request): Promise<[number, number, number, number, number, string]> {
    const userId = await checkQueryApiKey(req)

    if (userId < 0) {
        return errorArray("API key is invalid.")
    }

    const [lat, lng] = await checkQueryLatLng(req)

    if (Number.isNaN(lat) || Number.isNaN(lng)) {

        return errorArray("Both 'latitude' and 'longitude' must be a floating-point number.")
    }

    var maxAgeInDays = DEFAULT_EXPIRATION_DAYS
    if ("max_age" in req.query) {
        maxAgeInDays = await checkQueryMaxAge(req)
        if (maxAgeInDays < 0) {
            return errorArray("Invalid max_age parameter.")
        }
    }

    var updatedSince = 0
    if ("updated_since" in req.query) {
        updatedSince = await checkQueryUpdatedSince(req)
        if (updatedSince < 0) {
            return errorArray("Invalid updated_since parameter.")
        }
    }

    return [userId, lat, lng, maxAgeInDays, updatedSince, ""]

}

function errorArray(error: string): [number, number, number, number, number, string] {
    return [-1, -1, -1, -1, -1, error]
}
