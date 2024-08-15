import { Sequelize } from "sequelize";

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite',
    logging: false,
    logQueryParameters: true,
  });


exports.sequelize = sequelize
