export const dynamic='force-dynamic';
import {authConfig} from '../account/auth-config';
export async function GET(){const c=await authConfig();return Response.json({siteKey:c.siteKey,configured:!!(c.siteKey&&c.secretKey)},{headers:{'Cache-Control':'no-store'}})}

