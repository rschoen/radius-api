import { Sequelize, DataTypes } from 'sequelize';

const { sequelize } = require('../databaseConnection')
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  email: DataTypes.STRING,
  apiKey: DataTypes.STRING,
  queries: DataTypes.INTEGER,
  externalQueries: DataTypes.INTEGER
});

User.sync()


module.exports = User