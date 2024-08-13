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

Query.sync({force: true})

module.exports = Query