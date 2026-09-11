import {notFound} from 'next/navigation';
import {adminIdentity} from '../api/admin/core';
import {AdminPanel} from '../admin-panel';
export const dynamic='force-dynamic';
export default async function AdminPage({params}:{params:Promise<{adminPath:string}>}){const {adminPath}=await params;const admin=adminIdentity();if(!admin||admin.path!==adminPath)notFound();return <AdminPanel path={adminPath}/>}
