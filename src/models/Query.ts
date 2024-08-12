import { Sequelize, DataTypes } from 'sequelize';

const sequelize = require('../databaseConnection')
const Query = sequelize.define('Query', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  timePerformed: DataTypes.DATE,
  latitude: DataTypes.DOUBLE,
  longitude: DataTypes.DOUBLE,
  radius: DataTypes.DOUBLE
});

Query.sync()

module.exports = Query