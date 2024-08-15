import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { VENUES_PER_QUERY } from './globalConstants';
import { checkAndUpdateRateLimit, incrementUserExternalQueries } from './userManagement';

const API_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const API_KEY = process.env.API_KEY || "";
const HEADERS = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.userRatingCount,places.rating,places.googleMapsUri,places.types,places.priceLevel'
}
const VENUE_TYPES = ['restaurant', 'bar']

import { Venue }  from "./models/QueryVenue"

export async function fetchNearbyVenuesFromNetwork(latitude: number, longitude: number, forUser: number) {
    console.log("Going to the API")
    if(!await checkAndUpdateRateLimit(forUser)) {
        console.log("User over API limit for the hour. Aborting.")
        return []
    } else {
        await incrementUserExternalQueries(forUser)
    }
    try {
        const data = await axios.post(API_URL, {
            locationRestriction: {
                circle: {
                    center: {
                        latitude: latitude,
                        longitude: longitude
                    },
                    radius: 50000.0,
                }
            },
            // optional parameters
            includedTypes: VENUE_TYPES,
            maxResultCount: VENUES_PER_QUERY,
            rankPreference: 'DISTANCE',
        }, {
            headers: HEADERS
        })
        var venues = []
        for (var i: number = 0; i < data.data.places.length; i++) {
            const venue = data.data.places[i]
            const insertedVenue = await Venue.upsert({
                id: venue.id,
                name: venue.displayName.text,
                rating: venue.rating,
                reviews: venue.userRatingCount,
                latitude: venue.location.latitude,
                longitude: venue.location.longitude,
                categories: venue.types.toString(),
                priceLevel: venue.priceLevel
            })
            //console.log(insertedVenue[0])
            venues.push(insertedVenue[0])
        }
        return venues
    } catch (error) {
        console.log(error);
    }
}