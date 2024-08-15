import { create, all } from 'mathjs'
import { Query } from "./models/QueryVenue"

const math = create(all, {})
math.config({
    number: 'BigNumber'
})
const RADIANS_PER_NAUTICAL_MILE = Math.PI / 180 / 60


import { METERS_IN_DEGREE, MAX_VENUES_RETURNED, METERS_PER_NAUTICAL_MILE } from './globalConstants';


export function pointIsInsideCircle(lat1: number, lon1: number, lat2: number, lon2: number, radius: number) {
    return (cosineDistanceBetweenPoints(lat1, lon1, lat2, lon2) < radius)
}
export function circleIntersections(lat1: number, lon1: number, radius1: number, lat2: number, lon2: number, radius2: number) {
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

        if (DEBUG_MATH) {
            console.log("x1 =" + x1)
            console.log("x2 = " + x2)
        }

        const r1 = math.bignumber(metersToRadians(radius1))
        const r2 = math.bignumber(metersToRadians(radius2))

        const q = math.bignumber(math.dot(x1, x2))
        const qSquare = math.bignumber(math.multiply(q, q) as math.BigNumber)

        if (qSquare.greaterThan(0.999999999999999)) {
            return [[], []]
        }


        if (DEBUG_MATH) {
            console.log("q = " + q)
            console.log("qSquare = " + qSquare)
        }

        const a = math.divide(math.subtract(math.cos(r1), math.multiply(math.cos(r2), q)), math.subtract(1, qSquare))
        const b = math.divide(math.subtract(math.cos(r2), math.multiply(math.cos(r1), q)), math.subtract(1, qSquare))

        if (DEBUG_MATH) {
            console.log("a = " + a)
            console.log("b = " + b)
        }

        const n = math.cross(x1, x2) as math.MathArray
        if (DEBUG_MATH) {
            console.log("n = " + n)
        }

        const x0 = [axPlusBy(a, x1[0], b, x2[0]), axPlusBy(a, x1[1], b, x2[1]), axPlusBy(a, x1[2], b, x2[2])] as math.MathArray
        if (DEBUG_MATH) {
            console.log("x0 = " + x0)
        }
        const ndotn = math.bignumber(math.dot(n, n))
        const numer = math.subtract(math.bignumber(1), math.bignumber(math.dot(x0, x0)))

        if (DEBUG_MATH) {
            console.log("numer = " + numer)
            console.log("ndotn = " + ndotn)
        }
        const insideSqrt = math.divide(numer, ndotn) as math.BigNumber
        const t = math.sqrt(insideSqrt)
        if (math.isComplex(t)) {
            return [[], []]
        }
        const tn = math.multiply(t, n) as math.MathArray //[t*n[0], t * n[1], t*n[2]]

        if (DEBUG_MATH) {
            console.log("t = " + t)
            console.log("tn = " + tn)
        }

        const sol1 = [math.add(x0[0], tn[0]), math.add(x0[1], tn[1]), math.add(x0[2], tn[2])] as math.MathArray
        const sol2 = [math.subtract(x0[0], tn[0]), math.subtract(x0[1], tn[1]), math.subtract(x0[2], tn[2])] as math.MathArray


        if (DEBUG_MATH) {
            console.log("sol1 = " + sol1)
            console.log("sol2 = " + sol2)
        }

        const i1lat = degrees(Math.atan2(math.number(sol1[2] as math.BigNumber), math.number(math.sqrt(math.add(math.pow(sol1[0], 2), math.pow(sol1[1], 2)) as math.BigNumber) as unknown as math.BigNumber)))
        const i1lon = degrees(Math.atan2(math.number(sol1[1] as math.BigNumber), math.number(sol1[0] as math.BigNumber)))

        const i2lat = degrees(math.atan2(math.number(sol2[2] as math.BigNumber), math.number(math.sqrt(math.add(math.pow(sol2[0], 2), math.pow(sol2[1], 2)) as math.BigNumber) as unknown as math.BigNumber)))
        const i2lon = degrees(Math.atan2(math.number(sol2[1] as math.BigNumber), math.number(sol2[0] as math.BigNumber)))

        return [[i1lat, i1lon], [i2lat, i2lon]]
    }
    else {
        console.log("Too far away")
        return [[], []]
    }
}

export function axPlusBy(a: math.MathType, x: math.MathType, b: math.MathType, y: math.MathType) {
    return math.add(math.multiply(a, x), math.multiply(b, y))
}

export function radians(degrees: number) {
    return degrees * Math.PI / 180
}
export function degrees(radians: number) {
    return radians / Math.PI * 180
}

export function latitudeDegreesToMeters(lat: number) {
    return lat * METERS_IN_DEGREE
}
export function metersToLatitudeDegrees(meters: number) {
    return meters / METERS_IN_DEGREE
}
export function metersToNauticalMiles(meters: number) {
    return meters / METERS_PER_NAUTICAL_MILE
}
export function nauticalMilesToRadians(nauticalMiles: number) {
    return nauticalMiles * RADIANS_PER_NAUTICAL_MILE
}
export function metersToRadians(meters: number) {
    return nauticalMilesToRadians(metersToNauticalMiles(meters))
}

export function cosineDistanceBetweenPoints(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const deltaP = p2 - p1;
    const deltaLon = lon2 - lon1;
    const deltaLambda = (deltaLon * Math.PI) / 180;
    const a = Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
        Math.cos(p1) * Math.cos(p2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R;
    return d;
}

export function findClosestNoncoveredIntersection(circles: typeof Query, originalLat: number, originalLng: number) {
    var intersections = []
    for(var i = 0; i < circles.length; i++) {
        for(var j = i + 1; j < circles.length; j++) {
            const circle1 = circles[i]
            const circle2 = circles[j]

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
                for(var k = 0; k < circles.length; k++) {
                    if( k == i || k == j ) {
                        continue
                    }
                    if(pointIsInsideCircle(intersection1[0], intersection1[1], circles[k].latitude, circles[k].longitude, circles[k].radius)) {
                        i1InsideAnotherCircle = true
                    }
                    if(pointIsInsideCircle(intersection2[0], intersection2[1], circles[k].latitude, circles[k].longitude, circles[k].radius)) {
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

    return [null, null]
}