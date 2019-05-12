const createHandler = require("azure-function-express").createHandler;
import * as express from 'express';
import { postgraphile } from 'postgraphile';
//const cors = require('cors');

const app = express();
const router = express.Router();

const corsOptions = {
    origin: true,
    credentials: true
};

const getJWT = (token: string) => {
    const cookies = token.split('; ');
    const tokenCookie = cookies.find((cookie) => (new RegExp('^token=*').test(cookie)));
    return tokenCookie
        ? tokenCookie.split('token=')[1]
        : '';
}

function authMiddleware(req, res, next) {
    req.headers['authorization'] = `Bearer ${getJWT(req.headers.cookie || '')}`;
    next();
}

// Mount middleware on the GraphQL endpoint
router.use('/graphql', authMiddleware);

// Mount PostGraphile after this middleware
router.use(postgraphile(
    'postgres://postgres:a@localhost:5432/postgres',
    {
        classicIds: true, // -a
        dynamicJson: true, // -j
        exportGqlSchemaPath: './schema.graphql', // TODO
        jwtSecret: 'KEYGOESHERETODO', // TODO
        jwtPgTypeIdentifier: 'public.jwt_token',
        graphiql: true, // TODO
        enableQueryBatching: true,
    }
));
//    "route"     : "{x:regex(^graphi?ql$)}"
app.use('/api', router);

export default createHandler(app);
