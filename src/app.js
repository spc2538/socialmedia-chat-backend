const express = require('express');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const cors = require('cors');

require('dotenv').config();

const app = express();
const swaggerSpec = YAML.load('./src/openapi.yaml');

app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('REST API is running.');
});

module.exports = app;
