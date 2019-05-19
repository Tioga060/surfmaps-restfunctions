import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { execute, IQuery } from './postgraphile';

const getJWT = (cookieString: string) => {
    const cookies = cookieString.split('; ');
    const tokenCookie = cookies.find((cookie) => (new RegExp('^token=*').test(cookie)));
    return tokenCookie
        ? tokenCookie.split('token=')[1]
        : '';
}

const schemaName = 'public';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const jwtToken = getJWT(req.headers.cookie || '');
    if (req.body && Array.isArray(req.body)) {
        const queries: IQuery[] = [];
        req.body.forEach((query) => {
            if(query && query.query) {
                queries.push({query: query.query, variables: query.variables, id: query.id});
            }
        });
        const results = await Promise.all(queries.map((query) => (
            execute(jwtToken, query, schemaName)
        )));
        context.res = {
            body: results,
        };
    } else if (req.body && req.body.query) {
        const query = {query: req.body.query, variables: req.body.variables} as IQuery;
        context.res = {
            body: await execute(
                jwtToken,
                query,
                schemaName),
        }
    } else {
        context.res = {
            status: 400,
            body: "No Query Found"
        };
    }
};

export default httpTrigger;
