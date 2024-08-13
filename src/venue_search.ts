const Venue = require("./models/Venue")
const Query = require("./models/Query")
const QueryVenue = require("./models/QueryVenue")
const sequelize = require("./databaseConnection")
const downloadNearbyVenues = require("./network_service")


import { METERS_IN_DEGREE } from './globalConstants';

async function nearbyVenues(latitude: number, longitude: number, maxAgeInDays: number) {
    const venues = await fetchNearbyVenuesFromDatabase(latitude, longitude, maxAgeInDays)
    /*if(venues.length < MAX_VENUES_RETURNED) {
        queueNextVenueSearch()
    }*/
   return venues
}

async function fetchNearbyVenuesFromDatabase(latitude: number, longitude: number, maxAgeInDays: number) {
    const sameSpotThreshold = metersToLatitudeDegrees(20)
    const earliestQueryTimestamp = Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000
    const query = await sequelize.query(`SELECT * FROM Queries WHERE ABS(latitude - ${latitude}) < ${sameSpotThreshold} AND ABS(longitude - ${longitude}) < ${sameSpotThreshold} AND timePerformed > ${earliestQueryTimestamp} ORDER BY timePerformed DESC`, {
        model: Query,
    });

    if(query.length < 1) {
        const venues = await downloadNearbyVenues(latitude, longitude);
        createQueryRecordInDatabase(latitude,longitude,venues);
        return venues

    } else {
        // return cached venues from that query
        console.log("QUERY FOUND")
        console.log(query[0])
    }
   
}

function latitudeDegreesToMeters(lat: number) {
    return lat * METERS_IN_DEGREE
}
function metersToLatitudeDegrees(meters: number) {
    return meters / METERS_IN_DEGREE
}

function createQueryRecordInDatabase(latitude: number, longitude: number, venues: typeof Venue) {

    const query = Query.create( {
        timePerformed: Date.now(),
        latitude: latitude,
        longitude: longitude,
        radius: maxVenueRadius(venues)
    });
    for(var i=0; i<venues.length; i++) {
        QueryVenue.create( {
            query_id: query.id,
            venue_id: venues[i].id
        })
    }
}

function maxVenueRadius(venues: typeof Venue) {
    return 100.0 // TODO
}
module.exports = nearbyVenues
