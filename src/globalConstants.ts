
const dotenv = require('dotenv');
dotenv.config();

export const MAX_VENUES_RETURNED = 200
export const VENUES_PER_QUERY = 20
export const METERS_IN_DEGREE = 111_139
export const PORT = process.env.PORT || 3491;