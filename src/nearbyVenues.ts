const {Query, Venue, QueryVenue} = require("./models/QueryVenue")
const {sequelize} = require("./databaseConnection")
import { Op } from "sequelize";
import { fetchNearbyVenuesFromNetwork } from "./networkService"
import * as geomath from "./geomath"

import { MAX_VENUES_RETURNED, DELAY_BETWEEN_QUERIES, DELAY_NOISE } from './globalConstants';

const SAME_SPOT_THRESHOLD = geomath.metersToLatitudeDegrees(20)

export async function fetchNearbyVenues(latitude: number, longitude: number, maxAgeInDays: number, forUser: number) {
    const queryId = await findOrCreateQuery(latitude, longitude, maxAgeInDays, forUser)

    const venues = await Venue.findAll( {
        attributes: ["id","name","rating","reviews","latitude","longitude","imageUrl","priceLevel","categories"],
        include: [{
            model: Query,
            required: true,
            attributes: [],
            through: {
                attributes: [],
                where: { queryId: queryId }
            }
        }]
    })

    const complete = venues.length >= MAX_VENUES_RETURNED
    const networkObject = {
        metadata: {
            queryId: queryId,
            resultsComplete: complete
        },
        venues: venues
    }
    return networkObject
   
}

async function queueNextVenueSearchIfNeeded(queryId: string, originalLat: number, originalLng: number, forUser: number) {
    const numVenues = await Venue.count( {
        include: [{
            model: Query,
            required: true,
            attributes: [],
            through: {
                attributes: [],
                where: { queryId: queryId }
            }
        }]
    })
    if (numVenues < MAX_VENUES_RETURNED) {
        const delay = DELAY_BETWEEN_QUERIES + Math.round((Math.random() - 0.5) * DELAY_NOISE)
        setTimeout(performNextVenueSearch, delay, queryId, originalLat, originalLng, forUser)
    }
}

async function performNextVenueSearch(queryId: string, originalLat: number, originalLng: number, forUser: number) {
    const [latitude, longitude] = await calculateNextSearchCenter(queryId, originalLat, originalLng)
    console.log(`Performing next search at ${latitude}, ${longitude}`)
    if(latitude != null && longitude != null) {
        const venues = await fetchNearbyVenuesFromNetwork(latitude, longitude, forUser);
        await insertQueryRecordInDatabase(latitude,longitude,originalLat, originalLng, venues, forUser, queryId);
    }
}

async function calculateNextSearchCenter(queryId: string, originalLat: number, originalLng: number) {
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

async function findOrCreateQuery(latitude: number, longitude: number, maxAgeInDays: number, forUser: number) {
    const earliestQueryTimestamp = Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000
    const query = await sequelize.query(`SELECT * FROM Queries WHERE ABS(latitude - ${latitude}) < ${SAME_SPOT_THRESHOLD} AND ABS(longitude - ${longitude}) < ${SAME_SPOT_THRESHOLD} AND timePerformed > ${earliestQueryTimestamp} ORDER BY timePerformed DESC`, {
        model: Query,
    });
    if(query.length < 1) {
        console.log("Fetching new queries")
        const venues = await fetchNearbyVenuesFromNetwork(latitude, longitude, forUser);
        return await insertQueryRecordInDatabase(latitude,longitude, latitude, longitude, venues, forUser);

    } else {
        console.log("Returning cached queries")
        return query[0].id
    }
}



async function insertQueryRecordInDatabase(latitude: number, longitude: number, homeLatitude: number, homeLongitude: number, venues: typeof Venue, forUser: number, parentQuery: string = "") {

    const query = await Query.create( {
        timePerformed: Date.now(),
        latitude: latitude,
        longitude: longitude,
        radius: maxVenueDistance(venues, homeLatitude, homeLongitude),
        parentQuery: parentQuery,
        user: forUser,
    });

    var linkedQueryId = parentQuery
    if(linkedQueryId == "") {
        linkedQueryId = query.id
    }
    for(var i=0; i<venues.length; i++) {
       await QueryVenue.upsert( {
        VenueId: venues[i].id,
        QueryId: linkedQueryId
       })
    }
    queueNextVenueSearchIfNeeded(linkedQueryId, homeLatitude, homeLongitude, forUser)
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

