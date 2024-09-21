import { DataTypes } from 'sequelize';

const { sequelize } = require('../databaseConnection')

export const Query = sequelize.define('Query', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  timePerformed: DataTypes.INTEGER,
  latitude: DataTypes.DOUBLE,
  longitude: DataTypes.DOUBLE,
  radius: DataTypes.DOUBLE,
  parentQuery: DataTypes.UUID,
  user: DataTypes.INTEGER,
  pagesFetched: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  nextPageToken: {
    type: DataTypes.STRING,
    defaultValue: ""
  },
});
export const Venue = sequelize.define('Venue', {
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
  priceLevel: DataTypes.STRING,
  categories: DataTypes.STRING,
  timeLastUpdated: DataTypes.INTEGER
});

export const QueryVenue = sequelize.define('QueryVenue', {
  distance: DataTypes.DOUBLE,
});


Query.belongsToMany(Venue, { through: QueryVenue });
Venue.belongsToMany(Query, { through: QueryVenue });

sequelize.sync()
