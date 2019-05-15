import { AzureFunction, Context } from "@azure/functions"
import {Pool} from 'pg';

const ALLOWED_IMAGE_EXTENSIONS = [
    'jpeg',
    'JPEG',
    'jpg',
    'JPG',
    'png',
    'PNG',
];

interface IEventGridEvent {
    topic: string;
    subject: string;
    eventType: string;
    eventTime: string;
    id: string;
    data: {
        api: string;
        clientRequestId: string;
        requestId: string;
        eTag: string;
        contentType: string;
        contentLength: number;
        blobType: string;
        url: string;
        sequencer: string;
        storageDiagnostics: { batchId: string; }
    }
    dataVersion: string;
    metadataVersion: string;
}

const EVENT_TYPE = 'Microsoft.Storage.BlobCreated';

const eventGridTrigger: AzureFunction = async function (context: Context, eventGridEvent: IEventGridEvent): Promise<void> {
    if (eventGridEvent && eventGridEvent.data && eventGridEvent.data.url) {
        const fileUrl = eventGridEvent.data.url;
        const eventType = eventGridEvent.eventType;
        const isCorrectDataType = ALLOWED_IMAGE_EXTENSIONS.some(extension => (fileUrl.endsWith(extension)));
        if (eventType === EVENT_TYPE && isCorrectDataType) {
            const [mapId, imageId] = fileUrl.split('/').slice(3);
            if (mapId && mapId.length === 36 && imageId && imageId.length === 36) {
                const pool = new Pool({
                    connectionString: process.env.PG_CONNECTION_STRING,
                });
                await pool.query('update public."Image" set "storeLocation" = $1 where "id" = $2', [fileUrl, imageId]);
                context.log(`Bound ${fileUrl} to ${imageId}`);
            }
        }
    }
};

export default eventGridTrigger;
