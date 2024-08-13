import { Sequelize, DataTypes } from 'sequelize';

const sequelize = require('../databaseConnection')

const Query = sequelize.define('Query', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  timePerformed: DataTypes.INTEGER,
  latitude: DataTypes.DOUBLE,
  longitude: DataTypes.DOUBLE,
  radius: DataTypes.DOUBLE,
  parentQuery: DataTypes.INTEGER
});
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


Query.belongsToMany(Venue, { through: 'QueryVenue' });
Venue.belongsToMany(Query, { through: 'QueryVenue' });

Query.sync({force: true})
Venue.sync({force: true})
sequelize.sync()

exports.Query = Query
exports.Venue = Venue