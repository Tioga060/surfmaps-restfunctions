import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobUtilities, createBlobService } from 'azure-storage';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    const containerName = req.query.container;
    // TODO - check for user permissions before granting them a token
    if (containerName) {
        const token = generateSasToken(context, undefined, containerName);
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

const generateSasToken = (context: Context, blobName: string = undefined, containerName: string) => {
    const connString = process.env.AzureWebJobsStorage;
    const blobService = createBlobService(connString);

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
        uri: blobService.getUrl(containerName, blobName, sasToken, true)
    };
}

export default httpTrigger;
