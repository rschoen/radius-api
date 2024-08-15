import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { VENUES_PER_QUERY } from './globalConstants';

const API_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const API_KEY = process.env.API_KEY || "";
const HEADERS = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.userRatingCount,places.rating,places.googleMapsUri'
}
const VENUE_TYPES = ['restaurant', 'bar']

const { Venue } = require("./models/QueryVenue")

async function downloadNearbyVenues(latitude: number, longitude: number) {
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
            })
            //console.log(insertedVenue[0])
            venues.push(insertedVenue[0])
        }
        return venues
    } catch (error) {
        console.log(error);
    }
}

module.exports = downloadNearbyVenues