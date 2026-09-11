import {createClient as nodeClient} from 'redis';
export function createClient(options:Parameters<typeof nodeClient>[0]){const client=nodeClient(options);client.on('error',()=>{});return client}
