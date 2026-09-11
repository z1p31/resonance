import {serverDefaults} from '../../server-defaults';
import {database,settings} from '../admin/core';

import type {AuthConfig} from './auth-security';
export async function authConfig():Promise<AuthConfig>{const e={...serverDefaults,...process.env};let db;let saved;try{db=await database();saved=(await settings(db)).turnstile}finally{db?.destroy()}return {siteKey:(saved?.siteKey||e.TURNSTILE_SITE_KEY||process.env.TURNSTILE_SITE_KEY||'').trim(),secretKey:(saved?.secretKey||e.TURNSTILE_SECRET_KEY||process.env.TURNSTILE_SECRET_KEY||'').trim(),inviteCode:e.REGISTRATION_INVITE_CODE||process.env.REGISTRATION_INVITE_CODE||'czgm527'}}
