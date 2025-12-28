import express, { Express, Request, Response } from 'express';
import routes from './routes';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const swaggerSpec = YAML.load('./src/openapi.yaml');

app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', routes);

app.get('/', (req: Request, res: Response) => {
  res.send('REST API is running.');
});

export default app;
