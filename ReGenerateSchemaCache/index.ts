import { AzureFunction, Context } from "@azure/functions"
import { createPostGraphQLSchema } from 'postgraphile';
import { Pool } from 'pg';

const GQLSchemaLocation = `${__dirname}/../schema.graphql`;
const SchemaName = 'public';

const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
    var timeStamp = new Date().toISOString();
    
    if (myTimer.IsPastDue)
    {
        context.log('Timer function is running late!');
    }
    const pgPool = new Pool({connectionString: process.env.PG_CONNECTION_STRING});
    await createPostGraphQLSchema(pgPool, SchemaName, {
        classicIds: true,
        dynamicJson: true,
        jwtSecret: process.env.JWT_SECRET, // TODO
        jwtPgTypeIdentifier: 'public.jwt_token',
        writeCache: GQLSchemaLocation,
    });
    context.log('Wrote Schema File', timeStamp);   
};

export default timerTrigger;
