import express, { Express, Request, Response } from "express";
import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';

const dotenv = require('dotenv');
const apiKeyIsValid = require('./api_key')
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3491;
const API_KEY = process.env.API_KEY || "";

app.get('^/status', (req: Request, res: Response) => {
    const status = {
        "Status": "Running"
     };
     res.send(status);
});

app.get('^/nearby?', async (req: Request, res: Response) => {
     var error = {
        "Error": ""
     };
     const query = req.query

     if(!("key" in query) || query["key"] == undefined || query["key"] == "") {
        error["Error"] = "Parameter 'key' is required."
        res.send(error)
        return
     }
     if(! await apiKeyIsValid(query["key"]!.toString())) {
        error["Error"] = "API key is invalid."
        res.send(error)
        return
     }

     if(!("latitude" in query) || !("longitude" in query) || query["latitude"] == undefined || query["longitude"] == undefined) {
        error["Error"] = "Both 'latitude' and 'longitude' parameters are required."
        res.send(error)
        return
     }

     const lat = parseFloat(query["latitude"]!.toString())
     const lng = parseFloat(query["longitude"]!.toString())
     if(Number.isNaN(lat) || Number.isNaN(lng)) {
        error["Error"] = "Both 'latitude' and 'longitude' must be a floating-point number."
        res.send(error)
        return
     }

     

     console.log(req.query)

     res.send(error);
});

app.listen(PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${PORT}`);
  });


async function requestData() {
    return
    try {
        const Venue = await require('./models/Venue')
        const data = await axios.post('https://places.googleapis.com/v1/places:searchNearby', {
            locationRestriction: {
                circle: {
                center: {
            latitude: 37.7937,
            longitude: -122.3965
                },
                radius: 500.0,
            }
            },
            // optional parameters
            includedTypes: ['restaurant', 'bar'],
            maxResultCount: 3,
            rankPreference: 'DISTANCE',
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.userRatingCount,places.rating,places.googleMapsUri'
            }
        })

        for(var i: number = 0; i < data.data.places.length; i++) {
            const venue = data.data.places[i]
            Venue.create( {
                id: venue.id,
                name: venue.displayName.text,
                rating: venue.rating,
                reviews: venue.userRatingCount,
                latitude: venue.location.latitude,
                longitude: venue.location.longitude,
            })
        }
    } catch(error) {
        console.log(error);
    }
}

requestData();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function keepSleeping() {
    while(true) {
        await sleep(2000)
    }
}

keepSleeping()

