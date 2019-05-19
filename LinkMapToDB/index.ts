import { AzureFunction, Context } from "@azure/functions"
import {Pool} from 'pg';

const ALLOWED_FILE_EXTENSIONS = [
    '.bsp',
    '.BSP',
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
const pool = new Pool({
    connectionString: process.env.PG_ADMIN_STRING,
});

const eventGridTrigger: AzureFunction = async function (context: Context, eventGridEvent: IEventGridEvent): Promise<void> {
    if (eventGridEvent && eventGridEvent.data && eventGridEvent.data.url) {
        const fileUrl = eventGridEvent.data.url;
        const eventType = eventGridEvent.eventType;
        const isCorrectDataType = ALLOWED_FILE_EXTENSIONS.some(extension => (fileUrl.endsWith(extension)));
        if (eventType === EVENT_TYPE && isCorrectDataType) {
            const [mapId, fileId] = fileUrl.split('/').slice(3);
            if (mapId && mapId.length === 36 && fileId && fileId.length === 36) {
                await pool.query('update public."File" set "storeLocation" = $1 where "id" = $2', [fileUrl, fileId]);
                context.log(`Bound ${fileUrl} to ${fileId}`);
            }
        }
    }
};

export default eventGridTrigger;
