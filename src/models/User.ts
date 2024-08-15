import {DataTypes } from 'sequelize';

const { sequelize } = require('../databaseConnection')
export const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  email: DataTypes.STRING,
  apiKey: DataTypes.STRING,
  queries: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  externalQueries: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  externalQueriesThisHour: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  hourOfLastExternalQuery: DataTypes.STRING,
});

User.sync()