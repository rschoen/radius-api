const {Query, Venue, QueryVenue} = require("./models/QueryVenue")
const {sequelize} = require("./databaseConnection")
import { Op } from "sequelize";
const downloadNearbyVenues = require("./networkService")
import { create, all } from 'mathjs'

const config = { }
const math = create(all, config)
math.config({
    number: 'BigNumber'
  })


const DELAY_BETWEEN_QUERIES = 1 * 1000
const DELAY_NOISE = 1 * 1000
//const METERS_PER_MILE = 1609.34
const RADIANS_PER_NAUTICAL_MILE = Math.PI / 180 / 60

import { METERS_IN_DEGREE, MAX_VENUES_RETURNED, METERS_PER_NAUTICAL_MILE } from './globalConstants';

async function nearbyVenues(latitude: number, longitude: number, maxAgeInDays: number) {
    const sameSpotThreshold = metersToLatitudeDegrees(20)
    const earliestQueryTimestamp = Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000
    const query = await sequelize.query(`SELECT * FROM Queries WHERE ABS(latitude - ${latitude}) < ${sameSpotThreshold} AND ABS(longitude - ${longitude}) < ${sameSpotThreshold} AND timePerformed > ${earliestQueryTimestamp} ORDER BY timePerformed DESC`, {
        model: Query,
    });
    var queryId = null
    if(query.length < 1) {
        console.log("Fetching new queries")
        const venues = await downloadNearbyVenues(latitude, longitude);
        //console.log(venues)
        queryId = await createQueryRecordInDatabase(latitude,longitude, latitude, longitude, venues);

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

    if(venues.length < MAX_VENUES_RETURNED) {
        queueNextVenueSearch(queryId, latitude, longitude)
    }
    return venues
   
}

function queueNextVenueSearch(queryId: number, originalLat: number, originalLng: number) {
    const delay = DELAY_BETWEEN_QUERIES + Math.round((Math.random() - 0.5) * DELAY_NOISE)
    setTimeout(performNextVenueSearch, delay, queryId, originalLat, originalLng)
}

async function performNextVenueSearch(queryId: number, originalLat: number, originalLng: number) {
    const [latitude, longitude] = await findNextSearchCenter(queryId, originalLat, originalLng)
    console.log(`Performing next search at ${latitude}, ${longitude}`)
    if(latitude != null && longitude != null) {
        const venues = await downloadNearbyVenues(latitude, longitude);
        await createQueryRecordInDatabase(latitude,longitude,originalLat, originalLng, venues, queryId);
    }
}

async function findNextSearchCenter(queryId: number, originalLat: number, originalLng: number) {
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
        return [queries[0].latitude - metersToLatitudeDegrees(queries[0].radius), queries[0].longitude]
    } else {

        var intersections = []
        for(var i = 0; i < queries.length; i++) {
            for(var j = i + 1; j < queries.length; j++) {
                const circle1 = queries[i]
                const circle2 = queries[j]

                //console.log(`Checking circles ${circle1.latitude},${circle1.longitude} (r=${circle1.radius}) and ${circle2.latitude},${circle2.longitude} (r=${circle2.radius})`)

                const [intersection1, intersection2] = circleIntersections(circle1.latitude,
                    circle1.longitude,
                    circle1.radius,
                    circle2.latitude,
                    circle2.longitude,
                    circle2.radius)


                if(intersection1.length > 0 && intersection2.length > 0)  {

                    // at ${intersection1} and ${intersection2}`)
                    var i1InsideAnotherCircle = false
                    var i2InsideAnotherCircle = false
                    for(var k = 0; k < queries.length; k++) {
                        if( k == i || k == j ) {
                            continue
                        }
                        if(pointIsInsideCircle(intersection1[0], intersection1[1], queries[k].latitude, queries[k].longitude, queries[k].radius)) {
                            i1InsideAnotherCircle = true
                        }
                        if(pointIsInsideCircle(intersection2[0], intersection2[1], queries[k].latitude, queries[k].longitude, queries[k].radius)) {
                            i2InsideAnotherCircle = true
                        }
                    }
                    if(!i1InsideAnotherCircle) {
                        intersections.push(intersection1)
                    }
                    if(!i2InsideAnotherCircle) {
                        intersections.push(intersection2)
                    }
                }
            }
        }

        var closestIntersection = -1
        var closestDistance = 9999999999999.9
        for(var i=0; i<intersections.length; i++) {
            const distance = cosineDistanceBetweenPoints(originalLat, originalLng, intersections[i][0], intersections[i][1])
            if(distance < closestDistance) {
                closestDistance = distance
                closestIntersection = i
            }
        }

        if(closestIntersection >= 0) {
            return intersections[closestIntersection]
        }
    }
    return [null, null]
}

function pointIsInsideCircle(lat1: number, lon1: number, lat2: number, lon2: number, radius: number) {
    return (cosineDistanceBetweenPoints(lat1, lon1, lat2, lon2) < radius)
}
function circleIntersections(lat1: number, lon1: number, radius1: number, lat2: number, lon2: number, radius2: number) {
    const distanceBetween = cosineDistanceBetweenPoints(lat1, lon1, lat2, lon2)
    
    const DEBUG_MATH = false
    if (DEBUG_MATH) {
        console.log("Distance between points: " + distanceBetween)
    }
    if (distanceBetween < radius1 + radius2) {

        

        lat1 = radians(lat1)
        lon1 = radians(lon1)
        lat2 = radians(lat2)
        lon2 = radians(lon2)
        const x1 = [math.bignumber(math.cos(lon1) * math.cos(lat1)), math.bignumber(math.sin(lon1) * math.cos(lat1)), math.bignumber(math.sin(lat1))]
        const x2 = [math.bignumber(math.cos(lon2) * math.cos(lat2)), math.bignumber(math.sin(lon2) * math.cos(lat2)), math.bignumber(math.sin(lat2))]
        
        if(DEBUG_MATH) {
            console.log("x1 =" + x1)
            console.log("x2 = " + x2)
        }

        const r1 = math.bignumber(metersToRadians(radius1))
        const r2 = math.bignumber(metersToRadians(radius2))

        const q = math.bignumber(math.dot(x1,x2))
        const qSquare = math.bignumber(math.multiply(q,q) as math.BigNumber)

        if(qSquare.greaterThan(0.999999999999999)) {
            return [[], []]
        }


        if(DEBUG_MATH) {
            console.log("q = " + q)
            console.log("qSquare = " + qSquare)
        }

        const a = math.divide(math.subtract(math.cos(r1), math.multiply(math.cos(r2),q)), math.subtract(1,qSquare))
        const b = math.divide(math.subtract(math.cos(r2), math.multiply(math.cos(r1),q)), math.subtract(1,qSquare))

        if(DEBUG_MATH) {
            console.log("a = " + a)
            console.log("b = " + b)
        }

        const n = math.cross(x1,x2) as math.MathArray
        if(DEBUG_MATH) {
           console.log("n = " + n)
        }

        const x0 = [axPlusBy(a,x1[0],b,x2[0]), axPlusBy(a,x1[1],b,x2[1]), axPlusBy(a,x1[2],b,x2[2])] as math.MathArray
        if(DEBUG_MATH) {
            console.log("x0 = " + x0)
        }
        const ndotn = math.bignumber(math.dot(n,n))
        const numer = math.subtract(math.bignumber(1),math.bignumber(math.dot(x0,x0)))

        if(DEBUG_MATH) {
            console.log("numer = " + numer)
            console.log("ndotn = " + ndotn)
        }
        const insideSqrt = math.divide(numer,ndotn) as math.BigNumber
        const t = math.sqrt(insideSqrt)
        if(math.isComplex(t)) {
            return [[],[]]
        }
        const tn = math.multiply(t,n) as math.MathArray //[t*n[0], t * n[1], t*n[2]]

        if(DEBUG_MATH) {
            console.log("t = " + t)
            console.log("tn = " + tn)
        }

        const sol1 = [math.add(x0[0],tn[0]), math.add(x0[1],tn[1]), math.add(x0[2],tn[2])] as math.MathArray
        const sol2 = [math.subtract(x0[0],tn[0]), math.subtract(x0[1],tn[1]), math.subtract(x0[2],tn[2])] as math.MathArray

        
        if(DEBUG_MATH) {
            console.log("sol1 = " + sol1)
            console.log("sol2 = " + sol2)
        }

        const i1lat = degrees(Math.atan2(math.number(sol1[2] as math.BigNumber), math.number(math.sqrt(math.add(math.pow(sol1[0],2),math.pow(sol1[1],2)) as math.BigNumber) as unknown as math.BigNumber)))
        const i1lon = degrees(Math.atan2(math.number(sol1[1] as math.BigNumber), math.number(sol1[0] as math.BigNumber)))
        
        const i2lat = degrees(math.atan2(math.number(sol2[2] as math.BigNumber), math.number(math.sqrt(math.add(math.pow(sol2[0],2),math.pow(sol2[1],2)) as math.BigNumber) as unknown as math.BigNumber)))
        const i2lon = degrees(Math.atan2(math.number(sol2[1] as math.BigNumber), math.number(sol2[0] as math.BigNumber)))

        return [[i1lat, i1lon], [i2lat, i2lon]]
    }
    else {
        console.log("Too far away")
        return [[], []]
    }
}

function axPlusBy(a: math.MathType, x: math.MathType, b: math.MathType, y: math.MathType) {
    return math.add(math.multiply(a,x), math.multiply(b,y))
}

function radians(degrees: number) {
    return degrees * Math.PI / 180
}
function degrees(radians: number) {
    return radians / Math.PI * 180
}

function latitudeDegreesToMeters(lat: number) {
    return lat * METERS_IN_DEGREE
}
function metersToLatitudeDegrees(meters: number) {
    return meters / METERS_IN_DEGREE
}
function metersToNauticalMiles(meters: number) {
    return meters / METERS_PER_NAUTICAL_MILE
}
function nauticalMilesToRadians(nauticalMiles: number) {
    return nauticalMiles * RADIANS_PER_NAUTICAL_MILE
}
function metersToRadians(meters: number) {
    return nauticalMilesToRadians(metersToNauticalMiles(meters))
}

async function createQueryRecordInDatabase(latitude: number, longitude: number, homeLatitude: number, homeLongitude: number, venues: typeof Venue, parentQuery: number = -1) {

    const query = await Query.create( {
        timePerformed: Date.now(),
        latitude: latitude,
        longitude: longitude,
        radius: maxVenueDistance(venues, homeLatitude, homeLongitude),
        parentQuery: parentQuery,
    });
    for(var i=0; i<venues.length; i++) {
        //console.log(venues[i][0])
        /*Venue.upsert(venues[i], {where: {id: venues[i].id}})
        QueryVenue.upsert({
            venueId: venues[i],
            queryId: query.id
        },{ where: {
            venueId: venues[i],
            queryId: query.id}
        })*/
       //console.log(venues[i])
       //await query.addVenue(venues[i])
       //console.log(`Venue: ${venues[i].id}, query: ${query.id}`)
       //console.log(venues[i][0].name)
       //try {
       await QueryVenue.create( {
        VenueId: venues[i].id,
        QueryId: query.id
       })
    //} catch (err) {
        // print the error details
    //    console.log(err);
    //  }
    }
    return query.id
}

function maxVenueDistance(venues: typeof Venue, latitude: number, longitude: number) {
    var maxDistance = 0
    //console.log(venues)
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

exports.nearbyVenues = nearbyVenues
exports.circleIntersections = circleIntersections
