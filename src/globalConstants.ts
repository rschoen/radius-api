
const dotenv = require('dotenv');
dotenv.config();

export const MAX_VENUES_RETURNED = 200
export const VENUES_PER_QUERY = 20
export const METERS_IN_DEGREE = 111_139
export const METERS_PER_NAUTICAL_MILE = 1852
export const PORT = process.env.PORT || 3491;
export const DELAY_BETWEEN_QUERIES = 1 * 1000
export const DELAY_NOISE = 1 * 1000