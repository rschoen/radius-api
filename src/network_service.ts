import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { VENUES_PER_QUERY } from './globalConstants';

const API_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const API_KEY = process.env.API_KEY || "";

const Venue = require("./models/Venue")

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
            includedTypes: ['restaurant', 'bar'],
            maxResultCount: VENUES_PER_QUERY,
            rankPreference: 'DISTANCE',
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.userRatingCount,places.rating,places.googleMapsUri'
            }
        })
        var venues = []
        for(var i: number = 0; i < data.data.places.length; i++) {
            const venue = data.data.places[i]
            venues.push(
                await Venue.create( {
                    id: venue.id,
                    name: venue.displayName.text,
                    rating: venue.rating,
                    reviews: venue.userRatingCount,
                    latitude: venue.location.latitude,
                    longitude: venue.location.longitude,
                })
            )
        }
        return venues
    } catch(error) {
        console.log(error);
    }
}

module.exports = downloadNearbyVenues