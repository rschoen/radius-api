const {Query, Venue, QueryVenue} = require("./models/QueryVenue")
const {sequelize} = require("./databaseConnection")
import { Op } from "sequelize";
const downloadNearbyVenues = require("./networkService")
import * as geomath from "./geomath"

import { MAX_VENUES_RETURNED, DELAY_BETWEEN_QUERIES, DELAY_NOISE } from './globalConstants';

async function nearbyVenues(latitude: number, longitude: number, maxAgeInDays: number) {
    const sameSpotThreshold = geomath.metersToLatitudeDegrees(20)
    const earliestQueryTimestamp = Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000
    const query = await sequelize.query(`SELECT * FROM Queries WHERE ABS(latitude - ${latitude}) < ${sameSpotThreshold} AND ABS(longitude - ${longitude}) < ${sameSpotThreshold} AND timePerformed > ${earliestQueryTimestamp} ORDER BY timePerformed DESC`, {
        model: Query,
    });
    var queryId = null
    if(query.length < 1) {
        console.log("Fetching new queries")
        const venues = await downloadNearbyVenues(latitude, longitude);
        queryId = await createQueryRecordInDatabase(latitude,longitude, latitude, longitude, venues);

    } else {
        queryId = query[0].id
        console.log("Returning cached queries")
    }

    const venues = await Venue.findAll( {
        attributes: ["id","name","rating","reviews","latitude","longitude","imageUrl","priceLevel","categories"],
        include: [{
            model: Query,
            attributes: [],
            through: {
                attributes: [],
                where: { queryId: queryId }
            }
        }]
    })

    if(venues.length < MAX_VENUES_RETURNED) {
        queueNextVenueSearch(queryId, latitude, longitude)
    }
    return venues
   
}

function queueNextVenueSearch(queryId: string, originalLat: number, originalLng: number) {
    const delay = DELAY_BETWEEN_QUERIES + Math.round((Math.random() - 0.5) * DELAY_NOISE)
    setTimeout(performNextVenueSearch, delay, queryId, originalLat, originalLng)
}

async function performNextVenueSearch(queryId: string, originalLat: number, originalLng: number) {
    const [latitude, longitude] = await findNextSearchCenter(queryId, originalLat, originalLng)
    console.log(`Performing next search at ${latitude}, ${longitude}`)
    if(latitude != null && longitude != null) {
        const venues = await downloadNearbyVenues(latitude, longitude);
        await createQueryRecordInDatabase(latitude,longitude,originalLat, originalLng, venues, queryId);
    }
}

async function findNextSearchCenter(queryId: string, originalLat: number, originalLng: number) {
    const queries = await Query.findAll({
        where: {
            [Op.or]: [
                {
                    id: queryId
                },
                {
                    parentQuery: queryId
                }
            ]
        }
    })

    if(queries.length == 1) {
        return [queries[0].latitude - geomath.metersToLatitudeDegrees(queries[0].radius), queries[0].longitude]
    } else {
        return geomath.findClosestNoncoveredIntersection(queries, originalLat, originalLng)
    }
}



async function createQueryRecordInDatabase(latitude: number, longitude: number, homeLatitude: number, homeLongitude: number, venues: typeof Venue, parentQuery: string = "") {

    const query = await Query.create( {
        timePerformed: Date.now(),
        latitude: latitude,
        longitude: longitude,
        radius: maxVenueDistance(venues, homeLatitude, homeLongitude),
        parentQuery: parentQuery,
    });
    for(var i=0; i<venues.length; i++) {
       await QueryVenue.create( {
        VenueId: venues[i].id,
        QueryId: query.id
       })
    }
    return query.id
}

function maxVenueDistance(venues: typeof Venue, latitude: number, longitude: number) {
    var maxDistance = 0
    for(var i=0; i < venues.length; i++) {
        const distance = geomath.cosineDistanceBetweenPoints(latitude, longitude, venues[i].latitude, venues[i].longitude)
        if(distance > maxDistance) {
            maxDistance = distance
        }
    }
    return maxDistance
}


exports.nearbyVenues = nearbyVenues
