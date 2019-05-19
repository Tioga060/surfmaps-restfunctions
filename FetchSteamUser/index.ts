import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as SteamAPI from 'steamapi';
import {Pool, PoolClient} from 'pg';

const steam = new SteamAPI(process.env.STEAM_API_KEY);
const pool = new Pool({
    connectionString: process.env.PG_QUERY_STRING,
});

interface IUserSummary {
    avatar: {
        small: string;
        medium: string;
        large: string;
    },
    steamID: string;
    url: string;
    created: number;
    lastLogOff: number;
    nickname: string;
    realName: string;
    primaryGroupID: string;
    personaState: number;
    personaStateFlags: number;
    commentPermission: number;
    visibilityState: number;
    countryCode: string;
    stateCode: string;
};

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    const steamInfo = (req.query.steamInfo || (req.body && req.body.steamInfo));
    // TODO - only let the user do this if theyre logged in
    if (steamInfo) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const steamId = await steam.resolve(steamInfo);
            const userExists = await client.query('select * from public."UserSteamInfo" where "numericSteamId" = $1;', [steamId]);
            if (userExists.rows.length) {
                context.res = {
                    body: {steamUser: userExists.rows[0]}
                }
            }
            else {
                const userSummary: IUserSummary = await steam.getUserSummary(steamId);
                const newUser = await client.query('insert into public."User" values (default, default, default, default) returning id;');
                const userId = newUser.rows[0].id;
                const userSteamInfo = await client.query(`insert into public."UserSteamInfo" 
                values ($1, $2, $3, $4, $5, $6, $7, $8, default, default) returning *;`,
                [userSummary.nickname, userSummary.url, userSummary.avatar.small, userSummary.avatar.medium, userSummary.avatar.large,
                userId, userSummary.steamID, userSummary.created || 0]);
                await client.query('COMMIT');
                context.res = {
                    // status: 200, /* Defaults to 200 */
                    body: {steamUser: userSteamInfo.rows[0]},
                };
            }
        } catch(error) {
            context.log(error);
            await client.query('ROLLBACK');
            context.res = {
                status: 400,
                body: 'Error',
            }
        }
    }
    else {
        context.res = {
            status: 400,
            body: "Please pass a name on the query string or in the request body"
        };
    }
};

export default httpTrigger;
