import { createPostGraphQLSchema, withPostGraphQLContext } from 'postgraphile';
import { graphql } from 'graphql';
import { Pool } from 'pg';

const GQLSchemaLocation = `${__dirname}/../schema.graphql`;

const performQuery = async (
    pgPool: Pool,
    schema: any,
    query: string,
    variables: any,
    jwtToken: string,
) => {
    return await withPostGraphQLContext({
        pgPool,
        jwtToken,
        jwtSecret: process.env.JWT_SECRET, // TODO
    }, async (context) => {
        return await graphql(
            schema,
            query,
            null,
            {...context},
            variables,
        )
    })
};

export const execute = async (
    jwtToken: string,
    query: string,
    connectionString: string,
    schemaName: string = "public",
    variables: any = {},
) => {
    const pgPool = new Pool({connectionString});
    const schema = await createPostGraphQLSchema(undefined, schemaName, {
        classicIds: true,
        dynamicJson: true,
        jwtSecret: process.env.JWT_SECRET, // TODO
        jwtPgTypeIdentifier: 'public.jwt_token',
        //writeCache: GQLSchemaLocation,
        readCache: GQLSchemaLocation,
    });
    const result = await(performQuery(pgPool, schema, query, variables, jwtToken));
    return result;
}
