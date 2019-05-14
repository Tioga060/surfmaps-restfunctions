import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { execute } from './postgraphile';

const getJWT = (cookieString: string) => {
    const cookies = cookieString.split('; ');
    const tokenCookie = cookies.find((cookie) => (new RegExp('^token=*').test(cookie)));
    return tokenCookie
        ? tokenCookie.split('token=')[1]
        : '';
}

interface IQuery {
    query: string;
    variables: any;
}

const schemaName = 'public';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    const jwtToken = getJWT(req.headers.cookie || '');
    if (req.body && Array.isArray(req.body)) {
        const queries: IQuery[] = [];
        req.body.forEach((query) => {
            if(query && query.query) {
                queries.push({query: query.query, variables: query.variables});
            }
        });
        await Promise.all(queries.map((query) => {
            execute(jwtToken, query.query, process.env.PG_CONNECTION_STRING, schemaName, query.variables);
        }));
        context.res = {
            body: 'Sucessfully committed',
        };
    } else if (req.body && req.body.query) {
        context.res = {
            body: await execute(
                jwtToken,
                req.body.query,
                process.env.PG_CONNECTION_STRING,
                schemaName,
                req.body.variables),
        }
    } else {
        context.res = {
            status: 400,
            body: "No Query Found"
        };
    }
};

export default httpTrigger;
