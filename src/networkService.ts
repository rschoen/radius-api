import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { VENUES_PER_QUERY } from './globalConstants';
import { checkAndUpdateRateLimit, incrementUserExternalQueries } from './userManagement';

const API_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const API_KEY = process.env.API_KEY || "";
const HEADERS = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.userRatingCount,places.rating,places.googleMapsUri,places.types,places.priceLevel,places.photos'
}
const VENUE_TYPES = ['restaurant', 'bar']

import { Venue }  from "./models/QueryVenue"

export async function fetchNearbyVenuesFromNetwork(latitude: number, longitude: number, forUser: number) {
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
	var imageUrl = ""
	    if(venue.photos != undefined && venue.photos.length > 0) {
		    imageUrl = photoUrlFromPhotoName(venue.photos[0].name)
	    }
            const insertedVenue = await Venue.upsert({
                id: venue.id,
                name: venue.displayName.text,
                rating: venue.rating,
                reviews: venue.userRatingCount,
                latitude: venue.location.latitude,
                longitude: venue.location.longitude,
                categories: venue.types.toString(),
                priceLevel: venue.priceLevel,
                timeLastUpdated: Date.now(),

		imageUrl: imageUrl
            })
            //console.log(insertedVenue[0])
            venues.push(insertedVenue[0])
        }
        return venues
    } catch (error) {
        console.log(error);
    }
}


function photoUrlFromPhotoName(name: string) {
	return "https://places.googleapis.com/v1/" + name + "/media?key=API_KEY&max_width_px=200"
}
