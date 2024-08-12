import express, { Express, Request, Response } from "express";
import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';

const dotenv = require('dotenv');
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

/*app.listen(PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });*/

async function requestData() {
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
