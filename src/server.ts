import express, { Express, Request, Response } from "express";
import { PORT } from './globalConstants';

const apiKeyIsValid = require('./api_key')
const nearbyVenues = require('./venue_search')

const app = express();

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

     var maxAgeInDays = 7
     if("max_age" in query) {
        const re = RegExp("^[1-7]$")
        if(query["max_age"] == undefined || !re.test(query["max_age"]!.toString())) {
            error["Error"] = "Invalid max_age parameter."
            res.send(error)
            return
        }

        maxAgeInDays = Number.parseInt(query["max_age"]!.toString())
    }

     const lat = parseFloat(query["latitude"]!.toString())
     const lng = parseFloat(query["longitude"]!.toString())
     if(Number.isNaN(lat) || Number.isNaN(lng)) {
        error["Error"] = "Both 'latitude' and 'longitude' must be a floating-point number."
        res.send(error)
        return
     }

     return res.send(await nearbyVenues(lat, lng, maxAgeInDays))

});

app.listen(PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${PORT}`);
  });

/*
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function keepSleeping() {
    while(true) {
        await sleep(2000)
    }
}

keepSleeping()*/

