import { Sequelize, DataTypes } from 'sequelize';

const sequelize = require('../databaseConnection')
const Venue = sequelize.define('Venue', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: DataTypes.STRING,
  rating: DataTypes.DOUBLE,
  reviews: DataTypes.INTEGER,
  latitude: DataTypes.DOUBLE,
  longitude: DataTypes.DOUBLE,
  imageUrl: DataTypes.STRING,
  timeLastUpdated: DataTypes.DATE
});

Venue.sync({force: true})


module.exports = Venue