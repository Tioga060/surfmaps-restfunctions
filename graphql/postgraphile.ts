import { createPostGraphileSchema, withPostGraphileContext } from 'postgraphile';
import { graphql, ExecutionResult } from 'graphql';
import { Pool } from 'pg';

const GQLSchemaLocation = `${__dirname}/../schema.graphql`;
const pgPool = new Pool({connectionString: process.env.PG_QUERY_STRING});

const performQuery = async (
    pgPool: Pool,
    schema: any,
    query: string,
    variables: any,
    jwtToken: string,
) => {
    return await withPostGraphileContext({
        pgPool,
        jwtToken,
        jwtSecret: process.env.JWT_SECRET, // TODO
    }, async (context) => {
        return await graphql(
            schema, // TODO - greenlight queries
            query,
            null,
            {...context},
            variables,
        )
    })
};

type IResultWithID = ExecutionResult & {
    id: string;
};

export interface IQuery {
    query: string;
    variables: any;
    id: string;
}

export const execute = async (
    jwtToken: string,
    query: IQuery,
    schemaName: string = "public",
) => {
    const schema = await createPostGraphileSchema(pgPool, schemaName, {
        classicIds: true,
        dynamicJson: true,
        jwtSecret: process.env.JWT_SECRET, // TODO
        jwtPgTypeIdentifier: 'public.jwt_token',
        //writeCache: GQLSchemaLocation,
        readCache: GQLSchemaLocation,
    });
    const result = await(performQuery(pgPool, schema, query.query, query.variables || {}, jwtToken)) as IResultWithID;
    result.id = query.id;
    return result;
}
