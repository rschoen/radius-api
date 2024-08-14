const {Query, Venue} = require("./models/QueryVenue")
const sequelize = require("./databaseConnection")
const downloadNearbyVenues = require("./networkService")


import { METERS_IN_DEGREE, MAX_VENUES_RETURNED } from './globalConstants';

async function nearbyVenues(latitude: number, longitude: number, maxAgeInDays: number) {
    const venues = await fetchNearbyVenuesFromDatabase(latitude, longitude, maxAgeInDays)
    if(venues.length < MAX_VENUES_RETURNED) {
        //queueNextVenueSearch()
    }
   return venues
}

async function fetchNearbyVenuesFromDatabase(latitude: number, longitude: number, maxAgeInDays: number) {
    const sameSpotThreshold = metersToLatitudeDegrees(20)
    const earliestQueryTimestamp = Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000
    const query = await sequelize.query(`SELECT * FROM Queries WHERE ABS(latitude - ${latitude}) < ${sameSpotThreshold} AND ABS(longitude - ${longitude}) < ${sameSpotThreshold} AND timePerformed > ${earliestQueryTimestamp} ORDER BY timePerformed DESC`, {
        model: Query,
    });
    var queryId = -1
    if(query.length < 1) {
        console.log("Fetching new queries")
        const venues = await downloadNearbyVenues(latitude, longitude);
        queryId = await createQueryRecordInDatabase(latitude,longitude,venues);

    } else {
        queryId = query[0].id
        console.log("Returning cached queries")
    }

    const venues = await Venue.findAll( {
        attributes: ["id","name","rating","reviews","latitude","longitude","imageUrl"],
        include: [ 
        {
            model: Query,
            attributes: [],
            through: {
                attributes: [],
                where: {
                    queryId: queryId
                }
            }
        }
        ]
    })
    return venues
   
}

function latitudeDegreesToMeters(lat: number) {
    return lat * METERS_IN_DEGREE
}
function metersToLatitudeDegrees(meters: number) {
    return meters / METERS_IN_DEGREE
}

async function createQueryRecordInDatabase(latitude: number, longitude: number, venues: typeof Venue) {

    const query = await Query.create( {
        timePerformed: Date.now(),
        latitude: latitude,
        longitude: longitude,
        radius: maxVenueDistance(venues, latitude, longitude)
    });
    for(var i=0; i<venues.length; i++) {
        query.addVenue(venues[i])
    }
    return query.id
}

function maxVenueDistance(venues: typeof Venue, latitude: number, longitude: number) {
    var maxDistance = 0
    for(var i=0; i < venues.length; i++) {
        const distance = cosineDistanceBetweenPoints(latitude, longitude, venues[i].latitude, venues[i].longitude)
        if(distance > maxDistance) {
            maxDistance = distance
        }
    }
    return maxDistance
}

function cosineDistanceBetweenPoints(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const deltaP = p2 - p1;
    const deltaLon = lon2 - lon1;
    const deltaLambda = (deltaLon * Math.PI) / 180;
    const a = Math.sin(deltaP/2) * Math.sin(deltaP/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R;
    return d;
  }
module.exports = nearbyVenues
