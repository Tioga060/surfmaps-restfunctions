import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobUtilities, createBlobService, BlobService } from 'azure-storage';
import { Pool } from 'pg';
import { verify } from 'jsonwebtoken';
import { getJWT } from '../shared';

const pool = new Pool({
    connectionString: process.env.PG_QUERY_STRING,
});

const userCanGenerateSas = async (containerName: string, token: string): Promise<boolean> => {
    const decoded = await verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded['role'] || !decoded['user_id']) {
        return false;
    }
    await pool.query('BEGIN');
    await pool.query(`select set_config('jwt.claims.role', $1, true), set_config('jwt.claims.user_id', $2, true);`, [decoded['role'], decoded['user_id']]);
    const result = await pool.query('select can_update_map($1)', [containerName]);
    await pool.query('ROLLBACK');
    return result.rowCount > 0 && result.rows[0].can_update_map;
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    const containerName = req.query.container;
    const token = getJWT(req.headers.cookie || '')

    if (containerName && await userCanGenerateSas(containerName, token)) {
        const token = await generateSasToken(context, undefined, containerName, !!req.query.create);
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: token,
        };
    }
    else {
        context.res = {
            status: 400,
            body: "No container specified"
        };
    }
};

interface IContainerResponse {
    created: boolean;
}

const asyncCreateContainer = async (containerName: string, blobService: BlobService): Promise<IContainerResponse> => {
    return new Promise((resolve, reject) => {
        blobService.createContainerIfNotExists(containerName, {publicAccessLevel : 'blob'}, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result as IContainerResponse);
            }
        })
    })
};

const generateSasToken = async (context: Context, blobName: string = undefined, containerName: string, createContainer: boolean = false) => {
    const connString = process.env.AzureWebJobsStorage;
    const blobService = createBlobService(connString);

    if (createContainer) {
        const created = await asyncCreateContainer(containerName, blobService);
        return {
            token: created.created ? `Created ${containerName}` : `${containerName} already exists`,
            uri: '',
        };
    }

    // Create a SAS token that expires in an hour
    // Set start time to five minutes ago to avoid clock skew.
    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - 5);
    const expiryDate = new Date(startDate);
    expiryDate.setMinutes(startDate.getMinutes() + 60);
    const permissions = BlobUtilities.SharedAccessPermissions.WRITE;

    var sharedAccessPolicy = {
        AccessPolicy: {
            Permissions: permissions,
            Start: startDate,
            Expiry: expiryDate
        }
    };
    
    var sasToken = blobService.generateSharedAccessSignature(containerName, blobName, sharedAccessPolicy);
    
    return {
        token: sasToken,
        uri: blobService.getUrl(containerName, blobName, sasToken, true),
    };
}

export default httpTrigger;
