import { Sequelize, DataTypes } from 'sequelize';

const sequelize = require('../databaseConnection')

const Venue = require('./Venue')
const Query = require('./Query')
const QueryVenue = sequelize.define('QueryVenue', {
  venue_id: {
    type: DataTypes.STRING,
    references: {
      model: Venue,
      key: 'id'
    },
  },
  query_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Query,
      key: 'id'
    },
  },
});

Venue.hasMany(QueryVenue)
Query.hasMany(QueryVenue)

QueryVenue.sync()


module.exports = QueryVenue