import { AzureFunction, Context } from "@azure/functions"
import { createPostGraphileSchema } from 'postgraphile';
import { Pool } from 'pg';

const GQLSchemaLocation = `${__dirname}/../schema.graphql`;
const SchemaName = 'public';

const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
    var timeStamp = new Date().toISOString();
    
    if (myTimer.IsPastDue)
    {
        context.log('Timer function is running late!');
    }
    const pgPool = new Pool({connectionString: process.env.PG_ADMIN_STRING});
    await createPostGraphileSchema(pgPool, SchemaName, {
        classicIds: true,
        dynamicJson: true,
        jwtSecret: process.env.JWT_SECRET, // TODO
        jwtPgTypeIdentifier: 'public.jwt_token',
        writeCache: GQLSchemaLocation,
    });
    context.log('Wrote Schema File', timeStamp);   
};

export default timerTrigger;
